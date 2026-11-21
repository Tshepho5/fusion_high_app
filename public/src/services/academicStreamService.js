'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../../../db/db');
const { withTransaction } = require('../../../db/transaction');
const rules = require('./nscCurriculum');

const CURRICULUM_MIGRATION_PATH = path.join(
  __dirname,
  '../../../db/migrations/20261121_curriculum_grades_8_12_upgrade.sql'
);

/**
 * Explicit schema migration helper for isolated tests and controlled maintenance scripts ONLY.
 * Never called implicitly inside normal HTTP GET/PUT/POST request handlers.
 */
async function ensureSchema(executor = db) {
  const sql = fs.readFileSync(CURRICULUM_MIGRATION_PATH, 'utf8');
  await executor.query(sql);
}

const wrapSchemaError = rules.wrapCurriculumSchemaError;

function groupOfferings(rows) {
  const languages = [];
  const mathematics = [];
  const electives = [];
  const seenLang = new Set();
  const seenMath = new Set();
  const seenElective = new Set();
  rows.filter((row) => row.is_active !== false).forEach((row) => {
    const name = String(row.subject_name || '').trim();
    if (!name) return;
    if (row.category === 'language') {
      const level = rules.normalizeLanguageLevel(row.language_level);
      const key = `${name.toLowerCase()}|${level.toLowerCase()}`;
      if (seenLang.has(key)) return;
      seenLang.add(key);
      languages.push({ language: name, level, required: Boolean(row.is_required) });
    } else if (row.category === 'mathematics') {
      const key = name.toLowerCase();
      if (seenMath.has(key)) return;
      seenMath.add(key);
      mathematics.push(name);
    } else if (row.category === 'elective') {
      const key = name.toLowerCase();
      if (seenElective.has(key)) return;
      seenElective.add(key);
      electives.push(name);
    }
  });
  return { languages, mathematics, electives };
}

async function readOfferings(schoolId, year, grade) {
  try {
    const result = await db.query(
      `SELECT subject_name, category, language_level, is_required, is_active
       FROM school_subject_offerings
       WHERE school_id = $1 AND academic_year = $2 AND grade = $3 AND is_active = TRUE
       ORDER BY category, subject_name, language_level`,
      [schoolId, year, grade]
    );
    return groupOfferings(result.rows);
  } catch (error) {
    wrapSchemaError(error, 'readOfferings');
  }
}

async function getConfiguredYears(schoolId) {
  try {
    const res = await db.query(
      `SELECT DISTINCT academic_year
       FROM (
         SELECT academic_year FROM school_subject_offerings WHERE school_id = $1 AND is_active = TRUE
         UNION
         SELECT academic_year FROM academic_streams WHERE school_id = $1 AND status <> 'archived'
       ) years
       ORDER BY academic_year DESC`,
      [Number(schoolId)]
    );
    return res.rows.map((r) => Number(r.academic_year)).filter((y) => Number.isInteger(y));
  } catch (error) {
    wrapSchemaError(error, 'getConfiguredYears');
  }
}

async function readAllGradeOfferings(schoolId, year) {
  try {
    const result = await db.query(
      `SELECT grade, subject_name, category, language_level, is_required, is_active
       FROM school_subject_offerings
       WHERE school_id = $1 AND academic_year = $2 AND is_active = TRUE
       ORDER BY grade, category, subject_name, language_level`,
      [Number(schoolId), Number(year)]
    );
    const byGrade = {};
    for (const g of [8, 9, 10, 11, 12]) {
      byGrade[g] = groupOfferings(result.rows.filter((r) => Number(r.grade) === g));
    }
    return byGrade;
  } catch (error) {
    wrapSchemaError(error, 'readAllGradeOfferings');
  }
}

