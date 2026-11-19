const db = require('../../../db/db');
const { resolveSchoolId } = require('../services/schoolScope');
const emailService = require('../services/emailService');
const { assertChildAccess } = require('../services/familyAccess');
const aiAdvisorService = require('../services/aiAdvisorService');
const reportCardPdfService = require('../services/reportCardPdfService');
const { submissionStatus } = require('../../../lib/marksheetSubmission');
const marksheetSubmissions = require('../services/marksheetSubmissionService');
const { loadReportReadiness } = require('./academicReadinessController');
const reportVerifications = require('../services/reportVerificationService');
const { teacherMayViewClassReport } = require('../../../lib/reportVerification');
const { loadActor } = require('../services/familyAccess');
const { parentCardView, paymentEntitlement } = require('../../../lib/reportRelease');
const reportReleases = require('../services/reportReleaseService');
const { termIndex, markPercentage, markBelongsToYear } = require('../../../lib/reportTerm');
const { percentageFromMark } = require('../../../lib/academicEvidence');
const { subjectEntries, recordedAverage, reportIsComplete, reportPeriod, reportLearnerRows, termResultLabel } = require('../../../lib/reportRecord');
const { keepPreviousReport } = require('../services/reportVersionService');

/**
 * Maps percentage mark to South African CAPS official 7-Point Achievement Rating Level
 * Level 7: Outstanding (80 - 100%)
 * Level 6: Meritorious (70 - 79%)
 * Level 5: Substantial (60 - 69%)
 * Level 4: Adequate (50 - 59%)
 * Level 3: Moderate (40 - 49%)
 * Level 2: Elementary (30 - 39%)
 * Level 1: Not Achieved (0 - 29%)
 */
const getCapsLevel = (percentage) => {
  if (percentage === null || percentage === undefined || percentage === '') {
    return { level: '-', rating: 'Pending', descriptor: 'Pending', badge: 'amber' };
  }
  const numeric = Number(percentage);
  if (!Number.isFinite(numeric)) {
    return { level: '-', rating: 'Pending', descriptor: 'Pending', badge: 'amber' };
  }
  const p = Math.round(numeric);
  if (p >= 80) return { level: 7, rating: 'Outstanding Achievement', descriptor: '7: Outstanding (80 - 100%)', badge: 'gold' };
  if (p >= 70) return { level: 6, rating: 'Meritorious Achievement', descriptor: '6: Meritorious (70 - 79%)', badge: 'cyan' };
  if (p >= 60) return { level: 5, rating: 'Substantial Achievement', descriptor: '5: Substantial (60 - 69%)', badge: 'blue' };
  if (p >= 50) return { level: 4, rating: 'Adequate Achievement', descriptor: '4: Adequate (50 - 59%)', badge: 'green' };
  if (p >= 40) return { level: 3, rating: 'Moderate Achievement', descriptor: '3: Moderate (40 - 49%)', badge: 'amber' };
  if (p >= 30) return { level: 2, rating: 'Elementary Achievement', descriptor: '2: Elementary (30 - 39%)', badge: 'orange' };
  return { level: 1, rating: 'Not Achieved', descriptor: '1: Not Achieved (0 - 29%)', badge: 'red' };
};

/**
 * Evaluates South African Department of Basic Education (DBE) National Promotion Requirements
 */
const calculateSouthAfricanPromotion = (subjects, overallAverage) => {
  if (!subjects || subjects.length === 0) {
    return overallAverage >= 50 ? 'PROMOTED TO NEXT GRADE' : 'PENDING REMEDIATION';
  }

  // Count subjects meeting CAPS thresholds
  let passedCount = 0;
  let hasHomeLanguagePass = false;
  let passedAbove50Count = 0;

  for (const s of subjects) {
    if (s.mark === null || s.mark === undefined || s.mark === '') continue;
    const mark = Number(s.mark);
    if (!Number.isFinite(mark)) continue;
    const name = (s.subject || s.name || '').toLowerCase();

    if (name.includes('home language') || name.includes('english hl') || name.includes('sepedi') || name.includes('isizulu')) {
      if (mark >= 40) hasHomeLanguagePass = true;
    }

    if (mark >= 40) passedCount++;
    if (mark >= 50) passedAbove50Count++;
  }

  // Senior / FET Phase CAPS criteria
  if (overallAverage >= 65 && passedAbove50Count >= 4) {
    return 'PROMOTED';
  } else if (overallAverage >= 50 && passedAbove50Count >= 3) {
    return 'PROMOTED';
  } else if (overallAverage >= 40 && passedCount >= 4) {
    return 'PROMOTED';
  } else if (overallAverage >= 50) {
    return 'PROMOTED';
  } else if (overallAverage >= 40) { 
    return 'PROGRESSION';
  } else {
    return 'NOT PROMOTED';
  }
};

exports.calculateSouthAfricanPromotion = calculateSouthAfricanPromotion;
exports.getCapsLevel = getCapsLevel;

let learnerIdentityColumns = null;

/**
 * Admission number is the learner number unless this database already has a
 * separate children.admission_number column. Identity and date of birth come
 * from the learner's user account when children does not store them.
 */
