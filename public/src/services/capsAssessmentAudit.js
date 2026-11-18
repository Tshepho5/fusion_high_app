'use strict';

function database() {
  return require('../../../db/db');
}

const COMPLIANT_STATUSES = new Set(['approved', 'verified']);
const MODERATION_STATUSES = ['Approved', 'Verified', 'Under Review', 'Discrepancy Flagged'];

const LEVELS = [
  { key: 'level7', min: 80, label: 'Level 7 (Outstanding)', band: '80-100%' },
  { key: 'level6', min: 70, label: 'Level 6 (Meritorious)', band: '70-79%' },
  { key: 'level5', min: 60, label: 'Level 5 (Substantial)', band: '60-69%' },
  { key: 'level4', min: 50, label: 'Level 4 (Adequate)', band: '50-59%' },
  { key: 'level3', min: 40, label: 'Level 3 (Moderate)', band: '40-49%' },
  { key: 'level2', min: 30, label: 'Level 2 (Elementary)', band: '30-39%' },
  { key: 'level1', min: 0, label: 'Level 1 (Not Achieved)', band: '0-29%' }
];

let moderationReady = null;

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function percentageOf({ percentage, score, maxScore, storedPercentage }) {
  const direct = finiteNumber(percentage);
  if (direct !== null) return Math.round(direct);
  const raw = finiteNumber(score);
  const max = finiteNumber(maxScore);
  if (raw !== null && max !== null && max > 0) return Math.round((raw / max) * 100);
  const stored = finiteNumber(storedPercentage);
  if (stored !== null) return Math.round(stored);
  return null;
}

function capsLevel(percentage) {
  if (percentage === null || percentage === undefined || Number.isNaN(Number(percentage))) return null;
  const score = Number(percentage);
  if (score < 0) return null;
  return LEVELS.find((level) => score >= level.min) || LEVELS[LEVELS.length - 1];
}

function emptyLevels() {
  return { level7: 0, level6: 0, level5: 0, level4: 0, level3: 0, level2: 0, level1: 0 };
}

function termNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  const labelled = text.match(/term\s*([1-4])/i);
  if (labelled) return parseInt(labelled[1], 10);
  const digits = text.match(/\d+/);
  if (!digits) return null;
  const number = parseInt(digits[0], 10);
  if (number >= 1 && number <= 4) return number;
  // Teacher mark rows store "Term 3 2026" with the spaces removed, which becomes 32026.
  if (/^[1-4]20\d{2}$/.test(String(number))) return parseInt(String(number)[0], 10);
  return null;
}

function termLabel(value) {
  const number = termNumber(value);
  if (number) return `Term ${number}`;
  const text = String(value || '').trim();
  return text || null;
}

function isCompliantStatus(status) {
  return COMPLIANT_STATUSES.has(String(status || '').trim().toLowerCase());
}

function normaliseStatus(status) {
  const found = MODERATION_STATUSES.find((item) => item.toLowerCase() === String(status || '').trim().toLowerCase());
  return found || null;
}

function taskKey(title) {
  return String(title || '').trim().toLowerCase().replace(/\s*\(\d+%\)\s*$/, '');
}

function recordKey(row) {
  return [
    row.child_id,
    String(row.subject || '').trim().toLowerCase(),
    termNumber(row.term_raw) || row.term_number || '',
    taskKey(row.task_title)
  ].join('|');
}

function toRecord(row, source) {
  const percentage = percentageOf({
    percentage: row.percentage,
    score: row.score,
    maxScore: row.max_score,
    storedPercentage: source === 'progress' ? row.grade_percentage : null
  });
  const level = capsLevel(percentage);
  const name = [row.full_name, row.surname].filter(Boolean).join(' ').trim();
  const title = String(row.task_title || row.assessment_name || '').trim();
  const termRaw = row.term_raw !== undefined && row.term_raw !== null && row.term_raw !== '' ? row.term_raw : row.term;
  return {
    id: `${source}-${row.id}`,
    source_id: row.id,
    source,
    child_id: row.child_id,
    learner_name: name || 'Learner',
    learner_number: row.learner_number || '',
    grade: row.learner_grade,
    stream: row.stream || '',
    class_name: row.class_name || (row.learner_grade ? `Grade ${row.learner_grade}` : ''),
    subject: String(row.subject || '').trim(),
    score: percentage,
    term: termLabel(termRaw),
    term_number: termNumber(termRaw),
    task_title: title || 'Untitled assessment',
    date: row.recorded_at || null,
    caps_level: level ? level.label : null,
    caps_key: level ? level.key : null
  };
}