async function getSchoolRegistrationProfile(schoolId) {
  try {
    const res = await db.query(
      'SELECT offered_languages, offered_subjects, offered_streams FROM schools WHERE id = $1 LIMIT 1',
      [Number(schoolId)]
    );
    const row = res.rows[0];
    if (!row) return { languages: [], mathematics: [], electives: [], streams: [] };
    const parsedLangs = rules.parseSchoolOfferedLanguages(row.offered_languages);
    const parsedSubs = rules.parseSchoolOfferedSubjects(row.offered_subjects);
    const mergedLangs = [...parsedLangs];
    const seen = new Set(mergedLangs.map((l) => `${l.language.toLowerCase()}|${l.level.toLowerCase()}`));
    for (const extra of parsedSubs.languages) {
      const k = `${extra.language.toLowerCase()}|${extra.level.toLowerCase()}`;
      if (!seen.has(k)) {
        seen.add(k);
        mergedLangs.push(extra);
      }
    }
    let streams = [];
    if (Array.isArray(row.offered_streams)) {
      streams = row.offered_streams.filter(Boolean);
    } else if (typeof row.offered_streams === 'string' && row.offered_streams.trim()) {
      try {
        const p = JSON.parse(row.offered_streams);
        streams = Array.isArray(p) ? p.filter(Boolean) : row.offered_streams.split(',').map((s) => s.trim()).filter(Boolean);
      } catch (_) {
        streams = row.offered_streams.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return {
      languages: mergedLangs,
      mathematics: parsedSubs.mathematics,
      electives: parsedSubs.electives,
      streams
    };
  } catch (_) {
    return { languages: [], mathematics: [], electives: [], streams: [] };
  }
}

async function syncSchoolProfileCurriculum(schoolId) {
  try {
    const sId = Number(schoolId);
    const years = await getConfiguredYears(sId);
    if (!years.length) return;
    const latestYear = years[0];
    const [offRes, streamRes] = await Promise.all([
      db.query(
        `SELECT subject_name, category, language_level
         FROM school_subject_offerings
         WHERE school_id = $1 AND academic_year = $2 AND is_active = TRUE
         ORDER BY category, subject_name`,
        [sId, latestYear]
      ),
      db.query(
        `SELECT DISTINCT name
         FROM academic_streams
         WHERE school_id = $1 AND academic_year = $2 AND status <> 'archived'
         ORDER BY name`,
        [sId, latestYear]
      )
    ]);

    const langs = [];
    const seenLang = new Set();
    const subjects = [];
    const seenSub = new Set();

    for (const row of offRes.rows) {
      const name = String(row.subject_name || '').trim();
      if (!name) continue;
      if (row.category === 'language') {
        const level = rules.normalizeLanguageLevel(row.language_level);
        const label = level ? `${name} ${level}` : name;
        if (!seenLang.has(label.toLowerCase())) {
          seenLang.add(label.toLowerCase());
          langs.push(label);
        }
      } else {
        if (!seenSub.has(name.toLowerCase())) {
          seenSub.add(name.toLowerCase());
          subjects.push(name);
        }
      }
    }
    if (!seenSub.has(rules.LIFE_ORIENTATION.toLowerCase())) {
      subjects.push(rules.LIFE_ORIENTATION);
    }

    const streamNames = streamRes.rows.map((r) => String(r.name || '').trim()).filter(Boolean);

    const updates = [];
    const params = [];
    if (langs.length) {
      params.push(langs);
      updates.push(`offered_languages = $${params.length}`);
    }
    if (subjects.length) {
      params.push(subjects);
      updates.push(`offered_subjects = $${params.length}`);
    }
    if (streamNames.length) {
      params.push(streamNames);
      updates.push(`offered_streams = $${params.length}`);
    }
    if (!updates.length) return;
    params.push(sId);
    await db.query(
      `UPDATE schools SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );
  } catch (_) {
    // Minimal test schemas may omit schools.offered_* columns; ignore safely.
  }
}

async function seedOfferingsFromSchoolProfile(client, schoolId, { offeredLanguages, offeredSubjects, year } = {}) {
  const tableCheck = await client.query(`SELECT to_regclass('public.school_subject_offerings') AS tbl`);
  if (!tableCheck.rows[0]?.tbl) return;
  const academicYear = Number(year) || new Date().getFullYear();
  const parsedLangs = rules.parseSchoolOfferedLanguages(offeredLanguages);
  const parsedSubs = rules.parseSchoolOfferedSubjects(offeredSubjects);

  const mergedLangs = [...parsedLangs];
  const seenLang = new Set(mergedLangs.map((l) => `${l.language.toLowerCase()}|${l.level.toLowerCase()}`));
  for (const extra of parsedSubs.languages) {
    const key = `${extra.language.toLowerCase()}|${extra.level.toLowerCase()}`;
    if (!seenLang.has(key)) {
      seenLang.add(key);
      mergedLangs.push(extra);
    }
  }
  if (!mergedLangs.length && !parsedSubs.mathematics.length && !parsedSubs.electives.length) return;

  for (const grade of [8, 9, 10, 11, 12]) {
    const isSenior = grade === 8 || grade === 9;
    for (const lang of mergedLangs) {
      await client.query(
        `INSERT INTO school_subject_offerings
          (school_id, academic_year, grade, stream_name, subject_name, category, language_level, is_required, is_active)
         VALUES ($1, $2, $3, '', $4, 'language', $5, FALSE, TRUE)
         ON CONFLICT (school_id, academic_year, grade, stream_name, subject_name, language_level)
         DO NOTHING`,
        [schoolId, academicYear, grade, lang.language, lang.level]
      );
    }
    if (isSenior) {
      for (const core of rules.SENIOR_PHASE_COMPULSORY) {
        const category = core === rules.MATHEMATICS ? 'mathematics' : 'elective';
        await client.query(
          `INSERT INTO school_subject_offerings
            (school_id, academic_year, grade, stream_name, subject_name, category, language_level, is_required, is_active)
           VALUES ($1, $2, $3, '', $4, $5, '', TRUE, TRUE)
           ON CONFLICT (school_id, academic_year, grade, stream_name, subject_name, language_level)
           DO NOTHING`,
          [schoolId, academicYear, grade, core, category]
        );
      }
    } else {
      for (const math of parsedSubs.mathematics) {
        await client.query(
          `INSERT INTO school_subject_offerings
            (school_id, academic_year, grade, stream_name, subject_name, category, language_level, is_active)
           VALUES ($1, $2, $3, '', $4, 'mathematics', '', TRUE)
           ON CONFLICT (school_id, academic_year, grade, stream_name, subject_name, language_level)
           DO NOTHING`,
          [schoolId, academicYear, grade, math]
        );
      }
      for (const elective of parsedSubs.electives) {
        await client.query(
          `INSERT INTO school_subject_offerings
            (school_id, academic_year, grade, stream_name, subject_name, category, language_level, is_active)
           VALUES ($1, $2, $3, '', $4, 'elective', '', TRUE)
           ON CONFLICT (school_id, academic_year, grade, stream_name, subject_name, language_level)
           DO NOTHING`,
          [schoolId, academicYear, grade, elective]
        );
      }
    }
  }
}

const { parseSchoolOfferedLanguages } = rules;

/**
 * Reads languages offered by a school for applicants, cascading cleanly:
 * 1. school_subject_offerings for exact (schoolId, year, grade)
 * 2. school_subject_offerings for latest configured year of (schoolId, grade)
 * 3. school_subject_offerings for latest configured year across any grade of schoolId
 * 4. schools.offered_languages saved during school registration / curriculum setup
 */
async function readApplicantLanguages(schoolId, year, grade) {
  const sId = Number(schoolId);
  const yNum = Number(year) || null;
  const gNum = Number(grade) || null;

  if (yNum && gNum) {
    const exact = await readOfferings(sId, yNum, gNum);
    if (exact.languages.length > 0) {
      return { languages: exact.languages, mathematics: exact.mathematics, source: 'offerings_exact', year: yNum };
    }
  }

  try {
    if (gNum) {
      const sameGradeAnyYear = await db.query(
        `SELECT academic_year, subject_name, category, language_level, is_required, is_active
         FROM school_subject_offerings
         WHERE school_id = $1 AND grade = $2 AND is_active = TRUE
         ORDER BY academic_year DESC, category, subject_name, language_level`,
        [sId, gNum]
      );
      if (sameGradeAnyYear.rows.length > 0) {
        const latestYear = Number(sameGradeAnyYear.rows[0].academic_year);
        const grouped = groupOfferings(sameGradeAnyYear.rows.filter((r) => Number(r.academic_year) === latestYear));
        if (grouped.languages.length > 0) {
          return { languages: grouped.languages, mathematics: grouped.mathematics, source: 'offerings_latest_year', year: latestYear };
        }
      }
    }

    const anyGrade = await db.query(
      `SELECT academic_year, subject_name, category, language_level, is_required, is_active
       FROM school_subject_offerings
       WHERE school_id = $1 AND is_active = TRUE AND category = 'language'
       ORDER BY academic_year DESC, subject_name, language_level`,
      [sId]
    );
    if (anyGrade.rows.length > 0) {
      const latestYear = Number(anyGrade.rows[0].academic_year);
      const dedup = [];
      const seen = new Set();
      for (const row of anyGrade.rows.filter((r) => Number(r.academic_year) === latestYear)) {
        const level = rules.normalizeLanguageLevel(row.language_level);
        const key = `${String(row.subject_name).toLowerCase()}|${level.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push({ language: row.subject_name, level, required: Boolean(row.is_required) });
      }
      if (dedup.length > 0) {
        return { languages: dedup, mathematics: [], source: 'offerings_school_wide', year: latestYear };
      }
    }
  } catch (error) {
    wrapSchemaError(error, 'readApplicantLanguages');
  }

  try {
    const schoolRes = await db.query(
      'SELECT offered_languages FROM schools WHERE id = $1 LIMIT 1',
      [sId]
    );
    const parsed = parseSchoolOfferedLanguages(schoolRes.rows[0]?.offered_languages);
    if (parsed.length > 0) {
      return { languages: parsed, mathematics: [], source: 'school_profile', year: yNum };
    }
  } catch (error) {
    if (error && error.code === '42703') {
      // Minimal unit-test schemas omit schools.offered_languages; treat as absent school profile only.
    } else {
      throw error;
    }
  }

  return { languages: [], mathematics: [], source: 'unconfigured', year: yNum };
}

async function saveOfferings(schoolId, actorId, input) {
  const targetGrades = Array.isArray(input.apply_to_grades) && input.apply_to_grades.length
    ? [...new Set(input.apply_to_grades.map(Number).filter((g) => [8, 9, 10, 11, 12].includes(g)))]
    : [Number(input.grade)];

  const validatedByGrade = [];
  for (const targetGrade of targetGrades) {
    const checked = rules.validateOfferings({ ...input, grade: targetGrade });
    if (!checked.ok) {
      const error = new Error(checked.errors[0]);
      error.status = 400;
      error.errors = checked.errors;
      throw error;
    }
    validatedByGrade.push(checked.value);
  }

  try {
    for (const { academic_year: year, grade, languages, mathematics, electives } of validatedByGrade) {
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
          const error = new Error(`Published stream ${stream.name} (Grade ${grade}) would become invalid. Archive it before removing those subjects.`);
          error.status = 400;
          throw error;
        }
      });
    }

    await withTransaction(async (client) => {
      for (const { academic_year: year, grade, languages, mathematics, electives } of validatedByGrade) {
        await client.query(
          `UPDATE school_subject_offerings SET is_active = FALSE
           WHERE school_id = $1 AND academic_year = $2 AND grade = $3`,
          [schoolId, year, grade]
        );
        for (const row of languages) {
          await client.query(
            `INSERT INTO school_subject_offerings
              (school_id, academic_year, grade, stream_name, subject_name, category, language_level, is_required, is_active)
             VALUES ($1, $2, $3, '', $4, 'language', $5, $6, TRUE)
             ON CONFLICT (school_id, academic_year, grade, stream_name, subject_name, language_level)
             DO UPDATE SET is_required = EXCLUDED.is_required, is_active = TRUE`,
            [schoolId, year, grade, row.language, row.level, row.required]
          );
        }
        for (const subject of mathematics) {
          await client.query(
            `INSERT INTO school_subject_offerings
              (school_id, academic_year, grade, stream_name, subject_name, category, language_level, is_active)
             VALUES ($1, $2, $3, '', $4, 'mathematics', '', TRUE)
             ON CONFLICT (school_id, academic_year, grade, stream_name, subject_name, language_level)
             DO UPDATE SET is_active = TRUE`,
            [schoolId, year, grade, subject]
          );
        }
        for (const subject of electives) {
          await client.query(
            `INSERT INTO school_subject_offerings
              (school_id, academic_year, grade, stream_name, subject_name, category, language_level, is_active)
             VALUES ($1, $2, $3, '', $4, 'elective', '', TRUE)
             ON CONFLICT (school_id, academic_year, grade, stream_name, subject_name, language_level)
             DO UPDATE SET is_active = TRUE`,
            [schoolId, year, grade, subject]
          );
        }
      }
    });
  } catch (error) {
    wrapSchemaError(error, 'saveOfferings');
  }
  await syncSchoolProfileCurriculum(schoolId);
  const primary = validatedByGrade[0];
  return readOfferings(schoolId, primary.academic_year, primary.grade);
}

