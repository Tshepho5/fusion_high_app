const bcrypt = require('bcryptjs');
const db = require('../../../db/db');
const { buildPreview, validateMappedRow } = require('../services/learnerCsvImport');

const MAX_IMPORT = 500;

async function resolveClassId(schoolId, grade, className) {
  if (className) {
    const byName = await db.query(
      `SELECT id FROM classes
       WHERE school_id::text = $1::text
         AND LOWER(TRIM(name)) = LOWER(TRIM($2))
       LIMIT 1`,
      [String(schoolId), className]
    );
    if (byName.rows[0]) return byName.rows[0].id;

    // Create class if missing so import is not blocked
    const g = grade && grade >= 8 && grade <= 12 ? grade : 10;
    const stream = g >= 10 ? 'Science' : 'General';
    try {
      const created = await db.query(
        `INSERT INTO classes (name, grade, stream, school_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [className.trim(), g, stream, schoolId]
      );
      if (created.rows[0]) return created.rows[0].id;
    } catch (_) {
      try {
        const created2 = await db.query(
          `INSERT INTO classes (name, grade, stream)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [className.trim(), g, stream]
        );
        if (created2.rows[0]) return created2.rows[0].id;
      } catch (__) {
        // schema may differ; fall through
      }
    }
  }
  if (grade) {
    const byGrade = await db.query(
      `SELECT id FROM classes
       WHERE school_id::text = $1::text AND grade = $2
       ORDER BY id ASC LIMIT 1`,
      [String(schoolId), grade]
    );
    if (byGrade.rows[0]) return byGrade.rows[0].id;
  }
  const any = await db.query(
    `SELECT id FROM classes WHERE school_id::text = $1::text ORDER BY id ASC LIMIT 1`,
    [String(schoolId)]
  );
  return any.rows[0]?.id || null;
}

function defaultSubjects(stream, grade) {
  const s = stream || (grade >= 10 ? 'Science' : 'General');
  if (s === 'Science') return ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL'];
  if (s === 'Commerce') return ['Accounting', 'Business Studies', 'Economics', 'English FAL'];
  if (s === 'Tourism') return ['Tourism', 'Mathematical Literacy', 'Business Studies', 'English FAL'];
  return ['Mathematics', 'Natural Sciences', 'English FAL', 'Social Sciences'];
}

/**
 * Preview CSV: auto-map SA-SAMS headers, validate rows (no DB writes).
 * Body: { csv_text, mapping? }
 */
exports.previewLearnerImport = async (req, res) => {
  try {
    const csvText = req.body?.csv_text || req.body?.csv || '';
    const mapping = req.body?.mapping || null;
    const result = buildPreview(csvText, mapping);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({
      success: true,
      message: `Parsed ${result.total_rows} row(s). ${result.valid_rows} ready to import.`,
      ...result,
      // Don't echo entire rows twice in response if huge — keep rows for commit UX under 500
      rows: result.rows.slice(0, MAX_IMPORT)
    });
  } catch (err) {
    console.error('previewLearnerImport:', err);
    res.status(500).json({ error: 'Failed to parse learner CSV.' });
  }
};

/**
 * Commit mapped learner rows for the admin's school.
 * Body: { learners: [...], default_password?, skip_duplicates? }
 */