function mergeRecords(markRows, progressRows) {
  const marks = (markRows || []).map((row) => toRecord(row, 'mark'));
  const seen = new Set(marks.map(recordKey));
  const progress = (progressRows || [])
    .map((row) => toRecord(row, 'progress'))
    .filter((row) => !seen.has(recordKey(row)));
  return marks.concat(progress).sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });
}

function summarise(records) {
  const scored = records.filter((row) => row.score !== null && row.score !== undefined);
  const levels = emptyLevels();
  scored.forEach((row) => {
    if (row.caps_key && Object.prototype.hasOwnProperty.call(levels, row.caps_key)) levels[row.caps_key] += 1;
  });
  const passed = scored.filter((row) => row.score >= 50).length;
  return {
    total_assessments_recorded: records.length,
    scored_assessments: scored.length,
    school_average_mark: scored.length ? Math.round(scored.reduce((sum, row) => sum + row.score, 0) / scored.length) : null,
    sba_pass_rate: scored.length ? Math.round((passed / scored.length) * 100) : null,
    levels_distribution: levels
  };
}

function moderationKey(subject, grade, term) {
  return `${String(subject || '').trim().toLowerCase()}|${parseInt(grade, 10) || ''}|${term || ''}`;
}

function buildSchedules(records, moderationRows, termScope) {
  const moderation = new Map();
  (moderationRows || []).forEach((row) => {
    moderation.set(moderationKey(row.subject, row.grade, row.term_label || ''), row);
  });
  const groups = new Map();
  records.forEach((row) => {
    const key = `${row.subject}|${row.grade}`;
    if (!groups.has(key)) {
      groups.set(key, {
        subject: row.subject,
        grade: row.grade,
        records: []
      });
    }
    groups.get(key).records.push(row);
  });

  return Array.from(groups.values()).map((group) => {
    const scored = group.records.filter((row) => row.score !== null && row.score !== undefined);
    const passed = scored.filter((row) => row.score >= 50).length;
    const saved = moderation.get(moderationKey(group.subject, group.grade, termScope || ''));
    const status = saved ? saved.status : 'Not moderated';
    const latest = group.records.find((row) => row.date);
    return {
      subject: group.subject,
      grade: group.grade,
      assessments_count: group.records.length,
      average_mark: scored.length ? Math.round(scored.reduce((sum, row) => sum + row.score, 0) / scored.length) : null,
      pass_rate: scored.length ? Math.round((passed / scored.length) * 100) : null,
      moderation_status: status,
      compliant: isCompliantStatus(status),
      moderated_by: saved ? (saved.moderated_by_name || '') : '',
      last_updated: saved ? saved.moderated_at : (latest ? latest.date : null),
      feedback: saved ? saved.feedback : ''
    };
  }).sort((a, b) => String(a.subject).localeCompare(String(b.subject)) || (a.grade || 0) - (b.grade || 0));
}

function assembleAudit({ markRows, progressRows, moderationRows, offeringNames, termScope }) {
  const records = mergeRecords(markRows, progressRows).map((row) => ({ ...row }));
  const schedules = buildSchedules(records, moderationRows, termScope || '');
  const statusBySchedule = new Map(schedules.map((item) => [`${item.subject}|${item.grade}`, item.moderation_status]));
  records.forEach((row) => {
    row.moderation_status = statusBySchedule.get(`${row.subject}|${row.grade}`) || 'Not moderated';
  });
  const summary = summarise(records);
  const compliant = schedules.filter((item) => item.compliant).length;
  summary.compliance_rate = schedules.length ? Math.round((compliant / schedules.length) * 100) : null;
  summary.total_subjects_audited = schedules.length;
  const names = new Set();
  (offeringNames || []).forEach((name) => {
    const clean = String(name || '').trim();
    if (clean) names.add(clean);
  });
  records.forEach((row) => {
    if (row.subject) names.add(row.subject);
  });
  return {
    summary,
    subjects: Array.from(names).sort((a, b) => a.localeCompare(b)),
    subject_schedules: schedules,
    records
  };
}

