'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../../../../db/db');
const { resolveSchoolId } = require('../../services/schoolScope');
const { teacherIsAssigned } = require('./assessmentOpenController');
const marksheetSubmissions = require('../../services/marksheetSubmissionService');
const calculationAuthorizations = require('../../services/calculationAuthorizationService');
const scans = require('../../services/answerSheetScanService');
const { matchRosterLearner, prepareScan, confirmScan, scanBatch, rejectScan } = require('../../../../lib/answerSheetScan');
const { validateMark } = require('../../../../lib/assessmentAccess');

const SHEET_ROOT = path.resolve(process.cwd(), 'storage', 'answer-sheets');
const SHEET_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp']);

async function loadAssessment(id, schoolId) {
  const result = await db.query(
    `SELECT a.id, a.name, a.subject, a.grade, a.total_marks, a.school_id, a.academic_year, a.term,
            cl.name AS class_name
     FROM assessments a
     LEFT JOIN classes cl ON cl.id = a.class_id
     WHERE a.id = $1 AND a.school_id = $2
     LIMIT 1`,
    [id, schoolId]
  );
  return result.rows[0] || null;
}

async function loadRoster(assessmentId, schoolId) {
  const result = await db.query(
    `SELECT c.id AS child_id, c.learner_number, c.surname, c.full_name, c.grade, c.subjects
     FROM assessment_rosters r
     JOIN children c ON c.id = r.child_id
     WHERE r.assessment_id = $1 AND c.school_id = $2`,
    [assessmentId, schoolId]
  );
  return result.rows;
}

function termNumber(value) {
  return parseInt(String(value || '').replace(/[^0-9]/g, ''), 10) || 1;
}

function sheetFingerprint(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (!SHEET_EXTENSIONS.has(extension)) return null;
  return {
    hash: crypto.createHash('sha256').update(file.buffer).digest('hex'),
    extension
  };
}

function writeSheetFile(schoolId, assessmentId, fingerprint, buffer) {
  const directory = path.resolve(SHEET_ROOT, String(schoolId), String(assessmentId));
  if (!directory.startsWith(SHEET_ROOT + path.sep)) return null;
  fs.mkdirSync(directory, { recursive: true });
  const fullPath = path.resolve(directory, `${fingerprint.hash}${fingerprint.extension}`);
  if (!fullPath.startsWith(directory + path.sep)) return null;
  fs.writeFileSync(fullPath, buffer);
  return fullPath;
}