async function learnerIdentitySelect() {
  if (!learnerIdentityColumns) {
    const found = await db.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'children'
         AND column_name IN ('admission_number', 'id_number', 'dob')`
    );
    const names = new Set(found.rows.map((row) => row.column_name));
    learnerIdentityColumns = {
      admission: names.has('admission_number')
        ? "COALESCE(NULLIF(c.admission_number, ''), c.learner_number) AS admission_number"
        : 'c.learner_number AS admission_number',
      idNumber: names.has('id_number')
        ? 'COALESCE(NULLIF(c.id_number, \'\'), u.id_number) AS id_number'
        : 'u.id_number',
      dob: names.has('dob') ? 'COALESCE(c.dob, u.dob) AS dob' : 'u.dob'
    };
  }
  return learnerIdentityColumns;
}

/**
 * Compiles and fetches the Report Card Template Data for a specific Grade, Class, and Stream.
 * Aggregates all teacher-uploaded assessment marks and calculates the percentage each assessment holds.
 */
exports.getGradeTemplateMarks = async (req, res) => {
  try {
    const period = reportPeriod(req.query);
    const grade = period.grade;
    let stream = String(req.query.stream || '').trim();
    if (stream.toLowerCase().includes('science')) stream = 'Science';
    else if (stream.toLowerCase().includes('commerce')) stream = 'Commerce';
    else if (stream.toLowerCase().includes('tourism')) stream = 'Tourism';
    else if (stream.toLowerCase().includes('general')) stream = 'General';

    const className = (req.query.class_name || req.query.class || req.query.className || '').trim();
    const termNum = period.term;
    const academicYear = period.academicYear;
    if (!grade || !termNum || !academicYear) {
      return res.status(400).json({ success: false, error: 'Choose a grade, a term, and an academic year.' });
    }
    const rawSchoolId = resolveSchoolId(req);
    const schoolId = parseInt(rawSchoolId, 10);
    if (!Number.isInteger(schoolId)) {
      return res.status(403).json({ error: 'This account is not linked to a school.' });
    }

    // 1. Fetch School Information strictly for the authenticated school
    let schoolInfo = {
      id: schoolId,
      name: 'Registered School',
      emis_number: '',
      circuit: '',
      district: '',
      province: '',
      physical_address: '',
      postal_address: '',
      contact_email: '',
      contact_phone: '',
      principal_name: 'Principal',
      logo_url: null,
      badge_url: null,
      report_settings: {}
    };
    try {
      const schoolRes = await db.query(
        `SELECT id, name, emis_number, circuit, district, province, physical_address,
                postal_address, contact_email, contact_phone, principal_name, logo_url,
                badge_url, motto, report_settings
         FROM schools WHERE id = $1 LIMIT 1`,
        [schoolId]
      );
      if (schoolRes.rows[0]) {
        schoolInfo = { ...schoolInfo, ...schoolRes.rows[0] };
      }
    } catch (_) {}

    // Subjects on a class report are the subjects stored for learners in that class.
    let schoolSubjects = [];

    // 3. Fetch all enrolled learners strictly for this School, Grade, Class, and Stream
    const params = [schoolId, grade];
    let classClause = '';
    if (className && className !== 'All') {
      params.push(className);
      classClause = `AND (cl.name = $${params.length} OR c.class_id::text = $${params.length})`;
    }

    let streamClause = '';
    if (stream && stream !== 'All') {
      params.push(stream);
      streamClause = `AND c.stream = $${params.length}`;
    }

    const identity = await learnerIdentitySelect();
    const learnersQuery = `
      SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, c.subjects,
             ${identity.admission}, ${identity.idNumber}, ${identity.dob},
             cl.name as class_name,
             p.email as parent_email, CONCAT(p.full_name, ' ', p.surname) as parent_name, p.phone as parent_phone
      FROM children c
      LEFT JOIN classes cl ON c.class_id = cl.id
      LEFT JOIN users u ON c.learner_user_id = u.id
      LEFT JOIN parent_children pc ON c.id = pc.child_id
      LEFT JOIN users p ON pc.parent_id = p.id OR c.parent_id = p.id
      WHERE c.school_id = $1 AND c.grade = $2
      ${classClause}
      ${streamClause}
      ORDER BY c.surname ASC, c.full_name ASC;
    `;

    let { rows: learners } = await db.query(learnersQuery, params);
    const enrolledNames = new Set();
    learners.forEach((learner) => {
      if (Array.isArray(learner.subjects)) {
        learner.subjects.forEach((name) => {
          if (name) enrolledNames.add(String(name));
        });
      }
    });
    schoolSubjects = Array.from(enrolledNames).sort((a, b) => a.localeCompare(b));

    // 4. Fetch already saved report_cards records strictly for this school
    let existingCardsMap = new Map();
    try {
      const existingCardsRes = await db.query(
        `SELECT * FROM report_cards
         WHERE school_id = $1 AND grade = $2 AND term = $3 AND academic_year = $4`,
        [schoolId, grade, termNum, academicYear]
      );
      existingCardsRes.rows.forEach(rc => {
        existingCardsMap.set(rc.child_id, rc);
      });
    } catch (_) {}

    // 5. For each learner, fetch real marks and attendance
    const compiledLearners = [];

    for (const l of learners) {
      const existingCard = existingCardsMap.get(l.id);

      // Determine subjects for this learner
      let studentSubjects = Array.isArray(l.subjects) ? [...l.subjects] : [];

      // Fetch attendance register records for this student
      const attRes = await db.query(
        `SELECT
           COUNT(*) as total_days,
           COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as days_present,
           COUNT(CASE WHEN status = 'absent' THEN 1 END) as days_absent
         FROM attendance
         WHERE child_id = $1`,
        [l.id]
      );
      const totalDays = parseInt(attRes.rows[0]?.total_days || '0', 10);
      const daysPresent = parseInt(attRes.rows[0]?.days_present || '0', 10);
      const daysAbsent = parseInt(attRes.rows[0]?.days_absent || (totalDays > 0 ? totalDays - daysPresent : '0'), 10);
      const attRate = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : null;

      // Fetch ONLY recorded formal assessment marks (Strictly exclude informal quizzes / drills)
      let marksRes;
      try {
        marksRes = await db.query(
          `SELECT subject, assessment_name, score, max_score, percentage, weight, is_formal, assessment_type, recorded_at
           FROM marks
           WHERE (child_id = $1 OR learner_id = $1)
             AND (term::text = $2::text OR term::text LIKE ($2::text || '20%'))
             AND (is_formal = TRUE OR is_formal IS NULL)
           ORDER BY recorded_at ASC`,
          [l.id, termNum]
        );
      } catch (errMarks) {
        marksRes = await db.query(
          `SELECT subject, assessment_name, score, max_score, percentage, weight, recorded_at
           FROM marks
           WHERE (child_id = $1 OR learner_id = $1)
             AND (term::text = $2::text OR term::text LIKE ($2::text || '20%'))
           ORDER BY recorded_at ASC`,
          [l.id, termNum]
        ).catch(() => ({ rows: [] }));
      }

      // Calculate marks & assessment percentage weighting for each subject
      const subjectOutcomes = [];

      for (const subj of studentSubjects) {
        const matchingMarks = marksRes.rows.filter(m => (m.subject || '').toLowerCase() === subj.toLowerCase());

        let assessments = [];
        let finalSubjectPct = null;
        let sbaMark = null;
        let examMark = null;
        let rawScoreSum = 0;
        let maxScoreSum = 0;

        if (matchingMarks.length > 0) {
          // Dynamic calculation: weight contributions are strictly based on what formal assessments exist
          let totalWeight = 0;
          let weightedSum = 0;
          let sbaWeightSum = 0;
          let sbaTotalWeight = 0;
          let examWeightSum = 0;
          let examTotalWeight = 0;

          assessments = matchingMarks.flatMap(m => {
            const pct = percentageFromMark(m);
            if (pct === null) return [];
            const rawScore = Number(m.score);
            const maxScore = Number(m.max_score);
            const w = Number(m.weight) || maxScore || 100;
            const aType = (m.assessment_type || m.assessment_name || '').toLowerCase();
            const isExam = aType.includes('exam') || aType.includes('examination');

            totalWeight += w;
            weightedSum += pct * w;
            if (Number.isFinite(rawScore)) rawScoreSum += rawScore;
            if (Number.isFinite(maxScore) && maxScore > 0) maxScoreSum += maxScore;

            if (isExam) {
              examWeightSum += pct * w;
              examTotalWeight += w;
            } else {
              sbaWeightSum += pct * w;
              sbaTotalWeight += w;
            }

            return {
              name: m.assessment_name || 'Class Assessment',
              type: m.assessment_type || (isExam ? 'Examination' : 'Formal Assessment'),
              score: rawScore,
              max_score: maxScore,
              weight: w,
              percentage: pct
            };
          });

          sbaMark = sbaTotalWeight > 0 ? Math.round(sbaWeightSum / sbaTotalWeight) : null;
          examMark = examTotalWeight > 0 ? Math.round(examWeightSum / examTotalWeight) : null;

          if (sbaMark !== null && examMark !== null) {
            finalSubjectPct = Math.round((sbaMark * 0.4) + (examMark * 0.6));
          } else if (sbaMark !== null) {
            finalSubjectPct = sbaMark;
          } else if (examMark !== null) {
            finalSubjectPct = examMark;
            } else {
            finalSubjectPct = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
          }
        } else if (existingCard && Array.isArray(existingCard.marks_breakdown)) {
          // Fallback to previously saved card breakdown if admin already verified & saved
          const prev = existingCard.marks_breakdown.find(b => (b.subject || '').toLowerCase() === subj.toLowerCase());
          if (prev && prev.mark !== null && prev.mark !== undefined && !prev.is_pending) {
            finalSubjectPct = Number(prev.mark);
            rawScoreSum = prev.raw_score || finalSubjectPct;
            maxScoreSum = prev.max_score || 100;
            sbaMark = prev.sba_mark ?? finalSubjectPct;
            examMark = prev.exam_mark ?? null;
            assessments = prev.assessments || [{ name: 'Transferred Formal Mark', score: finalSubjectPct, max_score: 100, weight: 100, percentage: finalSubjectPct }];
          } else {
            finalSubjectPct = null;
            assessments = [];
          }
        } else {
          // Strictly remains clean/empty with NO fake placeholder or quiz marks!
          finalSubjectPct = null;
          assessments = [];
        }

        const markDisplay = maxScoreSum > 0 ? `${rawScoreSum} / ${maxScoreSum}` : (finalSubjectPct !== null ? `${finalSubjectPct}%` : '-');

        if (finalSubjectPct !== null && !isNaN(finalSubjectPct)) {
          finalSubjectPct = Math.min(100, Math.max(0, finalSubjectPct));
          const caps = getCapsLevel(finalSubjectPct);

          const totalAssessmentsWeight = assessments.reduce((acc, a) => acc + (a.weight || 100), 0) || 100;
          assessments = assessments.map(a => ({
            ...a,
            holding_pct: Math.round(((a.weight || 100) / totalAssessmentsWeight) * 100)
          }));

          subjectOutcomes.push({
            subject: subj,
            code: subj.substring(0, 4).toUpperCase(),
            mark_display: markDisplay,
            raw_score: rawScoreSum,
            max_score: maxScoreSum,
            mark: finalSubjectPct,
            percentage: finalSubjectPct,
            sba_mark: sbaMark,
            exam_mark: examMark,
            level: caps.level,
            rating: caps.rating,
            descriptor: caps.descriptor,
            badge: caps.badge,
            is_pending: false,
            assessments_count: assessments.length,
            assessments: assessments
          });
        } else {
          // Clean empty subject slot on standby
          subjectOutcomes.push({
            subject: subj,
            code: subj.substring(0, 4).toUpperCase(),
            mark_display: '-',
            raw_score: null,
            max_score: null,
            mark: null,
            percentage: null,
            sba_mark: null,
            exam_mark: null,
            level: '-',
            rating: 'Pending Upload',
            descriptor: 'Teacher Marks Not Uploaded',
            badge: 'amber',
            is_pending: true,
            assessments_count: 0,
            assessments: []
          });
        }
      }

      // Compute total, average, and promotion status only from subjects with uploaded formal marks
      const gradedSubjects = subjectOutcomes.filter(s => s.mark !== null && !s.is_pending);
      const hasMarks = gradedSubjects.length > 0;
      const totalMarksSum = gradedSubjects.reduce((sum, s) => sum + s.mark, 0);
      const overallAvg = hasMarks ? Math.round(totalMarksSum / gradedSubjects.length) : null;
      const overallCaps = hasMarks ? getCapsLevel(overallAvg) : { level: '-', rating: 'Pending', descriptor: 'Pending Teacher Upload', badge: 'amber' };
      const promotionDecision = hasMarks ? calculateSouthAfricanPromotion(gradedSubjects, overallAvg) : 'PENDING TEACHER MARKS';

      const rawFirst = (l.full_name || '').trim();
      const rawSur = (l.surname || '').trim();
      const cleanLearnerName = rawFirst.toLowerCase().endsWith(rawSur.toLowerCase())
        ? rawFirst
        : `${rawFirst} ${rawSur}`.trim();

      compiledLearners.push({
        child_id: l.id,
        learner_name: rawFirst,
        learner_surname: rawSur,
        full_name: cleanLearnerName,
        learner_number: l.learner_number || '',
        admission_number: l.admission_number || l.learner_number || '',
        grade: l.grade,
        class_name: l.class_name,
        stream: l.stream || stream,
        parent_name: l.parent_name || 'Guardian',
        parent_email: l.parent_email || null,
        parent_phone: l.parent_phone || null,
        attendance: {
          days_present: daysPresent,
          days_absent: daysAbsent,
          total_days: totalDays,
          percentage: attRate
        },
        attendance_percentage: attRate,
        subjects: subjectOutcomes,
        subjects_breakdown: subjectOutcomes,
        total_marks: totalMarksSum,
        overall_average: existingCard ? Number(existingCard.overall_average) : overallAvg,
        overall_level: existingCard ? existingCard.overall_level : overallCaps.level,
        overall_rating: existingCard ? getCapsLevel(existingCard.overall_average).rating : overallCaps.rating,
        promotion_status: existingCard?.promotion_status || promotionDecision,
        teacher_comment: existingCard?.teacher_comment || '',
        principal_comment: existingCard?.principal_comment || '',
        principal_signature: existingCard?.principal_signature || '',
        ai_advisory: existingCard?.ai_advisory || null,
        is_published: existingCard ? !!existingCard.is_published : false,
        status: existingCard?.status || (existingCard?.is_published ? 'published' : (existingCard ? 'generated' : 'draft')),
        has_missing_marks: (subjectOutcomes || []).some(s => s.mark === null || s.is_pending),
        missing_marks_count: (subjectOutcomes || []).filter(s => s.mark === null || s.is_pending).length,
        missing_subjects: (subjectOutcomes || []).filter(s => s.mark === null || s.is_pending).map(s => s.subject)
      });
    }

    // Calculate real dynamic class averages and pass rates per subject
    const subjectStatsMap = {};
    schoolSubjects.forEach(sName => {
      const marksForSubj = [];
      compiledLearners.forEach(learner => {
        const subOutcome = (learner.subjects || []).find(s => (s.subject || '').toLowerCase() === sName.toLowerCase());
        if (subOutcome && subOutcome.mark !== null && !subOutcome.is_pending) {
          marksForSubj.push(Number(subOutcome.mark));
        }
      });
      const count = marksForSubj.length;
      const avg = count > 0 ? Math.round(marksForSubj.reduce((a, b) => a + b, 0) / count) : null;
      const passCount = marksForSubj.filter(m => m >= 50).length;
      const passRate = count > 0 ? Math.round((passCount / count) * 100) : null;
      subjectStatsMap[sName.toLowerCase()] = { average: avg, pass_rate: passRate, recorded_count: count };
    });

    compiledLearners.forEach(learner => {
      (learner.subjects || []).forEach(s => {
        const stats = subjectStatsMap[(s.subject || '').toLowerCase()];
        s.average = stats?.average ?? null;
      });
    });

    res.json({
      success: true,
      school: schoolInfo,
      grade,
      stream,
      class_name: className || 'All',
      term: termNum,
      academic_year: academicYear,
      subjects: schoolSubjects,
      schoolSubjects: schoolSubjects,
      total_learners: compiledLearners.length,
      learners: compiledLearners
    });

  } catch (err) {
    console.error('Error fetching grade template marks:', err);
    res.status(500).json({ success: false, error: 'Failed to prepare grade template marks: ' + err.message });
  }
};

/**
 * Saves and Compiles the reviewed/edited Grade Report Cards into the database.
 */
exports.saveGradeReportCardTemplate = async (req, res) => {
  try {
    const period = reportPeriod(req.body);
    const learnerRows = reportLearnerRows(req.body);
    const targetSchoolId = resolveSchoolId(req);
    const tNum = period.term;
    const yr = period.academicYear;
    const grade = period.grade;

    if (!tNum || !yr) {
      return res.status(400).json({ success: false, error: 'Choose a term and an academic year before saving the reports.' });
    }
    if (!Array.isArray(learnerRows) || learnerRows.length === 0) {
      return res.status(400).json({ success: false, error: 'No learner report records provided.' });
    }

    let savedCount = 0;
    let incompleteCount = 0;

    for (const item of learnerRows) {
      const childId = parseInt(item.child_id, 10);
      if (!childId) continue;

      const subjects = subjectEntries(item.subjects).map((entry) => {
        const caps = getCapsLevel(entry.mark);
        return {
          subject: entry.subject,
          mark: entry.mark,
          level: caps.level,
          rating: caps.rating,
          descriptor: caps.descriptor,
          assessments: entry.assessments
        };
      });

      const avg = recordedAverage(subjects);
      const caps = getCapsLevel(avg);
      const complete = reportIsComplete(subjects);
      if (!complete) incompleteCount += 1;
      const promotionDecision = complete
        ? (item.promotion_status || calculateSouthAfricanPromotion(subjects, avg))
        : null;

      const daysPresent = parseInt(item.attendance?.days_present ?? item.days_present ?? 0, 10);
      const daysAbsent = parseInt(item.attendance?.days_absent ?? item.days_absent ?? 0, 10);
      const totalDays = parseInt(item.attendance?.total_days ?? item.total_days ?? (daysPresent + daysAbsent), 10);
      const attRate = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : null;

      // Compute or preserve AI Advisory (Option A)
      let aiAdvisory = item.ai_advisory || null;
      if (!aiAdvisory && subjects.length > 0) {
        const { observedMarkSummary } = require('../../../lib/academicEvidence');
        aiAdvisory = observedMarkSummary(subjects.map((entry) => ({
          subject: entry.subject,
          score: entry.mark
        })));
      }

      // Check if existing
      const existRes = await db.query(
        `SELECT id, is_published FROM report_cards
         WHERE school_id = $1 AND child_id = $2 AND term = $3 AND academic_year = $4
         LIMIT 1`,
        [targetSchoolId, childId, tNum, yr]
      );

      if (existRes.rows.length > 0) {
        await keepPreviousReport(db, {
          childId, term: tNum, academicYear: yr, reason: 'Report saved again', userId: req.user && req.user.id
        });
        await db.query(
          `UPDATE report_cards
           SET marks_breakdown = $1,
               overall_average = $2,
               overall_level = $3,
               promotion_status = $4,
               class_name = $5,
               stream = $6,
               days_present = $7,
               days_absent = $8,
               total_days = $9,
               attendance_percentage = $10,
               teacher_comment = $11,
               principal_comment = $12,
               principal_signature = $13,
               ai_advisory = $14,
               updated_at = NOW()
           WHERE id = $15`,
          [
            JSON.stringify(subjects),
            avg,
            caps.level,
            promotionDecision,
            item.class_name || null,
            item.stream || null,
            daysPresent,
            daysAbsent,
            totalDays,
            attRate,
            item.teacher_comment || null,
            item.principal_comment || null,
            item.principal_signature || null,
            aiAdvisory ? JSON.stringify(aiAdvisory) : null,
            existRes.rows[0].id
          ]
        );
      } else {
        await db.query(
          `INSERT INTO report_cards (
             school_id, child_id, grade, class_name, stream, term, academic_year,
             marks_breakdown, overall_average, overall_level, promotion_status,
             days_present, days_absent, total_days, attendance_percentage,
             teacher_comment, principal_comment, principal_signature,
             ai_advisory, is_published, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, FALSE, NOW(), NOW())`,
          [
            targetSchoolId,
            childId,
            grade || item.grade || null,
            item.class_name || null,
            item.stream || null,
            tNum,
            yr,
            JSON.stringify(subjects),
            avg,
            caps.level,
            promotionDecision,
            daysPresent,
            daysAbsent,
            totalDays,
            attRate,
            item.teacher_comment || null,
            item.principal_comment || null,
            item.principal_signature || null,
            aiAdvisory ? JSON.stringify(aiAdvisory) : null
          ]
        );
      }
      savedCount++;
    }

    res.json({
      success: true,
      message: incompleteCount > 0
        ? `Saved ${savedCount} report card(s). ${incompleteCount} still have a blank subject, so no promotion was stored for those.`
        : `Saved ${savedCount} report card(s).`,
      compiled_count: savedCount,
      incomplete_count: incompleteCount
    });

  } catch (err) {
    console.error('Error saving grade report card template:', err);
    res.status(500).json({ success: false, error: 'Failed to save grade report card template: ' + err.message });
  }
};

/**
 * Publishes compiled Grade Report Cards to Parents and Teachers.
 * Automatically dispatches official emails with login links directly navigating to their child's report.
 */
exports.publishGradeReportCards = async (req, res) => {
  try {
    const period = reportPeriod(req.body);
    const targetSchoolId = resolveSchoolId(req);
    const tNum = period.term;
    const yr = period.academicYear;
    const grade = period.grade;
    if (!tNum || !yr || grade === null) {
      return res.status(400).json({ error: 'Choose a grade, a term, and an academic year before publishing.' });
    }
    const className = String(req.body.class_name || req.body.class || '').trim();
    const readiness = await loadReportReadiness({
      schoolId: targetSchoolId,
      grade: parseInt(grade, 10),
      term: tNum,
      academicYear: yr,
      className
    });
    if (!readiness.ready) {
      return res.status(409).json({ error: 'Reports stay unpublished until every enrolled subject has a submitted marksheet and an authorized average.' });
    }
    const decisions = await reportVerifications.latestForClasses(targetSchoolId, parseInt(grade, 10), tNum, yr);
    const approved = new Set(decisions.filter((row) => row.decision === 'approved').map((row) => String(row.class_name).toLowerCase()));
    const waiting = readiness.classes.filter((row) => !approved.has(String(row.class_name).toLowerCase()));
    if (waiting.length) {
      return res.status(409).json({ error: 'The class teacher still has to verify these reports.', classes: waiting.map((row) => row.class_name) });
    }

    // 1. Mark report_cards as published
    const updateRes = await db.query(
      `UPDATE report_cards
       SET is_published = TRUE, published_at = NOW(), updated_at = NOW()
       WHERE school_id = $1 AND grade = $2 AND term = $3 AND academic_year = $4
       RETURNING child_id`,
      [targetSchoolId, grade, tNum, yr]
    );

    // 2. Fetch all learners in this grade with their compiled report card and linked parent(s)
    const query = `
      SELECT
        c.id AS child_id,
        c.full_name AS child_name,
        c.surname AS child_surname,
        c.learner_number,
        c.grade,
        rc.overall_average,
        rc.overall_level,
        rc.promotion_status,
        p.email AS parent_email,
        p.full_name AS parent_name,
        p.surname AS parent_surname,
        s.name AS school_name,
        s.circuit,
        s.district,
        s.province,
        s.principal_name
      FROM children c
      JOIN report_cards rc ON rc.child_id = c.id AND rc.term = $2 AND rc.academic_year = $3
      LEFT JOIN parent_children pc ON c.id = pc.child_id
      LEFT JOIN users p ON pc.parent_id = p.id OR c.parent_id = p.id
      JOIN schools s ON c.school_id = s.id
      WHERE c.grade = $1 AND c.school_id = $4;
    `;

    const { rows: learners } = await db.query(query, [grade, tNum, yr, targetSchoolId]);

    let emailSentCount = 0;
    const appUrl = (process.env.APP_URL || 'http://localhost:4000').replace(/\/$/, '');

    for (const l of learners) {
      if (l.parent_email) {
        try {
          const directLoginUrl = `${appUrl}/login?redirect=${encodeURIComponent(`/dashboard/parent.html?tab=reports&child_id=${l.child_id}`)}`;
          const overallAvg = l.overall_average === null || l.overall_average === undefined || l.overall_average === ''
            ? null
            : Number(l.overall_average);
          const caps = overallAvg === null || !Number.isFinite(overallAvg)
            ? { descriptor: 'Pending' }
            : getCapsLevel(overallAvg);

          const emailSubject = `Official DBE CAPS Term ${tNum} Academic Report Card — ${l.child_name} ${l.child_surname} (Grade ${l.grade})`;

          const emailContent = `
            <p>Dear ${l.parent_name || 'Parent/Guardian'},</p>
            <p>The official Department of Basic Education (CAPS) Term ${tNum} Academic Report Card for <strong>${l.child_name} ${l.child_surname}</strong> (Learner #: ${l.learner_number}) has been compiled and officially endorsed by the Principal.</p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%; margin:20px 0; background:#0f172a; border-radius:12px; padding:18px; color:#ffffff;">
              <tr>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:14px; color:#94a3b8;">Learner Name:</td>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:15px; font-weight:bold; color:#ffffff; text-align:right;">${l.child_name} ${l.child_surname}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:14px; color:#94a3b8;">Grade & Academic Term:</td>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:14px; color:#38bdf8; font-weight:bold; text-align:right;">Grade ${l.grade} • Term ${tNum} (${yr})</td>
              </tr>
              <tr>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:14px; color:#94a3b8;">Overall Term Average:</td>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:18px; font-weight:800; color:#34d399; text-align:right;">${overallAvg === null ? 'Pending' : `${overallAvg}% (${caps.descriptor})`}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:14px; color:#94a3b8;">Promotion Decision:</td>
                <td style="padding:8px 0; font-size:13px; font-weight:bold; color:#a5b4fc; text-align:right;">${l.promotion_status || 'Pending'}</td>
              </tr>
            </table>

            <p style="font-size:14px; line-height:1.6; color:#cbd5e1;">
              You can now view, download, and print your child's authenticated report card certificate containing the complete subject-by-subject assessment breakdown and the official Principal signature.
            </p>
          `;

          if (emailService && emailService.send) {
            await emailService.send(
              l.parent_email,
              emailSubject,
              emailContent,
              {
                preheader: `Official Term ${tNum} Report Card for ${l.child_name} ${l.child_surname} is now available.`,
                title: `Term ${tNum} Academic Report Card Ready`,
                subtitle: `${l.school_name} • ${l.circuit}`,
                ctaText: 'Login to View & Download Report Card',
                ctaLink: directLoginUrl
              }
            );
            emailSentCount++;

            // Record timestamp in report_cards
            await db.query(
              `UPDATE report_cards SET emailed_at = NOW() WHERE child_id = $1 AND term = $2`,
              [l.child_id, tNum]
            );
          }
        } catch (mailErr) {
          console.warn(`[EMAIL SEND ERROR] Child ${l.child_id}:`, mailErr.message);
        }
      }
    }

    // 3. Create school announcement for parents and teachers
    try {
      await db.query(
        `INSERT INTO announcements (title, content, role_target, grade_target, school_id, author_id, created_at)
         VALUES ($1, $2, 'all', $3, $4, $5, NOW())`,
        [
          `Official Term ${tNum} Grade ${grade} Report Cards Published`,
          `Official CAPS Term ${tNum} report cards for Grade ${grade} have been compiled, verified, and published. Parents and educators can now inspect subject marks and download the signed certificate from their portal.`,
          grade,
          targetSchoolId,
          req.user?.id || 1
        ]
      );
    } catch (annErr) {
      console.warn('[ANNOUNCEMENT ERROR]', annErr.message);
    }

    res.json({
      success: true,
      message: emailSentCount > 0
        ? `Grade ${grade} Term ${tNum} report cards were published for ${updateRes.rows.length} learners. ${emailSentCount} parent emails were sent.`
        : `Grade ${grade} Term ${tNum} report cards were published for ${updateRes.rows.length} learners. No parent emails were sent.`,
      published_count: updateRes.rows.length,
      emails_sent: emailSentCount
    });

  } catch (err) {
    console.error('Error publishing grade report cards:', err);
    res.status(500).json({ success: false, error: 'Failed to publish grade report cards: ' + err.message });
  }
};

/**
 * Builds the canonical South African DBE Multi-Term Report Card Data structure.
 * Supports Term 1, Term 2, Term 3, Term 4 and Final for Year.
 * Calculates real Grade Averages per subject across the school.
 * Enforces strict school isolation.
 */
async function denyUnassignedTeacher(req, res, childId) {
  const role = String((req.user && req.user.role) || '').toLowerCase();
  if (!req.user || req.user.is_superadmin || role === 'admin' || role === 'principal' || role === 'parent' || role === 'learner') {
    return false;
  }
  if (role !== 'teacher') return false;
  const found = await db.query(
    `SELECT cl.homeroom_teacher_id, cl.assigned_teacher_id
     FROM children c
     LEFT JOIN classes cl ON c.class_id = cl.id
     WHERE c.id = $1`,
    [childId]
  );
  const row = found.rows[0] || {};
  const allowed = teacherMayViewClassReport({
    teacherId: req.user.id,
    homeroomTeacherId: row.homeroom_teacher_id,
    assignedTeacherId: row.assigned_teacher_id
  });
  if (!allowed) {
    res.status(403).json({ error: 'Report cards are available to the class teacher assigned to this class.' });
    return true;
  }
  return false;
}

async function buildFullReportCardData(schoolId, childId, academicYear, targetTerm) {
  const tNum = termIndex(targetTerm);
  const yr = parseInt(String(academicYear || ''), 10);
  const targetChildId = parseInt(childId, 10);
  if (!targetChildId || !tNum || !Number.isInteger(yr) || yr < 2000) return null;

  // 1. Fetch Child and School Details
  const identity = await learnerIdentitySelect();
  const childRes = await db.query(
    `SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.learner_number,
            ${identity.admission}, ${identity.idNumber}, ${identity.dob},
            c.grade, c.stream, c.subjects,
            c.home_language, c.school_id,
            cl.name as class_name,
            u.id_number as user_id_number, u.dob as user_dob,
            p.email as parent_email, CONCAT(p.full_name, ' ', p.surname) as parent_name,
            p.phone as parent_phone
     FROM children c
     LEFT JOIN classes cl ON c.class_id = cl.id
     LEFT JOIN users u ON c.learner_user_id = u.id
     LEFT JOIN parent_children pc ON c.id = pc.child_id
     LEFT JOIN users p ON pc.parent_id = p.id OR c.parent_id = p.id
     WHERE c.id = $1
     LIMIT 1`,
    [targetChildId]
  );

  if (childRes.rows.length === 0) return null;
  const child = childRes.rows[0];

  // Strictly enforce school isolation
  const resolvedSchoolId = child.school_id || schoolId;
  if (schoolId && child.school_id && Number(schoolId) !== Number(child.school_id)) {
    return { unauthorized_school: true };
  }

  // 2. Fetch School Record
  const schoolRes = await db.query(
    `SELECT id, name, emis_number, circuit, district, province, physical_address,
            postal_address, contact_email, contact_phone, principal_name, logo_url,
            badge_url, report_settings
     FROM schools WHERE id = $1 LIMIT 1`,
    [resolvedSchoolId]
  );
  const school = schoolRes.rows[0] || {
    id: resolvedSchoolId,
    name: 'Geleza SA Partner School',
    emis_number: '',
    circuit: '',
    district: '',
    province: '',
    physical_address: '',
    postal_address: '',
    contact_email: '',
    contact_phone: '',
    principal_name: 'Principal',
    logo_url: null,
    badge_url: null,
    report_settings: {}
  };

  // 3. Determine enrolled subjects
  let studentSubjects = Array.isArray(child.subjects) ? [...child.subjects] : [];

  // 4. Fetch grade-wide averages for each subject and term across this school
  const gradeAvesRes = await db.query(
    `SELECT LOWER(m.subject) as subject_lower, m.term,
            ROUND(AVG(
              CASE
                WHEN m.percentage IS NOT NULL THEN m.percentage
                WHEN m.max_score > 0 THEN (m.score::numeric / m.max_score::numeric) * 100
                ELSE m.score
              END
            )) as grade_ave
     FROM marks m
     JOIN children c ON (m.child_id = c.id OR m.learner_id = c.id)
     WHERE c.school_id = $1 AND c.grade = $2
       AND (
         m.academic_year = $3
         OR (m.academic_year IS NULL AND COALESCE(m.term::text, '') !~ '20[0-9]{2}')
         OR (m.academic_year IS NULL AND COALESCE(m.term::text, '') LIKE '%' || $3::text || '%')
       )
     GROUP BY LOWER(m.subject), m.term`,
    [resolvedSchoolId, child.grade, yr]
  );
  const gradeAveMap = {};
  gradeAvesRes.rows.forEach(r => {
    gradeAveMap[`${r.subject_lower}_term${r.term}`] = Number(r.grade_ave);
  });

  // 5. Fetch all marks recorded for this child across all terms
  const childMarksRes = await db.query(
    `SELECT subject, term, score, max_score, percentage, weight, is_formal, assessment_name, academic_year
     FROM marks
     WHERE (child_id = $1 OR learner_id = $1)
       AND (
         academic_year = $2
         OR (academic_year IS NULL AND COALESCE(term::text, '') !~ '20[0-9]{2}')
         OR (academic_year IS NULL AND COALESCE(term::text, '') LIKE '%' || $2::text || '%')
       )
     ORDER BY term ASC, recorded_at ASC`,
    [targetChildId, yr]
  );

  const marksMap = {};
  childMarksRes.rows.forEach(m => {
    const subKey = (m.subject || '').trim().toLowerCase();
    if (!markBelongsToYear(m, yr)) return;
    const t = termIndex(m.term);
    if (!t) return;
    if (!marksMap[subKey]) marksMap[subKey] = {};
    if (!marksMap[subKey][t]) marksMap[subKey][t] = [];
    marksMap[subKey][t].push(m);
  });

  // 6. Fetch attendance by term
  const attRes = await db.query(
    `SELECT term,
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as days_absent,
            COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as days_present,
            COUNT(*) as total_days
     FROM attendance
     WHERE child_id = $1
     GROUP BY term`,
    [targetChildId]
  );
  const attMap = {};
  let totalAbsent = 0;
  attRes.rows.forEach(r => {
    const t = termIndex(r.term);
    if (!t) return;
    const abs = parseInt(r.days_absent || 0, 10);
    attMap[`term${t}`] = abs;
    totalAbsent += abs;
  });

  // 7. Fetch existing saved report_cards record if present
  const rcRes = await db.query(
    `SELECT * FROM report_cards
     WHERE child_id = $1 AND academic_year = $2 AND (term = $3 OR term IS NULL)
     ORDER BY id DESC LIMIT 1`,
    [targetChildId, yr, tNum]
  );
  const existingRc = rcRes.rows[0] || null;
  const authorizedBySubject = new Map();
  try {
    const authRows = await db.query(
      `SELECT subject, result
       FROM calculation_authorizations
       WHERE school_id = $1 AND grade = $2 AND term_number = $3 AND academic_year = $4
         AND status = 'authorized' AND LOWER(class_name) = LOWER($5)`,
      [resolvedSchoolId, child.grade, tNum, yr, child.class_name]
    );
    authRows.rows.forEach((row) => {
      const learners = row.result && row.result.learners;
      const match = Array.isArray(learners) && learners.find((item) => Number(item.learner_id) === Number(child.id) && item.status === 'complete');
      if (match && match.percentage !== null && match.percentage !== undefined) {
        authorizedBySubject.set(String(row.subject).toLowerCase(), Number(match.percentage));
      }
    });
  } catch (_) {}

  // Build subject-by-subject multi-term data
  const multiTermSubjects = [];
  const termTotals = { term1: 0, term2: 0, term3: 0, term4: 0, final: 0 };
  const termSubjectCounts = { term1: 0, term2: 0, term3: 0, term4: 0, final: 0 };

  for (const sName of studentSubjects) {
    const subKey = sName.trim().toLowerCase();
    const subjectMarks = marksMap[subKey] || {};

    const subjectRow = {
      subject: sName,
      term1: null,
      term2: null,
      term3: null,
      term4: null,
      final: null
    };

    const evaluatedTerms = [];

    for (let t = 1; t <= 4; t++) {
      if (t === tNum && authorizedBySubject.has(subKey)) {
        const finalPct = authorizedBySubject.get(subKey);
        const caps = getCapsLevel(finalPct);
        subjectRow[`term${t}`] = {
          mark: finalPct,
          level: caps.level,
          grade_ave: gradeAveMap[`${subKey}_term${t}`] ?? null,
          rating: caps.rating,
          authorized: true
        };
        termTotals[`term${t}`] += finalPct;
        termSubjectCounts[`term${t}`]++;
        evaluatedTerms.push(finalPct);
        continue;
      }
      const termMarks = (subjectMarks[t] || [])
        .map((mark) => ({ mark, percentage: markPercentage(mark) }))
        .filter((item) => item.percentage !== null);
      if (termMarks.length > 0) {
        let totalW = 0;
        let weightedSum = 0;

        termMarks.forEach(({ mark, percentage }) => {
          const maximum = Number(mark.max_score);
          const weight = Number(mark.weight);
          const w = Number.isFinite(weight) && weight > 0
            ? weight
            : (Number.isFinite(maximum) && maximum > 0 ? maximum : 100);
          totalW += w;
          weightedSum += percentage * w;
        });

        const finalPct = Math.round(weightedSum / totalW);
        const caps = getCapsLevel(finalPct);
        const gradeAve = gradeAveMap[`${subKey}_term${t}`] ?? null;

        subjectRow[`term${t}`] = {
          mark: finalPct,
          level: caps.level,
          grade_ave: gradeAve,
          rating: caps.rating
        };

        termTotals[`term${t}`] += finalPct;
        termSubjectCounts[`term${t}`]++;
        evaluatedTerms.push(finalPct);
      }
    }

    // Calculate Final for Year across evaluated terms
    if (evaluatedTerms.length > 0) {
      const finalMark = Math.round(evaluatedTerms.reduce((a, b) => a + b, 0) / evaluatedTerms.length);
      const caps = getCapsLevel(finalMark);
      const finalGradeAve = Math.round(
        [1, 2, 3, 4]
          .map(t => gradeAveMap[`${subKey}_term${t}`])
          .filter(v => v !== null && v !== undefined)
          .reduce((a, b, _, arr) => a + b / arr.length, 0)
      ) || null;

      subjectRow.final = {
        mark: finalMark,
        level: caps.level,
        grade_ave: finalGradeAve,
        rating: caps.rating
      };

      termTotals.final += finalMark;
      termSubjectCounts.final++;
    }

    multiTermSubjects.push(subjectRow);
  }

  // Calculate Term Averages
  const termAverages = {};
  for (const tk of ['term1', 'term2', 'term3', 'term4', 'final']) {
    termAverages[tk] = termSubjectCounts[tk] > 0
      ? Math.round(termTotals[tk] / termSubjectCounts[tk])
      : null;
  }

  // Terms 1 to 3 use Achieved or Not Achieved. Term 4 uses Promoted or Not Promoted.
  // A term stays blank until every subject on the report has a mark for that term.
  const outcomes = {};
  ['term1', 'term2', 'term3', 'term4'].forEach((key, index) => {
    const complete = multiTermSubjects.length > 0 && multiTermSubjects.every((row) => {
      const cell = row[key];
      return cell && Number.isFinite(Number(cell.mark));
    });
    outcomes[key] = termResultLabel(index + 1, termAverages[key], complete);
  });
  const finalAvg = termAverages.final;
  outcomes.final = existingRc?.promotion_status || (finalAvg !== null ? (finalAvg >= 50 ? 'Promoted' : (finalAvg >= 40 ? 'Progressed' : 'Not Promoted')) : '-');

  // Dates
  const repSettings = school.report_settings || {};
  const closingDate = existingRc?.closing_date || repSettings.closing_date || null;
  const reopeningDate = existingRc?.reopening_date || repSettings.reopening_date || null;
  const issueDate = existingRc?.issue_date || new Date().toISOString().substring(0, 10).replace(/-/g, '/');

  // Teacher & Principal comments
  const teacherComment = existingRc?.teacher_comment || null;
  const principalComment = existingRc?.principal_comment || null;

  const cleanSurname = (child.surname || '').trim().toUpperCase();
  const cleanFirst = (child.full_name || '').trim().toUpperCase();
  const cleanName = cleanSurname ? `${cleanSurname}, ${cleanFirst}` : cleanFirst;

  return {
    school: {
      id: school.id,
      name: school.name || 'Geleza SA Registered School',
      physical_address: school.physical_address || '',
      postal_address: school.postal_address || '',
      contact_phone: school.contact_phone || '',
      contact_email: school.contact_email || '',
      emis_number: school.emis_number || '',
      principal_name: school.principal_name || 'Principal',
      logo_url: school.logo_url || null,
      badge_url: school.badge_url || null
    },
    learner: {
      id: child.id,
      full_name: cleanName,
      first_name: child.full_name || '',
      surname: child.surname || '',
      learner_number: child.learner_number || '',
      admission_number: child.admission_number || child.learner_number || 'N/A',
      id_number: child.id_number || child.user_id_number || '',
      dob: child.dob || child.user_dob || null,
      grade: child.grade,
      class_name: child.class_name || null,
      stream: child.stream || null,
      home_language: child.home_language || null
    },
    meta: {
      academic_year: yr,
      current_term: tNum,
      closing_date: closingDate,
      reopening_date: reopeningDate,
      issue_date: issueDate
    },
    subjects: multiTermSubjects,
    summary: {
      totals: {
        term1: termSubjectCounts.term1 > 0 ? termTotals.term1 : null,
        term2: termSubjectCounts.term2 > 0 ? termTotals.term2 : null,
        term3: termSubjectCounts.term3 > 0 ? termTotals.term3 : null,
        term4: termSubjectCounts.term4 > 0 ? termTotals.term4 : null,
        final: termSubjectCounts.final > 0 ? termTotals.final : null
      },
      averages: termAverages,
      outcome: outcomes,
      attendance: {
        term1_absent: attMap.term1 ?? null,
        term2_absent: attMap.term2 ?? null,
        term3_absent: attMap.term3 ?? null,
        term4_absent: attMap.term4 ?? null,
        total_absent: attRes.rows.length > 0 ? totalAbsent : null
      }
    },
    remarks: {
      teacher_comment: teacherComment,
      principal_comment: principalComment,
      general_remarks: existingRc?.general_remarks || teacherComment
    },
    signatures: {
      educator_name: child.class_teacher_name || null,
      hod_name: null,
      principal_name: school.principal_name || null,
      parent_name: child.parent_name || null
    },
    status: existingRc?.status || (existingRc?.is_published ? 'published' : 'draft'),
    is_published: Boolean(existingRc?.is_published),
    ai_advisory: existingRc?.ai_advisory || null
  };
}

/**
 * Returns full South African CAPS Report Card Data for a single learner (for printable view / PDF).
 */
exports.getOfficialReportCardView = async (req, res) => {
  try {
    const childId = parseInt(req.query.childId || req.query.child_id || req.params?.childId, 10);
    const period = reportPeriod(req.query);
    const termNum = period.term;
    const academicYear = period.academicYear;
    const userSchoolId = resolveSchoolId(req);

    if (!childId) {
      return res.status(400).json({ error: 'Child ID is required.' });
    }
    if (!termNum || !academicYear) {
      return res.status(400).json({ error: 'Choose a term and an academic year before opening the report.' });
    }

    if (!(await assertChildAccess(req, res, childId))) return;
    if (await denyUnassignedTeacher(req, res, childId)) return;

    const reportData = await buildFullReportCardData(userSchoolId, childId, academicYear, termNum);

    if (!reportData) {
      return res.status(404).json({ error: 'Learner record not found.' });
    }

    if (reportData.unauthorized_school && !req.user?.is_superadmin) {
      return res.status(403).json({ error: 'Access denied: learner belongs to a different school.' });
    }

    const userRole = (req.user?.role || '').toLowerCase();
    // If requester is a parent or learner and the card is not published:
    if ((userRole === 'parent' || userRole === 'learner') && (!reportData.is_published && reportData.status !== 'published')) {
      return res.json({
        success: true,
        is_published: false,
        not_published: true,
        message: 'Report Card for this term has not yet been published by the school administration.',
        learner: reportData.learner
      });
    }

    // Flat subjects array for legacy component compatibility
    const currentTermKey = `term${termNum}`;
    const formattedSubjects = (reportData.subjects || []).map(s => {
      const t = s[currentTermKey] || {};
      const hasMark = t.mark !== null && t.mark !== undefined;
      const numMark = hasMark ? Number(t.mark) : null;
      const caps = numMark !== null ? getCapsLevel(numMark) : { level: '-', rating: 'Pending' };
      return {
        subject: s.subject,
        code: s.subject.substring(0, 4).toUpperCase(),
        mark_display: hasMark ? `${numMark}%` : '-',
        mark: numMark,
        percentage: numMark,
        average: t.grade_ave ?? null,
        level: caps.level,
        rating: caps.rating,
        descriptor: caps.descriptor || caps.rating,
        multi_term: {
          term1: s.term1,
          term2: s.term2,
          term3: s.term3,
          term4: s.term4,
          final: s.final
        }
      };
    });

    const overallAvg = reportData.summary?.averages?.[currentTermKey] ?? reportData.summary?.averages?.final;
    const overallCaps = overallAvg !== null ? getCapsLevel(overallAvg) : { level: '-', rating: 'Pending' };

    res.json({
      success: true,
      school: reportData.school,
      learner: reportData.learner,
      subjects: formattedSubjects,
      attendance: {
        days_present: null,
        days_absent: reportData.summary?.attendance?.total_absent ?? null,
        total_days: null,
        attendance_percentage: null
      },
      summary: reportData.summary,
      overall_average: overallAvg,
      overall_level: overallCaps.level,
      overall_rating: overallCaps.rating,
      promotion_status: reportData.summary?.outcome?.final && reportData.summary.outcome.final !== '-'
        ? reportData.summary.outcome.final
        : null,
      term: `Term ${termNum}`,
      academic_year: academicYear,
      ai_advisory: reportData.ai_advisory,
      report_card: reportData
    });

  } catch (err) {
    console.error('Error fetching official report card view:', err);
    res.status(500).json({ error: 'Failed to retrieve report card view: ' + err.message });
  }
};

/**
 * Downloads a clean, official South African DBE Learner Report Card PDF.
 */
exports.downloadLearnerReportPdf = async (req, res) => {
  try {
    const childId = parseInt(req.query.childId || req.query.child_id || req.params?.childId, 10);
    const period = reportPeriod(req.query);
    const termNum = period.term;
    const academicYear = period.academicYear;
    const userSchoolId = resolveSchoolId(req);

    if (!childId) {
      return res.status(400).json({ error: 'Child ID is required.' });
    }
    if (!termNum || !academicYear) {
      return res.status(400).json({ error: 'Choose a term and an academic year before downloading the report.' });
    }

    if (!(await assertChildAccess(req, res, childId))) return;
    if (await denyUnassignedTeacher(req, res, childId)) return;

    const reportData = await buildFullReportCardData(userSchoolId, childId, academicYear, termNum);

    if (!reportData) {
      return res.status(404).json({ error: 'Learner record not found.' });
    }

    if (reportData.unauthorized_school && !req.user?.is_superadmin) {
      return res.status(403).json({ error: 'Access denied: learner belongs to a different school.' });
    }

    const userRole = (req.user?.role || '').toLowerCase();
    if ((userRole === 'parent' || userRole === 'learner') && (!reportData.is_published && reportData.status !== 'published')) {
      return res.status(403).json({ error: 'Report card has not yet been published by school administration.' });
    }

    const pdfBuffer = await reportCardPdfService.generateLearnerReportCardPdf(reportData);

    const safeLearnerName = reportCardPdfService.sanitizeFilename(`${reportData.learner.surname}_${reportData.learner.first_name}`);
    const safeGrade = reportCardPdfService.sanitizeFilename(String(reportData.learner.grade));
    const safeClass = reportCardPdfService.sanitizeFilename(String(reportData.learner.class_name));
    const filename = `GelezaSA_Report_${academicYear}_Grade${safeGrade}_Class${safeClass}_${safeLearnerName}_Term${termNum}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating learner report PDF:', err);
    res.status(500).json({ error: 'Failed to generate report card PDF: ' + err.message });
  }
};

/**
 * Downloads a batch ZIP of official South African DBE Report Card PDFs for an entire grade/class.
 */
exports.downloadBatchReportCardsZip = async (req, res) => {
  try {
    const period = reportPeriod(req.query);
    const grade = period.grade;
    const className = (req.query.class_name || req.query.class || req.query.className || '').trim();
    const termNum = period.term;
    const academicYear = period.academicYear;
    if (!grade || !termNum || !academicYear) {
      return res.status(400).json({ error: 'Choose a grade, a term, and an academic year before downloading the reports.' });
    }
    const schoolId = parseInt(resolveSchoolId(req), 10);

    if (!Number.isInteger(schoolId)) {
      return res.status(403).json({ error: 'This account is not linked to a school.' });
    }

    const params = [schoolId, grade];
    let classClause = '';
    if (className && className !== 'All') {
      params.push(className);
      classClause = `AND (cl.name = $${params.length} OR c.class_id::text = $${params.length})`;
    }

    const { rows: learners } = await db.query(
      `SELECT c.id FROM children c
       LEFT JOIN classes cl ON c.class_id = cl.id
       WHERE c.school_id = $1 AND c.grade = $2
       ${classClause}
       ORDER BY c.surname ASC, c.full_name ASC`,
      params
    );

    if (learners.length === 0) {
      return res.status(404).json({ error: 'No enrolled learners found for this grade and class.' });
    }

    const reportsList = [];
    for (const l of learners) {
      const rep = await buildFullReportCardData(schoolId, l.id, academicYear, termNum);
      if (rep && !rep.unauthorized_school) {
        reportsList.push(rep);
      }
    }

    if (reportsList.length === 0) {
      return res.status(404).json({ error: 'No report card data could be generated.' });
    }

    const zipBuffer = await reportCardPdfService.generateBatchReportCardsZip(reportsList);

    const safeGrade = reportCardPdfService.sanitizeFilename(String(grade));
    const safeClass = reportCardPdfService.sanitizeFilename(className || 'All');
    const filename = `GelezaSA_Batch_Reports_${academicYear}_Grade${safeGrade}_Class${safeClass}_Term${termNum}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err) {
    console.error('Error generating batch report cards ZIP:', err);
    res.status(500).json({ error: 'Failed to generate batch report cards: ' + err.message });
  }
};

/**
 * Approves compiled Grade Report Cards in the database (Admin only).
 */
exports.approveGradeReportCards = async (req, res) => {
  try {
    const period = reportPeriod(req.body);
    const class_name = req.body.class_name;
    const targetSchoolId = resolveSchoolId(req);
    const grade = period.grade;
    const tNum = period.term;
    const yr = period.academicYear;
    if (!grade || !tNum || !yr) {
      return res.status(400).json({ success: false, error: 'Choose a grade, a term, and an academic year before approving.' });
    }

    let query = `
      UPDATE report_cards
      SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
      WHERE school_id = $2 AND grade = $3 AND term = $4 AND academic_year = $5
    `;
    const params = [req.user?.id || null, targetSchoolId, grade, tNum, yr];
    if (class_name && class_name !== 'All') {
      params.push(class_name);
      query += ` AND class_name = $${params.length}`;
    }
    query += ` RETURNING id`;

    const result = await db.query(query, params);
    res.json({
      success: true,
      message: `Successfully approved ${result.rows.length} report cards for Grade ${grade} Term ${tNum}. Ready for publication.`,
      approved_count: result.rows.length
    });
  } catch (err) {
    console.error('Error approving report cards:', err);
    res.status(500).json({ success: false, error: 'Failed to approve report cards: ' + err.message });
  }
};

/**
 * Lists report release status for the signed-in parent or learner.
 * Unpublished rows omit marks. Report-access fees stay off.
 */
exports.listMyReportReleases = async (req, res) => {
  try {
    const actor = await loadActor(req.user);
    if (!actor || (actor.role !== 'parent' && actor.role !== 'learner')) {
      return res.status(403).json({ error: 'Report release is available to the linked parent or learner.' });
    }
    const children = actor.role === 'parent'
      ? await reportReleases.listForParent(actor.id)
      : await reportReleases.listForLearner(actor.id);
    res.json({ success: true, payment: paymentEntitlement(), children });
  } catch (err) {
    console.error('Error listing report releases:', err);
    res.status(500).json({ error: 'Failed to list report releases: ' + err.message });
  }
};

/**
 * Returns all compiled report cards for a learner or parent.
 */
exports.getLearnerReportCards = async (req, res) => {
  try {
    const { child_id } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let targetChildId = child_id;

    if (!targetChildId) {
      if (userRole === 'learner') {
        const cRes = await db.query(`SELECT id FROM children WHERE learner_user_id = $1 LIMIT 1`, [userId]);
        targetChildId = cRes.rows[0]?.id;
      } else if (userRole === 'parent') {
        const cRes = await db.query(`
          SELECT c.id FROM children c 
          LEFT JOIN parent_children pc ON c.id = pc.child_id 
          WHERE pc.parent_id = $1 OR c.parent_id = $1 LIMIT 1
        `, [userId]);
        targetChildId = cRes.rows[0]?.id;
      }
    }

    if (!targetChildId) {
      return res.json({ success: true, report_cards: [] });
    }

    if (!(await assertChildAccess(req, res, targetChildId))) return;
    if (await denyUnassignedTeacher(req, res, targetChildId)) return;

    const query = `
      SELECT 
        rc.*,
        c.full_name as learner_first_name,
        c.surname as learner_surname,
        c.learner_number,
        c.stream,
        s.name as school_name,
        s.circuit,
        s.district,
        s.province,
        s.emis_number,
        s.physical_address,
        s.postal_address,
        s.principal_name,
        s.logo_url
      FROM report_cards rc
      JOIN children c ON rc.child_id = c.id
      LEFT JOIN schools s ON rc.school_id = s.id
      WHERE rc.child_id = $1
      ORDER BY rc.academic_year DESC, rc.term DESC;
    `;

    const { rows } = await db.query(query, [parseInt(targetChildId, 10)]);
    const actor = await loadActor(req.user);
    const role = actor?.role || String(userRole || '').toLowerCase();
    if (role === 'parent' || role === 'learner') {
      return res.json({
        success: true,
        payment: paymentEntitlement(),
        report_cards: rows.map((row) => parentCardView({
          ...row,
          child_name: [row.learner_first_name, row.learner_surname].filter(Boolean).join(' '),
          grade: row.grade,
          class_name: row.class_name
        }))
      });
    }
    res.json({ success: true, report_cards: rows });
  } catch (err) {
    console.error('Error fetching learner report cards:', err);
    res.status(500).json({ error: 'Failed to retrieve report cards: ' + err.message });
  }
};

exports.compileReportCard = exports.saveGradeReportCardTemplate;
exports.batchCompileAndEmailReportCards = exports.publishGradeReportCards;

/**
 * Admin Overview: Checks which teachers have submitted marks per Grade, Stream, and Class.
 */
exports.getTeacherSubmissionsOverview = async (req, res) => {
  try {
    const period = reportPeriod(req.query);
    const grade = period.grade;
    const termNum = period.term;
    if (!grade || !termNum) {
      return res.status(400).json({ success: false, error: 'Choose a grade and a term.' });
    }
    const className = (req.query.class_name || req.query.class || '').trim();
    const stream = (req.query.stream || '').trim();
    const rawSchoolId = resolveSchoolId(req);
    const schoolId = parseInt(rawSchoolId, 10);
    if (!Number.isInteger(schoolId)) {
      return res.status(403).json({ error: 'This account is not linked to a school.' });
    }

    // 1. Fetch total enrolled learners for this grade and class
    let learnersQ = `
      SELECT c.id, c.subjects
      FROM children c
      LEFT JOIN classes cl ON c.class_id = cl.id
      WHERE c.grade = $1 AND c.school_id = $2
    `;
    const params = [grade, schoolId];
    if (className && className !== 'All') {
      params.push(className);
      learnersQ += ` AND (cl.name = $${params.length} OR c.class_id::text = $${params.length})`;
    }
    if (stream && stream !== 'All') {
      params.push(stream);
      learnersQ += ` AND c.stream = $${params.length}`;
    }
    const { rows: learners } = await db.query(learnersQ, params);
    const totalLearners = learners.length;

    const subjectNames = new Set();
    learners.forEach((learner) => {
      if (Array.isArray(learner.subjects)) {
        learner.subjects.forEach((name) => {
          if (name) subjectNames.add(String(name));
        });
      }
    });
    const subjects = Array.from(subjectNames).sort((a, b) => a.localeCompare(b));

    // 3. For each subject, query marks table for submissions
    const submissions = [];
    let submittedRows = [];
    try {
      submittedRows = await marksheetSubmissions.listForOverview(schoolId, grade, termNum, className);
    } catch (lookupError) {
      console.warn('Marksheet submission lookup skipped:', lookupError.message);
    }

    for (const sub of subjects) {
      const enrolledIds = learners
        .filter((learner) => Array.isArray(learner.subjects) && learner.subjects.some((name) => String(name).toLowerCase() === sub.toLowerCase()))
        .map((learner) => learner.id);
      let markCount = 0;
      let lastUploadedAt = null;
      let teacherInfo = '';
      if (enrolledIds.length > 0) {
        const mRes = await db.query(
          `SELECT m.recorded_at, u.full_name, u.surname
           FROM marks m
           LEFT JOIN users u ON m.recorded_by = u.id
           WHERE (m.child_id = ANY($1) OR m.learner_id = ANY($1))
             AND (
               m.term::text = $2::text
               OR m.term::text LIKE ($2::text || '20%')
             )
             AND LOWER(COALESCE(m.subject, m.subject_name, '')) = LOWER($3)
           ORDER BY m.recorded_at DESC`,
          [enrolledIds, termNum, sub]
        );

        markCount = mRes.rows.length;
        if (mRes.rows[0]) {
          lastUploadedAt = mRes.rows[0].recorded_at;
          if (mRes.rows[0].full_name) {
            teacherInfo = `${mRes.rows[0].full_name} ${mRes.rows[0].surname || ''}`.trim();
          }
        }
      }

      const locked = submittedRows.find((row) => String(row.subject).toLowerCase() === sub.toLowerCase());
      const status = submissionStatus({
        enrolledCount: enrolledIds.length,
        markCount,
        locked: Boolean(locked)
      });

      submissions.push({
        subject: sub,
        assessment_name: locked ? locked.assessment_name : null,
        status,
        marks_recorded: markCount,
        total_learners: enrolledIds.length,
        missing_count: locked ? locked.missing_count : Math.max(enrolledIds.length - markCount, 0),
        submission_id: locked ? locked.id : null,
        version: locked ? locked.version : null,
        correction_requested: Boolean(locked && locked.reopen_requested_at),
        teacher: teacherInfo ? { name: teacherInfo } : null,
        last_uploaded_at: locked ? locked.submitted_at : lastUploadedAt
      });
    }

    const submittedCount = submissions.filter(s => s.status === 'SUBMITTED').length;
    const partialCount = submissions.filter(s => s.status === 'PARTIAL').length;
    const pendingCount = submissions.filter(s => s.status === 'PENDING').length;

    res.json({
      success: true,
      grade,
      class_name: className || 'All',
      term: termNum,
      total_learners: totalLearners,
      total_subjects: subjects.length,
      submitted_count: submittedCount,
      partial_count: partialCount,
      pending_count: pendingCount,
      can_transfer: (submittedCount + partialCount) > 0,
      submissions
    });
  } catch (err) {
    console.error('Error fetching teacher submissions overview:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve teacher mark submissions overview.' });
  }
};

/**
 * Admin Action: Transfers uploaded teacher marks to report card templates
 * and runs Option A AI prediction for each learner.
 */
exports.transferTeacherMarksToTemplate = async (req, res) => {
  try {
    const period = reportPeriod(req.body);
    const grade = period.grade;
    const termNum = period.term;
    const className = (req.body.class_name || req.body.class || req.body.className || '').trim();
    const stream = (req.body.stream || '').trim();
    const academicYear = period.academicYear;
    if (!grade || !termNum || !academicYear) {
      return res.status(400).json({ success: false, error: 'Choose a grade, a term, and an academic year before transferring marks.' });
    }
    const rawSchoolId = resolveSchoolId(req);
    const schoolId = parseInt(rawSchoolId, 10);
    if (!Number.isInteger(schoolId)) {
      return res.status(403).json({ error: 'This account is not linked to a school.' });
    }

    // 1. Fetch learners
    const params = [schoolId, grade];
    let classClause = '';
    if (className && className !== 'All') {
      params.push(className);
      classClause = `AND (cl.name = $${params.length} OR c.class_id::text = $${params.length})`;
    }

    const { rows: learners } = await db.query(
      `SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, c.subjects,
              cl.name as class_name
       FROM children c
       LEFT JOIN classes cl ON c.class_id = cl.id
       WHERE (c.school_id = $1 OR $1 IS NULL) AND c.grade = $2
       ${classClause}
       ORDER BY c.surname ASC, c.full_name ASC`,
      params
    );

    if (learners.length === 0) {
      return res.status(404).json({ success: false, error: 'No enrolled learners found for this grade and class.' });
    }

    let transferredCount = 0;

    for (const l of learners) {
      // Fetch ONLY recorded formal assessment marks (Strictly exclude informal practice/quizzes)
      let marksRes;
      try {
        marksRes = await db.query(
          `SELECT subject, assessment_name, score, max_score, percentage, weight, is_formal, assessment_type
           FROM marks 
           WHERE (child_id = $1 OR learner_id = $1)
             AND (term::text = $2::text OR term::text LIKE ($2::text || '20%'))
             AND (is_formal = TRUE OR is_formal IS NULL)
           ORDER BY recorded_at ASC`,
          [l.id, termNum]
        );
      } catch (errMarks) {
        marksRes = await db.query(
          `SELECT subject, assessment_name, score, max_score, percentage, weight
           FROM marks 
           WHERE (child_id = $1 OR learner_id = $1)
             AND (term::text = $2::text OR term::text LIKE ($2::text || '20%'))
           ORDER BY recorded_at ASC`,
          [l.id, termNum]
        ).catch(() => ({ rows: [] }));
      }

      // Real Attendance from attendance register
      const attRes = await db.query(
        `SELECT 
           COUNT(*) as total_days,
           COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as days_present,
           COUNT(CASE WHEN status = 'absent' THEN 1 END) as days_absent
         FROM attendance WHERE child_id = $1`,
        [l.id]
      );
      const totalDays = parseInt(attRes.rows[0]?.total_days || '0', 10);
      const daysPresent = parseInt(attRes.rows[0]?.days_present || '0', 10);
      const daysAbsent = parseInt(attRes.rows[0]?.days_absent || (totalDays > 0 ? totalDays - daysPresent : '0'), 10);
      const attPct = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : null;

      // Group formal marks by subject with dynamic weighting
      const subjectMarksMap = {};
      marksRes.rows.forEach(m => {
        const sub = m.subject;
        if (!subjectMarksMap[sub]) subjectMarksMap[sub] = [];
        subjectMarksMap[sub].push(m);
      });

      // Student subject list — guarantee Geography is included for Science stream FET
      let subList = Array.isArray(l.subjects) && l.subjects.length > 0
        ? [...l.subjects]
        : Object.keys(subjectMarksMap);

      const subjectBreakdown = [];
      const scoresForAi = {};

      for (const sName of subList) {
        const matching = subjectMarksMap[sName] || [];
        if (matching.length > 0) {
          let totalWeight = 0;
          let weightedSum = 0;
          let sbaWeightSum = 0;
          let sbaTotalWeight = 0;
          let examWeightSum = 0;
          let examTotalWeight = 0;
          let rawScoreSum = 0;
          let maxScoreSum = 0;

          const detailedAssessments = matching.flatMap(m => {
            const pct = percentageFromMark(m);
            if (pct === null) return [];
            const rawScore = Number(m.score);
            const maxScore = Number(m.max_score);
            const w = Number(m.weight) || (Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100);
            const aType = (m.assessment_type || m.assessment_name || '').toLowerCase();
            const isExam = aType.includes('exam') || aType.includes('examination');

            totalWeight += w;
            weightedSum += pct * w;
            if (Number.isFinite(rawScore)) rawScoreSum += rawScore;
            if (Number.isFinite(maxScore) && maxScore > 0) maxScoreSum += maxScore;

            if (isExam) {
              examWeightSum += pct * w;
              examTotalWeight += w;
            } else {
              sbaWeightSum += pct * w;
              sbaTotalWeight += w;
            }

            return {
              name: m.assessment_name || 'Formal Task',
              type: m.assessment_type || (isExam ? 'Examination' : 'Formal Assessment'),
              score: rawScore,
              max_score: maxScore,
              weight: w,
              percentage: pct
            };
          });

          const finalSubjectPct = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
          if (finalSubjectPct === null) {
            subjectBreakdown.push({
              subject: sName,
              code: sName.substring(0, 4).toUpperCase(),
              mark_display: '-',
              raw_score: null,
              max_score: null,
              mark: null,
              percentage: null,
              sba_mark: null,
              exam_mark: null,
              level: '-',
              rating: 'Pending Upload',
              descriptor: 'Teacher Marks Not Uploaded',
              badge: 'amber',
              is_pending: true,
              assessments: []
            });
            continue;
          }
          const sbaMark = sbaTotalWeight > 0 ? Math.round(sbaWeightSum / sbaTotalWeight) : finalSubjectPct;
          const examMark = examTotalWeight > 0 ? Math.round(examWeightSum / examTotalWeight) : null;
          const markDisplay = maxScoreSum > 0 ? `${rawScoreSum} / ${maxScoreSum}` : `${finalSubjectPct}%`;
          const caps = getCapsLevel(finalSubjectPct);

          subjectBreakdown.push({
            subject: sName,
            code: sName.substring(0, 4).toUpperCase(),
            mark_display: markDisplay,
            raw_score: rawScoreSum,
            max_score: maxScoreSum,
            mark: finalSubjectPct,
            percentage: finalSubjectPct,
            sba_mark: sbaMark,
            exam_mark: examMark,
            level: caps.level,
            rating: caps.rating,
            descriptor: caps.descriptor,
            badge: caps.badge,
            is_pending: false,
            assessments: detailedAssessments
          });
          scoresForAi[sName.toLowerCase()] = finalSubjectPct;
        } else {
          subjectBreakdown.push({
            subject: sName,
            code: sName.substring(0, 4).toUpperCase(),
            mark_display: '-',
            raw_score: null,
            max_score: null,
            mark: null,
            percentage: null,
            sba_mark: null,
            exam_mark: null,
            level: '-',
            rating: 'Pending Upload',
            descriptor: 'Teacher Marks Not Uploaded',
            badge: 'amber',
            is_pending: true,
            assessments: []
          });
        }
      }

      const gradedSubs = subjectBreakdown.filter(s => s.mark !== null && !s.is_pending);
      const hasAnyMarks = gradedSubs.length > 0;
      const overallAvg = hasAnyMarks ? Math.round(gradedSubs.reduce((sum, s) => sum + s.mark, 0) / gradedSubs.length) : null;
      const overallCaps = hasAnyMarks ? getCapsLevel(overallAvg) : { level: '-', rating: 'Pending' };
      const promotionDecision = subjectBreakdown.length > 0 && subjectBreakdown.every((entry) => entry.mark !== null && !entry.is_pending)
        ? calculateSouthAfricanPromotion(gradedSubs, overallAvg)
        : 'PENDING TEACHER MARKS';

      // 3. Run AI Advisor if learner has verified marks
      let aiAdvisory = null;
      if (hasAnyMarks) {
        const { observedMarkSummary } = require('../../../lib/academicEvidence');
        aiAdvisory = observedMarkSummary(gradedSubs.map((entry) => ({
          subject: entry.subject,
          score: entry.mark
        })));
      }

      // Upsert into report_cards table
      const existRes = await db.query(
        `SELECT id FROM report_cards WHERE child_id = $1 AND term = $2 AND academic_year = $3 LIMIT 1`,
        [l.id, termNum, academicYear]
      );

      if (existRes.rows.length > 0) {
        await keepPreviousReport(db, {
          childId: l.id, term: termNum, academicYear, reason: 'Uploaded marks transferred again', userId: req.user && req.user.id
        });
        await db.query(
          `UPDATE report_cards
           SET marks_breakdown = $1,
               overall_average = $2,
               overall_level = $3,
               promotion_status = $4,
               days_present = $5,
               days_absent = $6,
               total_days = $7,
               attendance_percentage = $8,
               class_name = $9,
               stream = $10,
               ai_advisory = $11,
               updated_at = NOW()
           WHERE id = $12`,
          [
            JSON.stringify(subjectBreakdown),
            overallAvg,
            overallCaps.level,
            promotionDecision,
            daysPresent,
            daysAbsent,
            totalDays,
            attPct,
            l.class_name,
            l.stream || stream,
            aiAdvisory ? JSON.stringify(aiAdvisory) : null,
            existRes.rows[0].id
          ]
        );
      } else {
        await db.query(
          `INSERT INTO report_cards (
             school_id, child_id, grade, class_name, stream, term, academic_year,
             marks_breakdown, overall_average, overall_level, promotion_status,
             days_present, days_absent, total_days, attendance_percentage,
             teacher_comment, principal_comment, principal_signature,
             ai_advisory, is_published, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, FALSE, NOW(), NOW())`,
          [
            schoolId,
            l.id,
            grade,
            l.class_name,
            l.stream || stream,
            termNum,
            academicYear,
            JSON.stringify(subjectBreakdown),
            overallAvg,
            overallCaps.level,
            promotionDecision,
            daysPresent,
            daysAbsent,
            totalDays,
            attPct,
            null,
            null,
            null,
            aiAdvisory ? JSON.stringify(aiAdvisory) : null
          ]
        );
      }
      transferredCount++;
    }

    res.json({
      success: true,
      message: `Successfully transferred uploaded marks for ${transferredCount} learners in Grade ${grade} (${className || 'All'}) into official report card templates! AI pathways and risk analysis calculated.`,
      transferred_count: transferredCount
    });
  } catch (err) {
    console.error('Error transferring teacher marks to template:', err);
    res.status(500).json({ success: false, error: 'Failed to transfer teacher marks: ' + err.message });
  }
};