function readAuditFilters(query) {
  const grade = parseInt(query && query.grade, 10);
  const subject = String((query && query.subject) || '').trim();
  const term = termNumber(query && query.term);
  const search = String((query && query.search) || '').trim().slice(0, 80);
  return {
    grade: Number.isInteger(grade) && grade >= 8 && grade <= 12 ? grade : null,
    subject: subject && subject.toLowerCase() !== 'all' ? subject.slice(0, 120) : '',
    term: term && term >= 1 && term <= 4 ? term : null,
    termScope: term && term >= 1 && term <= 4 ? `Term ${term}` : '',
    search
  };
}

const MARKS_SQL = `
  SELECT m.id,
         COALESCE(m.child_id, m.learner_id) AS child_id,
         COALESCE(NULLIF(m.subject, ''), m.subject_name) AS subject,
         m.score, m.max_score, m.percentage,
         m.term AS term_raw,
         COALESCE(NULLIF(m.assessment_name, ''), NULLIF(m.assessment_type, ''), NULLIF(m.mark_type, '')) AS task_title,
         COALESCE(m.updated_at, m.recorded_at) AS recorded_at,
         c.full_name, c.surname, c.learner_number, c.grade AS learner_grade, c.stream,
         COALESCE(cl.name, CASE WHEN c.grade IS NULL THEN '' ELSE 'Grade ' || c.grade END) AS class_name
  FROM marks m
  JOIN children c ON c.id = COALESCE(m.child_id, m.learner_id)
  LEFT JOIN classes cl ON c.class_id = cl.id AND cl.school_id = c.school_id
  WHERE c.school_id = $1
`;

const PROGRESS_SQL = `
  SELECT p.id, p.child_id, p.subject, p.score, p.total_marks AS max_score,
         p.grade AS grade_percentage, p.term AS term_raw,
         COALESCE(NULLIF(p.assessment_name, ''), NULLIF(p.assessment_type, ''), NULLIF(p.notes, '')) AS task_title,
         COALESCE(p.updated_at, p.date) AS recorded_at,
         c.full_name, c.surname, c.learner_number, c.grade AS learner_grade, c.stream,
         COALESCE(cl.name, CASE WHEN c.grade IS NULL THEN '' ELSE 'Grade ' || c.grade END) AS class_name
  FROM progress p
  JOIN children c ON p.child_id = c.id
  LEFT JOIN classes cl ON c.class_id = cl.id AND cl.school_id = c.school_id
  WHERE c.school_id = $1
`;

function marksQuery(schoolId, filters) {
  let sql = MARKS_SQL;
  const params = [schoolId];
  if (filters.grade) {
    params.push(filters.grade);
    sql += ` AND c.grade = $${params.length}`;
  }
  if (filters.subject) {
    params.push(filters.subject);
    sql += ` AND LOWER(TRIM(COALESCE(NULLIF(m.subject, ''), m.subject_name, ''))) = LOWER($${params.length})`;
  }
  if (filters.term) {
    params.push(filters.term);
    sql += ` AND (
      m.term::text = $${params.length}::text
      OR m.term::text = ('Term ' || $${params.length}::text)
      OR m.term::text LIKE ($${params.length}::text || '20%')
    )`;
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const index = params.length;
    sql += ` AND (
      c.full_name ILIKE $${index} OR c.surname ILIKE $${index}
      OR CONCAT(c.full_name, ' ', c.surname) ILIKE $${index}
      OR COALESCE(c.learner_number, '') ILIKE $${index}
    )`;
  }
  sql += ' ORDER BY COALESCE(m.updated_at, m.recorded_at) DESC NULLS LAST, m.id DESC';
  return { sql, params };
}