exports.registerAnswerSheet = async (req, res) => {
  try {
    if (req.user && req.user.is_superadmin) {
      return res.status(403).json({ error: 'The assigned subject teacher registers this answer sheet.' });
    }
    const schoolId = parseInt(resolveSchoolId(req), 10);
    if (!Number.isInteger(schoolId)) {
      return res.status(403).json({ error: 'This account is not linked to a school.' });
    }
    const assessmentId = parseInt(req.body.assessment_id, 10);
    const assessment = await loadAssessment(assessmentId, schoolId);
    if (!assessment) return res.status(404).json({ error: 'Open the assessment before registering an answer sheet.' });
    const allowed = await teacherIsAssigned(req.user && req.user.id, assessment.subject, assessment.grade, assessment.class_name || '');
    if (!allowed) return res.status(403).json({ error: 'You can register answer sheets only for a subject and class assigned to you.' });
    const locked = await marksheetSubmissions.findLocked({
      schoolId,
      academicYear: assessment.academic_year || new Date().getFullYear(),
      grade: assessment.grade,
      className: assessment.class_name || '',
      subject: assessment.subject,
      assessmentName: assessment.name,
      term: assessment.term
    });
    if (locked) {
      return res.status(409).json({ error: 'This marksheet has been submitted. Reopen it before registering another answer sheet.' });
    }
    const roster = await loadRoster(assessment.id, schoolId);
    const prior = await scans.existingForAssessment(assessment.id);
    const uploaded = req.file ? sheetFingerprint(req.file) : null;
    if (req.file && !uploaded) {
      return res.status(400).json({ error: 'Choose a PDF or image of the answer sheet.' });
    }
    const match = matchRosterLearner({
      learnerNumber: req.body.learner_number,
      surname: req.body.surname,
      roster
    });
    const prepared = prepareScan({
      match,
      statedMark: req.body.stated_mark,
      maximum: assessment.total_marks,
      documentHash: uploaded ? uploaded.hash : req.body.document_hash,
      existingHashes: prior.map((row) => row.document_hash),
      confirmedChildIds: prior.filter((row) => row.status === 'confirmed').map((row) => row.child_id)
    });
    if (!prepared.ok) return res.status(409).json({ error: prepared.error, status: prepared.status });
    const storedPath = uploaded ? writeSheetFile(schoolId, assessment.id, uploaded, req.file.buffer) : null;
    let saved;
    try {
      saved = await scans.insertScan({
        schoolId,
        assessmentId: assessment.id,
        childId: prepared.child_id,
        learnerNumber: String(req.body.learner_number || '').trim() || null,
        documentHash: uploaded ? uploaded.hash : String(req.body.document_hash).trim().toLowerCase(),
        filename: String((req.file && req.file.originalname) || req.body.filename || '').slice(0, 180),
        statedMark: prepared.stated_mark,
        maximum: assessment.total_marks,
        confidence: prepared.confidence,
        status: prepared.status,
        reason: prepared.reason,
        storedPath,
        createdBy: req.user.id
      });
    } catch (insertError) {
      if (storedPath) fs.unlink(storedPath, () => {});
      throw insertError;
    }
    res.status(201).json({
      scan: saved,
      automatic_reading: false,
      message: prepared.status === 'awaiting_verification'
        ? 'The answer sheet is registered. The mark stays unofficial until you confirm it.'
        : prepared.reason
    });
  } catch (error) {
    console.error('Answer sheet registration failed:', error);
    res.status(500).json({ error: 'The answer sheet could not be registered.' });
  }
};

