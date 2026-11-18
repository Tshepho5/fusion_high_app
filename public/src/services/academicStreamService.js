'use strict';

const db = require('../../../db/db');
const { withTransaction } = require('../../../db/transaction');
const rules = require('./nscCurriculum');

let schemaReady = null;

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db.query(`
      CREATE TABLE IF NOT EXISTS school_subject_offerings (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        academic_year INTEGER NOT NULL,
        grade INTEGER NOT NULL CHECK (grade BETWEEN 10 AND 12),
        subject_name VARCHAR(80) NOT NULL,
        category VARCHAR(20) NOT NULL CHECK (category IN ('language', 'mathematics', 'elective')),
        language_level VARCHAR(40) NOT NULL DEFAULT '',
        is_required BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS school_subject_offerings_unique
        ON school_subject_offerings (school_id, academic_year, grade, subject_name, language_level);
      CREATE INDEX IF NOT EXISTS school_subject_offerings_lookup
        ON school_subject_offerings (school_id, academic_year, grade, is_active);

      CREATE TABLE IF NOT EXISTS academic_streams (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        academic_year INTEGER NOT NULL,
        grade INTEGER NOT NULL CHECK (grade BETWEEN 10 AND 12),
        name VARCHAR(80) NOT NULL,
        mathematics_option VARCHAR(40) NOT NULL,
        electives TEXT[] NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        created_by INTEGER,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS academic_streams_active_name
        ON academic_streams (school_id, academic_year, grade, lower(name))
        WHERE status <> 'archived';
      CREATE INDEX IF NOT EXISTS academic_streams_lookup
        ON academic_streams (school_id, academic_year, grade, status);

      CREATE TABLE IF NOT EXISTS subject_change_approvals (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        id_number VARCHAR(20) NOT NULL,
        academic_year INTEGER NOT NULL,
        grade INTEGER NOT NULL,
        academic_stream_id INTEGER REFERENCES academic_streams(id) ON DELETE CASCADE,
        approved_by INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'applications') THEN
          ALTER TABLE applications ADD COLUMN IF NOT EXISTS first_additional_language VARCHAR(80);
          ALTER TABLE applications ADD COLUMN IF NOT EXISTS academic_stream_id INTEGER;
          ALTER TABLE applications ADD COLUMN IF NOT EXISTS subject_package JSONB;
        END IF;
      END $$;
    `).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function groupOfferings(rows) {
  const languages = [];
  const mathematics = [];
  const electives = [];
  rows.filter((row) => row.is_active !== false).forEach((row) => {
    if (row.category === 'language') {
      languages.push({ language: row.subject_name, level: row.language_level, required: row.is_required });
    } else if (row.category === 'mathematics') {
      mathematics.push(row.subject_name);
    } else if (row.category === 'elective') {
      electives.push(row.subject_name);
    }
  });
  return { languages, mathematics, electives };
}

async function readOfferings(schoolId, year, grade) {
  await ensureSchema();
  const result = await db.query(
    `SELECT subject_name, category, language_level, is_required, is_active
     FROM school_subject_offerings
     WHERE school_id = $1 AND academic_year = $2 AND grade = $3 AND is_active = TRUE
     ORDER BY category, subject_name, language_level`,
    [schoolId, year, grade]
  );
  return groupOfferings(result.rows);
}