function progressQuery(schoolId, filters) {
  let sql = PROGRESS_SQL;
  const params = [schoolId];
  if (filters.grade) {
    params.push(filters.grade);
    sql += ` AND c.grade = $${params.length}`;
  }
  if (filters.subject) {
    params.push(filters.subject);
    sql += ` AND LOWER(TRIM(COALESCE(p.subject, ''))) = LOWER($${params.length})`;
  }
  if (filters.term) {
    params.push(filters.term);
    params.push(`Term ${filters.term}`);
    sql += ` AND (
      p.term = $${params.length - 1}::text
      OR LOWER(TRIM(p.term)) = LOWER($${params.length})
      OR p.term ~* ('^Term[[:space:]]+' || $${params.length - 1}::text || '([^0-9]|$)')
    )`;
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const index = params.length;
    sql += ` AND (
      c.full_name ILIKE $${index} OR c.surname ILIKE $${index}
      OR CONCAT(c.full_name, ' ', c.surname) ILIKE $${index}
      OR COALESCE(c.learner_number, '') ILIKE $${index}
    )`;
  }
  sql += ' ORDER BY COALESCE(p.updated_at, p.date) DESC NULLS LAST, p.id DESC';
  return { sql, params };
}

async function ensureModerationTable() {
  if (!moderationReady) {
    moderationReady = database().query(`
      CREATE TABLE IF NOT EXISTS sba_moderation_batches (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL,
        subject VARCHAR(150) NOT NULL,
        subject_key VARCHAR(150) NOT NULL,
        grade INTEGER NOT NULL,
        term_label VARCHAR(40) NOT NULL DEFAULT '',
        status VARCHAR(40) NOT NULL,
        feedback TEXT,
        moderated_by INTEGER,
        moderated_by_name VARCHAR(200),
        moderated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (school_id, subject_key, grade, term_label)
      );
    `);
  }
  await moderationReady;
}

async function listModeration(schoolId) {
  await ensureModerationTable();
  const result = await database().query(
    `SELECT subject, grade, term_label, status, feedback, moderated_by_name, moderated_at
     FROM sba_moderation_batches
     WHERE school_id = $1`,
    [schoolId]
  );
  return result.rows;
}

async function saveModeration({ schoolId, subject, grade, termLabel: label, status, feedback, userId, userName }) {
  await ensureModerationTable();
  const cleanStatus = normaliseStatus(status);
  if (!cleanStatus) {
    const error = new Error('Choose a moderation status.');
    error.status = 400;
    throw error;
  }
  const cleanSubject = String(subject || '').trim();
  const cleanGrade = parseInt(grade, 10);
  if (!cleanSubject || !Number.isInteger(cleanGrade) || cleanGrade < 8 || cleanGrade > 12) {
    const error = new Error('A subject and a grade from 8 to 12 are required.');
    error.status = 400;
    throw error;
  }
  const term = String(label || '').trim().slice(0, 40);
  const note = String(feedback || '').trim().slice(0, 2000);
  const saved = await database().query(
    `INSERT INTO sba_moderation_batches (
       school_id, subject, subject_key, grade, term_label, status, feedback, moderated_by, moderated_by_name, moderated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (school_id, subject_key, grade, term_label)
     DO UPDATE SET status = EXCLUDED.status,
                   feedback = EXCLUDED.feedback,
                   moderated_by = EXCLUDED.moderated_by,
                   moderated_by_name = EXCLUDED.moderated_by_name,
                   moderated_at = NOW(),
                   subject = EXCLUDED.subject
     RETURNING status, moderated_at`,
    [schoolId, cleanSubject, cleanSubject.toLowerCase(), cleanGrade, term, cleanStatus, note, userId || null, userName || '']
  );
  return saved.rows[0];
}

module.exports = {
  LEVELS,
  MARKS_SQL,
  PROGRESS_SQL,
  percentageOf,
  capsLevel,
  termNumber,
  isCompliantStatus,
  normaliseStatus,
  mergeRecords,
  summarise,
  buildSchedules,
  assembleAudit,
  readAuditFilters,
  marksQuery,
  progressQuery,
  listModeration,
  saveModeration
};