async function commitConfirmed({ user, schoolId, scan, correctedMark }) {
  const decision = confirmScan({
    status: scan.status,
    childId: scan.child_id,
    statedMark: scan.stated_mark,
    maximum: scan.maximum,
    correctedMark
  });
  if (!decision.ok) return { statusCode: 409, body: { error: decision.error } };
  const checked = validateMark(decision.score, scan.maximum);
  if (!checked.ok) return { statusCode: 400, body: { error: checked.reason } };
  const assessment = await loadAssessment(scan.assessment_id, schoolId);
  if (!assessment) return { statusCode: 404, body: { error: 'The assessment for this answer sheet is no longer available.' } };
  const roster = await loadRoster(assessment.id, schoolId);
  if (!roster.some((row) => Number(row.child_id) === decision.child_id)) {
    return { statusCode: 409, body: { error: 'The learner is not on this assessment roster.' } };
  }
  const locked = await marksheetSubmissions.findLocked({
    schoolId,
    academicYear: assessment.academic_year || new Date().getFullYear(),
    grade: assessment.grade,
    className: assessment.class_name || '',
    subject: assessment.subject,
    assessmentName: assessment.name,
    term: assessment.term
  });
  if (locked) {
    return { statusCode: 409, body: { error: 'This marksheet has been submitted. Reopen it before confirming an answer sheet.' } };
  }
  const existing = await db.query(
    `SELECT id FROM marks
     WHERE child_id = $1 AND school_id = $2 AND LOWER(assessment_name) = LOWER($3)
       AND (LOWER(subject) = LOWER($4) OR LOWER(subject_name) = LOWER($4))
     LIMIT 1`,
    [decision.child_id, schoolId, assessment.name, assessment.subject]
  );
  if (existing.rows[0]) {
    return { statusCode: 409, body: { error: 'This learner already has a mark for the assessment. Correct it on the marksheet instead of replacing it from the scan.' } };
  }
  const learner = roster.find((row) => Number(row.child_id) === decision.child_id);
  const percentage = Math.round((checked.score / Number(scan.maximum)) * 100);
  const termNum = termNumber(assessment.term);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO marks
        (learner_id, child_id, subject, subject_name, term, mark_type, score, max_score, percentage,
         grade, is_published, published_to_admin, status, assessment_name, is_formal, assessment_type,
         recorded_by, school_id, academic_year, recorded_at, updated_at)
       VALUES ($1, $1, $2, $2, $3, $4, $5, $6, $7, $8, FALSE, FALSE, 'draft', $9, FALSE, $4, $10, $11, $12, NOW(), NOW())`,
      [
        decision.child_id, assessment.subject, termNum, assessment.subject, checked.score, scan.maximum,
        percentage, learner.grade, assessment.name, user.id, schoolId,
        Number(assessment.academic_year) || new Date().getFullYear()
      ]
    );
    const confirmed = await client.query(
      `UPDATE answer_sheet_scans
       SET status = 'confirmed', confirmed_mark = $2, confirmed_by = $3, confirmed_at = NOW()
       WHERE id = $1 AND status = 'awaiting_verification'
       RETURNING id`,
      [scan.id, checked.score, user.id]
    );
    if (!confirmed.rows[0]) {
      await client.query('ROLLBACK');
      return { statusCode: 409, body: { error: 'This answer sheet is already confirmed.' } };
    }
    await client.query('COMMIT');
  } catch (writeError) {
    await client.query('ROLLBACK');
    throw writeError;
  } finally {
    client.release();
  }
  calculationAuthorizations.invalidate({
    schoolId,
    grade: assessment.grade,
    className: assessment.class_name || '',
    subject: assessment.subject,
    termNumber: termNum
  }).catch((invalidateError) => console.warn('Calculation invalidation skipped:', invalidateError.message));
  return { statusCode: 200, body: { success: true, score: checked.score, status: 'confirmed' }, assessment };
}

exports.confirmAnswerSheet = async (req, res) => {
  try {
    if (req.user && req.user.is_superadmin) {
      return res.status(403).json({ error: 'The assigned subject teacher confirms this answer sheet.' });
    }
    const schoolId = parseInt(resolveSchoolId(req), 10);
    if (!Number.isInteger(schoolId)) {
      return res.status(403).json({ error: 'This account is not linked to a school.' });
    }
    const scan = await scans.getScan(parseInt(req.params.id, 10), schoolId);
    if (!scan) return res.status(404).json({ error: 'The answer sheet was not found.' });
    const result = await commitConfirmed({
      user: req.user,
      schoolId,
      scan,
      correctedMark: req.body.corrected_mark
    });
    res.status(result.statusCode).json(result.body);
  } catch (error) {
    console.error('Answer sheet confirmation failed:', error);
    res.status(500).json({ error: 'The answer sheet could not be confirmed.' });
  }
};

exports.confirmAnswerSheetBatch = async (req, res) => {
  try {
    if (req.user && req.user.is_superadmin) {
      return res.status(403).json({ error: 'The assigned subject teacher confirms this answer sheet.' });
    }
    const schoolId = parseInt(resolveSchoolId(req), 10);
    const assessmentId = parseInt(req.body.assessment_id, 10);
    if (!Number.isInteger(schoolId) || !Number.isInteger(assessmentId)) {
      return res.status(400).json({ error: 'Choose an opened assessment.' });
    }
    const assessment = await loadAssessment(assessmentId, schoolId);
    if (!assessment) return res.status(404).json({ error: 'The assessment was not found.' });
    const allowed = await teacherIsAssigned(req.user && req.user.id, assessment.subject, assessment.grade, assessment.class_name || '');
    if (!allowed) return res.status(403).json({ error: 'You can confirm answer sheets only for a subject and class assigned to you.' });
    const rows = await scans.listForAssessment(assessmentId, schoolId);
    const roster = await loadRoster(assessmentId, schoolId);
    const batch = scanBatch({ roster, scans: rows });
    const confirmed = [];
    const skipped = [];
    for (const id of batch.confirmable) {
      const scan = await scans.getScan(id, schoolId);
      const result = await commitConfirmed({ user: req.user, schoolId, scan });
      if (result.statusCode === 200) confirmed.push(id);
      else skipped.push({ id, error: result.body.error });
    }
    res.json({ confirmed, skipped, complete: false, automatic_reading: false });
  } catch (error) {
    console.error('Answer sheet batch confirmation failed:', error);
    res.status(500).json({ error: 'The verified answer sheets could not be confirmed.' });
  }
};

exports.rejectAnswerSheet = async (req, res) => {
  try {
    if (req.user && req.user.is_superadmin) {
      return res.status(403).json({ error: 'The assigned subject teacher rejects this answer sheet.' });
    }
    const schoolId = parseInt(resolveSchoolId(req), 10);
    const scan = await scans.getScan(parseInt(req.params.id, 10), schoolId);
    if (!scan) return res.status(404).json({ error: 'The answer sheet was not found.' });
    const decision = rejectScan(scan.status);
    if (!decision.ok) return res.status(409).json({ error: decision.error });
    const assessment = await loadAssessment(scan.assessment_id, schoolId);
    const allowed = assessment && await teacherIsAssigned(req.user && req.user.id, assessment.subject, assessment.grade, assessment.class_name || '');
    if (!allowed) return res.status(403).json({ error: 'You can reject answer sheets only for a subject and class assigned to you.' });
    const updated = await scans.markRejected(scan.id);
    if (!updated) return res.status(409).json({ error: 'This answer sheet can no longer be rejected.' });
    res.json({ success: true, status: 'rejected' });
  } catch (error) {
    console.error('Answer sheet rejection failed:', error);
    res.status(500).json({ error: 'The answer sheet could not be rejected.' });
  }
};

exports.openAnswerSheetFile = async (req, res) => {
  try {
    if (req.user && req.user.is_superadmin) {
      return res.status(403).json({ error: 'The assigned subject teacher opens this answer sheet.' });
    }
    const schoolId = parseInt(resolveSchoolId(req), 10);
    const scan = await scans.getScan(parseInt(req.params.id, 10), schoolId);
    if (!scan || !scan.stored_path) return res.status(404).json({ error: 'The answer sheet file was not found.' });
    const assessment = await loadAssessment(scan.assessment_id, schoolId);
    const role = String(req.user && req.user.role || '').toLowerCase();
    const allowed = role === 'admin' || (assessment && await teacherIsAssigned(req.user && req.user.id, assessment.subject, assessment.grade, assessment.class_name || ''));
    if (!allowed) return res.status(403).json({ error: 'You can open answer sheets only for a subject and class assigned to you.' });
    const target = path.resolve(scan.stored_path);
    if (!target.startsWith(SHEET_ROOT + path.sep) || !fs.existsSync(target)) {
      return res.status(404).json({ error: 'The answer sheet file was not found.' });
    }
    res.setHeader('Content-Disposition', `inline; filename="answer-sheet${path.extname(target)}"`);
    res.sendFile(target);
  } catch (error) {
    console.error('Answer sheet file failed:', error);
    res.status(500).json({ error: 'The answer sheet could not be opened.' });
  }
};

exports.listAnswerSheets = async (req, res) => {
  try {
    const schoolId = parseInt(resolveSchoolId(req), 10);
    const assessmentId = parseInt(req.query.assessment_id, 10);
    if (!Number.isInteger(schoolId) || !Number.isInteger(assessmentId)) {
      return res.status(400).json({ error: 'Choose an opened assessment.' });
    }
    const assessment = await loadAssessment(assessmentId, schoolId);
    if (!assessment) return res.status(404).json({ error: 'The assessment was not found.' });
    const rows = await scans.listForAssessment(assessmentId, schoolId);
    const roster = await loadRoster(assessmentId, schoolId);
    const batch = scanBatch({ roster, scans: rows });
    res.json({ scans: rows, missing: batch.missing, multiple: batch.multiple, complete: batch.complete, automatic_reading: false });
  } catch (error) {
    console.error('Answer sheet list failed:', error);
    res.status(500).json({ error: 'The answer sheets could not be listed.' });
  }
};