async function copyYearConfiguration(schoolId, actorId, sourceYear, targetYear) {
  const sId = Number(schoolId);
  const fromYear = Number(sourceYear);
  const toYear = Number(targetYear);
  if (!Number.isInteger(fromYear) || !Number.isInteger(toYear) || fromYear === toYear || toYear < 2020 || toYear > 2100) {
    const err = new Error('Choose a valid source year and different target academic year.');
    err.status = 400;
    throw err;
  }

  let srcOfferings;
  let srcStreams;
  try {
    [srcOfferings, srcStreams] = await Promise.all([
      db.query(
        `SELECT grade, stream_name, subject_name, category, language_level, is_required
         FROM school_subject_offerings
         WHERE school_id = $1 AND academic_year = $2 AND is_active = TRUE`,
        [sId, fromYear]
      ),
      db.query(
        `SELECT grade, name, mathematics_option, electives, status
         FROM academic_streams
         WHERE school_id = $1 AND academic_year = $2 AND status <> 'archived'`,
        [sId, fromYear]
      )
    ]);
  } catch (error) {
    wrapSchemaError(error, 'copyYearConfiguration');
  }

  if (!srcOfferings.rows.length && !srcStreams.rows.length) {
    const err = new Error(`No offerings or streams found for ${fromYear} to copy.`);
    err.status = 404;
    throw err;
  }

  let copiedOfferings = 0;
  let copiedStreams = 0;
  await withTransaction(async (client) => {
    for (const row of srcOfferings.rows) {
      await client.query(
        `INSERT INTO school_subject_offerings
          (school_id, academic_year, grade, stream_name, subject_name, category, language_level, is_required, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         ON CONFLICT (school_id, academic_year, grade, stream_name, subject_name, language_level)
         DO UPDATE SET is_required = EXCLUDED.is_required, is_active = TRUE`,
        [sId, toYear, row.grade, row.stream_name || '', row.subject_name, row.category, row.language_level || '', Boolean(row.is_required)]
      );
      copiedOfferings += 1;
    }
    for (const st of srcStreams.rows) {
      const existing = await client.query(
        `SELECT id FROM academic_streams
         WHERE school_id = $1 AND academic_year = $2 AND grade = $3 AND LOWER(name) = LOWER($4) AND status <> 'archived'
         LIMIT 1`,
        [sId, toYear, st.grade, st.name]
      );
      if (!existing.rows.length) {
        await client.query(
          `INSERT INTO academic_streams
            (school_id, academic_year, grade, name, mathematics_option, electives, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [sId, toYear, st.grade, st.name, st.mathematics_option, st.electives, st.status || 'published', actorId || null]
        );
        copiedStreams += 1;
      }
    }
  });

  await syncSchoolProfileCurriculum(sId);
  return { source_year: fromYear, target_year: toYear, copied_offerings: copiedOfferings, copied_streams: copiedStreams };
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
  try {
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
    if (publishedOnly) sql += ` AND status IN ('published', 'draft')`;
    sql += ' ORDER BY grade, name';
    const result = await db.query(sql, params);
    return result.rows.map(mapStream);
  } catch (error) {
    wrapSchemaError(error, 'listStreams');
  }
}

async function writeStream(schoolId, actorId, input, streamId) {
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
  try {
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
             status = 'published',
             updated_at = NOW()
         WHERE id = $6 AND school_id = $7
         RETURNING *`,
        [checked.value.name, year, grade, checked.value.mathematics, checked.value.electives, streamId, schoolId]
      );
      await syncSchoolProfileCurriculum(schoolId);
      return mapStream(result.rows[0]);
    }
    const result = await db.query(
      `INSERT INTO academic_streams
        (school_id, academic_year, grade, name, mathematics_option, electives, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'published', $7)
       RETURNING *`,
      [schoolId, year, grade, checked.value.name, checked.value.mathematics, checked.value.electives, actorId || null]
    );
    await syncSchoolProfileCurriculum(schoolId);
    return mapStream(result.rows[0]);
  } catch (error) {
    wrapSchemaError(error, 'writeStream');
  }
}

async function setStreamStatus(schoolId, streamId, status) {
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
  await syncSchoolProfileCurriculum(schoolId);
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

async function streamsForApplicants(schoolId, year, grade) {
  const exact = await listStreams(schoolId, year, grade, { publishedOnly: true });
  if (exact.length) return { streams: exact, year: Number(year) };
  const any = await listStreams(schoolId, null, grade, { publishedOnly: true });
  if (!any.length) return { streams: [], year: Number(year) };
  const latest = Math.max(...any.map((item) => Number(item.academic_year)));
  return {
    streams: any.filter((item) => Number(item.academic_year) === latest),
    year: latest
  };
}

async function resolveApplicantPackage(input) {
  const schoolId = Number(input.schoolId);
  const grade = Number(input.grade);
  const year = Number(input.academicYear);
  const streamId = Number(input.streamId);
  if (![10, 11, 12].includes(grade)) {
    const error = new Error('Grades 10, 11 and 12 use the academic streams set up by the school.');
    error.status = 400;
    throw error;
  }
  const available = await streamsForApplicants(schoolId, year, grade);
  if (!available.streams.length) {
    const error = new Error('Subject streams have not yet been made available by this school. Please contact the school for assistance.');
    error.status = 400;
    error.empty = true;
    throw error;
  }
  let stream = available.streams.find((item) => item.id === streamId);
  if (!stream && streamId) {
    const sameGrade = await listStreams(schoolId, null, grade, { publishedOnly: true });
    stream = sameGrade.find((item) => item.id === streamId);
  }
  if (!stream) {
    const error = new Error('Select an academic stream offered by this school for this grade.');
    error.status = 400;
    throw error;
  }
  let offerings = await readOfferings(schoolId, Number(stream.academic_year) || available.year, grade);
  if (!offerings.languages.length) {
    const fallbackLangs = await readApplicantLanguages(schoolId, Number(stream.academic_year) || available.year, grade);
    offerings = { ...offerings, languages: fallbackLangs.languages };
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
  try {
    const result = await db.query(
      `INSERT INTO subject_change_approvals
        (school_id, id_number, academic_year, grade, academic_stream_id, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [schoolId, String(input.id_number || '').trim(), Number(input.academic_year), Number(input.grade), Number(input.academic_stream_id), actorId || null]
    );
    return result.rows[0];
  } catch (error) {
    wrapSchemaError(error, 'approveSubjectChange');
  }
}

async function configurationSummary(schoolId, year) {
  try {
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
  } catch (error) {
    wrapSchemaError(error, 'configurationSummary');
  }
}

module.exports = {
  ensureSchema,
  wrapSchemaError,
  readOfferings,
  readAllGradeOfferings,
  getConfiguredYears,
  getSchoolRegistrationProfile,
  syncSchoolProfileCurriculum,
  seedOfferingsFromSchoolProfile,
  readApplicantLanguages,
  parseSchoolOfferedLanguages,
  saveOfferings,
  copyYearConfiguration,
  listStreams,
  streamsForApplicants,
  writeStream,
  setStreamStatus,
  resolveApplicantPackage,
  approveSubjectChange,
  configurationSummary,
  catalogue: {
    languages: rules.OFFICIAL_LANGUAGES,
    electives: rules.ELECTIVE_CATALOGUE,
    mathematics: [rules.MATHEMATICS, rules.MATHEMATICAL_LITERACY],
    life_orientation: rules.LIFE_ORIENTATION,
    senior_phase_compulsory: rules.SENIOR_PHASE_COMPULSORY,
    senior_phase_electives: rules.SENIOR_PHASE_ELECTIVES
  }
};