async function saveOfferings(schoolId, actorId, input) {
  const checked = rules.validateOfferings(input);
  if (!checked.ok) {
    const error = new Error(checked.errors[0]);
    error.status = 400;
    error.errors = checked.errors;
    throw error;
  }
  await ensureSchema();
  const { academic_year: year, grade, languages, mathematics, electives } = checked.value;
  const published = await db.query(
    `SELECT name, mathematics_option, electives
     FROM academic_streams
     WHERE school_id = $1 AND academic_year = $2 AND grade = $3 AND status = 'published'`,
    [schoolId, year, grade]
  );
  published.rows.forEach((stream) => {
    const stillValid = rules.validateStream({
      name: stream.name,
      mathematics: stream.mathematics_option,
      electives: stream.electives
    }, { languages, mathematics, electives });
    if (!stillValid.ok) {
      const error = new Error(`Published stream ${stream.name} would become invalid. Archive it before removing those subjects.`);
      error.status = 400;
      throw error;
    }
  });

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE school_subject_offerings SET is_active = FALSE
       WHERE school_id = $1 AND academic_year = $2 AND grade = $3`,
      [schoolId, year, grade]
    );
    for (const row of languages) {
      await client.query(
        `INSERT INTO school_subject_offerings
          (school_id, academic_year, grade, subject_name, category, language_level, is_required, is_active)
         VALUES ($1, $2, $3, $4, 'language', $5, $6, TRUE)
         ON CONFLICT (school_id, academic_year, grade, subject_name, language_level)
         DO UPDATE SET is_required = EXCLUDED.is_required, is_active = TRUE`,
        [schoolId, year, grade, row.language, row.level, row.required]
      );
    }
    for (const subject of mathematics) {
      await client.query(
        `INSERT INTO school_subject_offerings
          (school_id, academic_year, grade, subject_name, category, language_level, is_active)
         VALUES ($1, $2, $3, $4, 'mathematics', '', TRUE)
         ON CONFLICT (school_id, academic_year, grade, subject_name, language_level)
         DO UPDATE SET is_active = TRUE`,
        [schoolId, year, grade, subject]
      );
    }
    for (const subject of electives) {
      await client.query(
        `INSERT INTO school_subject_offerings
          (school_id, academic_year, grade, subject_name, category, language_level, is_active)
         VALUES ($1, $2, $3, $4, 'elective', '', TRUE)
         ON CONFLICT (school_id, academic_year, grade, subject_name, language_level)
         DO UPDATE SET is_active = TRUE`,
        [schoolId, year, grade, subject]
      );
    }
  });
  return readOfferings(schoolId, year, grade);
}

function mapStream(row) {
  return {
    id: row.id,
    school_id: row.school_id,
    academic_year: row.academic_year,
    grade: row.grade,
    name: row.name,
    mathematics: row.mathematics_option,
    electives: row.electives,
    status: row.status
  };
}

async function listStreams(schoolId, year, grade, { publishedOnly } = {}) {
  await ensureSchema();
  const params = [schoolId];
  let sql = `SELECT * FROM academic_streams WHERE school_id = $1 AND status <> 'archived'`;
  if (year) {
    params.push(Number(year));
    sql += ` AND academic_year = $${params.length}`;
  }
  if (grade) {
    params.push(Number(grade));
    sql += ` AND grade = $${params.length}`;
  }
  if (publishedOnly) sql += ` AND status = 'published'`;
  sql += ' ORDER BY grade, name';
  const result = await db.query(sql, params);
  return result.rows.map(mapStream);
}

async function writeStream(schoolId, actorId, input, streamId) {
  await ensureSchema();
  const year = Number(input.academic_year);
  const grade = Number(input.grade);
  const offerings = await readOfferings(schoolId, year, grade);
  const checked = rules.validateStream(input, offerings);
  if (!checked.ok) {
    const error = new Error(checked.errors[0]);
    error.status = 400;
    error.errors = checked.errors;
    throw error;
  }
  if (streamId) {
    const existing = await db.query(
      `SELECT id, status FROM academic_streams WHERE id = $1 AND school_id = $2`,
      [streamId, schoolId]
    );
    if (!existing.rows.length) {
      const error = new Error('Stream not found.');
      error.status = 404;
      throw error;
    }
    const result = await db.query(
      `UPDATE academic_streams
       SET name = $1, academic_year = $2, grade = $3, mathematics_option = $4, electives = $5,
           status = CASE WHEN status = 'published' THEN 'draft' ELSE status END,
           updated_at = NOW()
       WHERE id = $6 AND school_id = $7
       RETURNING *`,
      [checked.value.name, year, grade, checked.value.mathematics, checked.value.electives, streamId, schoolId]
    );
    return mapStream(result.rows[0]);
  }
  const result = await db.query(
    `INSERT INTO academic_streams
      (school_id, academic_year, grade, name, mathematics_option, electives, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
     RETURNING *`,
    [schoolId, year, grade, checked.value.name, checked.value.mathematics, checked.value.electives, actorId || null]
  );
  return mapStream(result.rows[0]);
}

async function setStreamStatus(schoolId, streamId, status) {
  await ensureSchema();
  const existing = await db.query(
    `SELECT * FROM academic_streams WHERE id = $1 AND school_id = $2`,
    [streamId, schoolId]
  );
  if (!existing.rows.length) {
    const error = new Error('Stream not found.');
    error.status = 404;
    throw error;
  }
  const stream = existing.rows[0];
  if (status === 'published') {
    const offerings = await readOfferings(stream.school_id, stream.academic_year, stream.grade);
    const checked = rules.validateStream({
      name: stream.name,
      mathematics: stream.mathematics_option,
      electives: stream.electives
    }, offerings);
    if (!checked.ok) {
      const error = new Error(checked.errors[0]);
      error.status = 400;
      error.errors = checked.errors;
      throw error;
    }
  }
  const result = await db.query(
    `UPDATE academic_streams SET status = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3 RETURNING *`,
    [status, streamId, schoolId]
  );
  return mapStream(result.rows[0]);
}

async function assertSubjectContinuity(schoolId, idNumber, year, grade, electives, streamId) {
  const prior = await db.query(
    `SELECT selected_subjects, grade_applied
     FROM applications
     WHERE school_id = $1 AND id_number = $2 AND grade_applied < $3
       AND selected_subjects IS NOT NULL
     ORDER BY grade_applied DESC
     LIMIT 1`,
    [schoolId, idNumber, grade]
  );
  if (!prior.rows.length) return;
  const previous = rules.packageElectives(prior.rows[0].selected_subjects).map((item) => item.toLowerCase()).sort();
  const next = electives.map((item) => item.toLowerCase()).sort();
  if (previous.join('|') === next.join('|')) return;
  const approval = await db.query(
    `SELECT id FROM subject_change_approvals
     WHERE school_id = $1 AND id_number = $2 AND academic_year = $3 AND grade = $4 AND academic_stream_id = $5
     LIMIT 1`,
    [schoolId, idNumber, year, grade, streamId]
  );
  if (!approval.rows.length) {
    const error = new Error('A subject change needs approval from the school before this stream can be selected.');
    error.status = 409;
    throw error;
  }
}

async function resolveApplicantPackage(input) {
  await ensureSchema();
  const schoolId = Number(input.schoolId);
  const grade = Number(input.grade);
  const year = Number(input.academicYear);
  const streamId = Number(input.streamId);
  if (![10, 11, 12].includes(grade)) {
    const error = new Error('Grades 10, 11 and 12 use the published subject streams.');
    error.status = 400;
    throw error;
  }
  const offerings = await readOfferings(schoolId, year, grade);
  const streams = await listStreams(schoolId, year, grade, { publishedOnly: true });
  if (!streams.length) {
    const error = new Error('Subject streams have not yet been made available by this school. Please contact the school for assistance.');
    error.status = 400;
    error.empty = true;
    throw error;
  }
  const stream = streams.find((item) => item.id === streamId);
  if (!stream) {
    const error = new Error('Select a published stream for this school, grade and academic year.');
    error.status = 400;
    throw error;
  }
  const languages = rules.validateLanguageChoice(input.homeLanguage, input.additionalLanguage, offerings);
  if (!languages.ok) {
    const error = new Error(languages.errors[0]);
    error.status = 400;
    error.errors = languages.errors;
    throw error;
  }
  await assertSubjectContinuity(schoolId, String(input.idNumber || '').trim(), year, grade, stream.electives, stream.id);
  const subjectPackage = rules.buildPackage({
    homeLanguage: languages.home,
    additionalLanguage: languages.additional,
    stream
  });
  if (subjectPackage.count !== 7) {
    const error = new Error('The subject package must contain seven subjects.');
    error.status = 400;
    throw error;
  }
  return {
    streamName: stream.name,
    streamId: stream.id,
    homeLanguage: languages.home,
    additionalLanguage: languages.additional,
    subjectPackage,
    selectedSubjects: subjectPackage.subjects
  };
}

async function approveSubjectChange(schoolId, actorId, input) {
  await ensureSchema();
  const result = await db.query(
    `INSERT INTO subject_change_approvals
      (school_id, id_number, academic_year, grade, academic_stream_id, approved_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [schoolId, String(input.id_number || '').trim(), Number(input.academic_year), Number(input.grade), Number(input.academic_stream_id), actorId || null]
  );
  return result.rows[0];
}

async function configurationSummary(schoolId, year) {
  await ensureSchema();
  const offerings = await db.query(
    `SELECT grade, COUNT(*)::int AS total
     FROM school_subject_offerings
     WHERE school_id = $1 AND academic_year = $2 AND is_active = TRUE
     GROUP BY grade ORDER BY grade`,
    [schoolId, year]
  );
  const streams = await db.query(
    `SELECT grade, status, COUNT(*)::int AS total
     FROM academic_streams
     WHERE school_id = $1 AND academic_year = $2 AND status <> 'archived'
     GROUP BY grade, status ORDER BY grade`,
    [schoolId, year]
  );
  return { offerings: offerings.rows, streams: streams.rows };
}

module.exports = {
  ensureSchema,
  readOfferings,
  saveOfferings,
  listStreams,
  writeStream,
  setStreamStatus,
  resolveApplicantPackage,
  approveSubjectChange,
  configurationSummary,
  catalogue: {
    languages: rules.OFFICIAL_LANGUAGES,
    electives: rules.ELECTIVE_CATALOGUE,
    mathematics: [rules.MATHEMATICS, rules.MATHEMATICAL_LITERACY],
    life_orientation: rules.LIFE_ORIENTATION
  }
};