exports.commitLearnerImport = async (req, res) => {
  const schoolId = parseInt(req.user?.school_id, 10);
  if (!schoolId) {
    return res.status(400).json({ error: 'Sign in as a school admin before importing learners.' });
  }

  const learners = Array.isArray(req.body?.learners) ? req.body.learners : [];
  if (!learners.length) {
    return res.status(400).json({ error: 'No learner rows were provided to import.' });
  }
  if (learners.length > MAX_IMPORT) {
    return res.status(400).json({
      error: `Import is limited to ${MAX_IMPORT} learners per batch. Split the CSV and import again.`
    });
  }

  const skipDuplicates = req.body?.skip_duplicates !== false;
  const defaultPassword = String(req.body?.default_password || 'Learner@2026');
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  let roleId = 3;
  try {
    const roleRes = await db.query("SELECT id FROM roles WHERE LOWER(name) = 'learner' LIMIT 1");
    if (roleRes.rows[0]) roleId = roleRes.rows[0].id;
  } catch (_) {}

  const created = [];
  const skipped = [];
  const failed = [];

  for (let i = 0; i < learners.length; i++) {
    const incoming = learners[i] || {};
    const checked = validateMappedRow(
      {
        full_name: incoming.full_name,
        surname: incoming.surname,
        id_number: incoming.id_number ? String(incoming.id_number).replace(/\D/g, '') : null,
        learner_number: incoming.learner_number || null,
        grade: incoming.grade != null ? parseInt(incoming.grade, 10) : null,
        class_name: incoming.class_name || null,
        stream: incoming.stream || null,
        gender: incoming.gender || null,
        dob: incoming.dob || null,
        phone: incoming.phone ? String(incoming.phone).replace(/\D/g, '') : null,
        email: incoming.email ? String(incoming.email).toLowerCase().trim() : null,
        home_language: incoming.home_language || null,
        physical_address: incoming.physical_address || null
      },
      i + 1
    );

    if (!checked.ok) {
      failed.push({ row: i + 1, errors: checked.errors, learner: checked.row });
      continue;
    }

    const row = checked.row;
    if (/\d/.test(row.full_name) || /\d/.test(row.surname)) {
      failed.push({ row: i + 1, errors: ['Names may only contain letters'], learner: row });
      continue;
    }

    const grade = row.grade || 10;
    const stream = row.stream || (grade >= 10 ? 'Science' : 'General');
    const learnerNumber =
      (row.learner_number && String(row.learner_number).trim()) ||
      `GSA-${schoolId}-${Date.now().toString().slice(-6)}-${i}`;
    const email =
      row.email ||
      `${String(learnerNumber).toLowerCase().replace(/[^a-z0-9]/g, '')}@learners.gelezasa.local`;

    try {
      if (skipDuplicates) {
        const dupNum = await db.query(
          `SELECT id FROM children
           WHERE school_id::text = $1::text AND LOWER(learner_number) = LOWER($2)
           LIMIT 1`,
          [String(schoolId), learnerNumber]
        );
        if (dupNum.rows.length) {
          skipped.push({ row: i + 1, reason: `Learner number already exists: ${learnerNumber}`, learner_number: learnerNumber });
          continue;
        }
        if (row.id_number) {
          const dupId = await db.query(
            `SELECT id FROM users
             WHERE school_id::text = $1::text AND id_number::text = $2
             LIMIT 1`,
            [String(schoolId), row.id_number]
          );
          if (dupId.rows.length) {
            skipped.push({ row: i + 1, reason: `ID already registered: ${row.id_number}`, id_number: row.id_number });
            continue;
          }
        }
        const dupEmail = await db.query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
          [email]
        );
        if (dupEmail.rows.length) {
          skipped.push({ row: i + 1, reason: `Email already exists: ${email}`, email });
          continue;
        }
      }

      const classId = await resolveClassId(schoolId, grade, row.class_name);
      const subjects = defaultSubjects(stream, grade);
      let dobForDb = row.dob;
      if (dobForDb && dobForDb.includes('/')) {
        dobForDb = dobForDb.split('/').reverse().join('-');
      }

      await db.query('BEGIN');
      const userRes = await db.query(
        `INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, dob, gender, phone, physical_address, school_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id, email`,
        [
          email,
          passwordHash,
          roleId,
          row.full_name.trim(),
          row.surname.trim(),
          row.id_number || null,
          dobForDb || null,
          row.gender || null,
          row.phone || null,
          row.physical_address || null,
          schoolId
        ]
      );
      const userId = userRes.rows[0].id;
      const childRes = await db.query(
        `INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects, school_id, home_language)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id, learner_number, grade`,
        [
          userId,
          row.full_name.trim(),
          row.surname.trim(),
          null,
          learnerNumber,
          grade,
          classId,
          stream,
          subjects,
          schoolId,
          row.home_language || 'English'
        ]
      );
      await db.query('COMMIT');
      created.push({
        row: i + 1,
        user_id: userId,
        learner_id: childRes.rows[0].id,
        learner_number: childRes.rows[0].learner_number,
        email,
        grade: childRes.rows[0].grade
      });
    } catch (err) {
      try {
        await db.query('ROLLBACK');
      } catch (_) {}
      failed.push({ row: i + 1, errors: [err.message || 'Insert failed'], learner: row });
    }
  }

  res.status(201).json({
    success: true,
    message: `Import finished: ${created.length} created, ${skipped.length} skipped, ${failed.length} failed.`,
    default_password: defaultPassword,
    created_count: created.length,
    skipped_count: skipped.length,
    failed_count: failed.length,
    created,
    skipped,
    failed
  });
};
