const db = require('../../../db/db');
const bcrypt = require('bcryptjs');
const curriculumService = require('./curriculumService');

function compactRef(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function learnerPasswordFromId(idNumber) {
  const cleanId = digitsOnly(idNumber);
  if (cleanId.length < 6) return '123456';
  let password = '';
  for (let i = 0; i < cleanId.length; i += 3) password += cleanId[i];
  return password || cleanId;
}

const CHILD_MATCH_SQL = `
  SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.grade, c.stream, c.subjects,
         c.learner_number, c.parent_id, c.secondary_parent_id, c.application_number,
         c.home_language, c.school_id, c.class_id,
         u.email AS learner_email,
         regexp_replace(COALESCE(u.id_number, a.id_number, ''), '\\D', '', 'g') AS id_number,
         cl.name AS class_name
  FROM children c
  LEFT JOIN users u ON c.learner_user_id::text = u.id::text
  LEFT JOIN applications a ON LOWER(TRIM(a.application_number)) = LOWER(TRIM(c.application_number))
  LEFT JOIN classes cl ON c.class_id = cl.id
  WHERE (
      regexp_replace(LOWER(COALESCE(c.learner_number, '')), '[^a-z0-9]', '', 'g') = $1
      OR regexp_replace(LOWER(COALESCE(c.application_number, '')), '[^a-z0-9]', '', 'g') = $1
      OR regexp_replace(LOWER(COALESCE(a.application_number, '')), '[^a-z0-9]', '', 'g') = $1
      OR regexp_replace(LOWER(COALESCE(a.provisional_learner_number, '')), '[^a-z0-9]', '', 'g') = $1
    )
    AND regexp_replace(COALESCE(u.id_number, a.id_number, ''), '\\D', '', 'g') = $2
    AND (
      LOWER(TRIM(c.full_name)) = LOWER(TRIM($3))
      OR LOWER(TRIM(split_part(c.full_name, ' ', 1))) = LOWER(TRIM($3))
    )
    AND LOWER(TRIM(c.surname)) = LOWER(TRIM($4))
  LIMIT 1
`;

const APPLICATION_MATCH_SQL = `
  SELECT a.id, a.application_number, a.provisional_learner_number, a.first_name, a.surname,
         a.id_number, a.email, a.grade_applied, a.stream, a.home_language, a.school_id,
         a.assigned_class_id, a.status
  FROM applications a
  WHERE LOWER(a.status) IN ('approved', 'accepted', 'enrolled')
    AND (
      regexp_replace(LOWER(a.application_number), '[^a-z0-9]', '', 'g') = $1
      OR regexp_replace(LOWER(COALESCE(a.provisional_learner_number, '')), '[^a-z0-9]', '', 'g') = $1
    )
    AND regexp_replace(COALESCE(a.id_number, ''), '\\D', '', 'g') = $2
    AND LOWER(TRIM(a.first_name)) = LOWER(TRIM($3))
    AND LOWER(TRIM(a.surname)) = LOWER(TRIM($4))
  LIMIT 1
`;

function mapChild(row) {
  return {
    kind: 'child',
    id: row.id,
    learner_user_id: row.learner_user_id,
    full_name: row.full_name,
    surname: row.surname,
    learner_number: row.learner_number,
    grade: row.grade,
    stream: row.stream,
    subjects: row.subjects,
    parent_id: row.parent_id,
    secondary_parent_id: row.secondary_parent_id,
    application_number: row.application_number,
    home_language: row.home_language,
    school_id: row.school_id,
    class_id: row.class_id,
    class_name: row.class_name,
    learner_email: row.learner_email,
    id_number: row.id_number
  };
}

function mapApplication(row) {
  const learnerNumber = row.provisional_learner_number || row.application_number;
  return {
    kind: 'application',
    id: null,
    application_id: row.id,
    learner_user_id: null,
    full_name: row.first_name,
    surname: row.surname,
    learner_number: learnerNumber,
    grade: row.grade_applied,
    stream: row.stream || 'General',
    subjects: null,
    parent_id: null,
    secondary_parent_id: null,
    application_number: row.application_number,
    home_language: row.home_language,
    school_id: row.school_id,
    class_id: row.assigned_class_id,
    class_name: null,
    learner_email: row.email,
    id_number: digitsOnly(row.id_number),
    status: row.status
  };
}

async function findLinkableLearner({ learnerNumber, idNumber, firstName, surname }) {
  const ref = compactRef(learnerNumber);
  const id = digitsOnly(idNumber);
  const first = String(firstName || '').trim();
  const sur = String(surname || '').trim();
  if (!ref || id.length !== 13 || !first || !sur) return null;

  const child = await db.query(CHILD_MATCH_SQL, [ref, id, first, sur]);
  if (child.rows[0]) return mapChild(child.rows[0]);

  const application = await db.query(APPLICATION_MATCH_SQL, [ref, id, first, sur]);
  if (!application.rows[0]) return null;
  return mapApplication(application.rows[0]);
}

async function materializeAcceptedLearner(match, { parentUserId = null, schoolId = null, parentEmail = '' } = {}) {
  if (match.kind === 'child' && match.id) return match;

  const learnerNumber = match.learner_number || match.application_number;
  const existing = await db.query(
    `SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.grade, c.stream, c.subjects,
            c.learner_number, c.parent_id, c.secondary_parent_id, c.application_number,
            c.home_language, c.school_id, u.email AS learner_email
     FROM children c
     LEFT JOIN users u ON c.learner_user_id::text = u.id::text
     WHERE LOWER(TRIM(c.application_number)) = LOWER(TRIM($1))
        OR LOWER(TRIM(c.learner_number)) = LOWER(TRIM($2))
     LIMIT 1`,
    [match.application_number, learnerNumber]
  );
  if (existing.rows[0]) {
    const row = existing.rows[0];
    if (parentUserId && !row.parent_id) {
      await db.query('UPDATE children SET parent_id = $1 WHERE id = $2', [parentUserId, row.id]);
      row.parent_id = parentUserId;
    }
    return mapChild(row);
  }

  const school = schoolId || match.school_id || null;
  const idNumber = digitsOnly(match.id_number);
  const plainPassword = learnerPasswordFromId(idNumber);
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  let learnerEmail = String(match.learner_email || '').trim().toLowerCase();
  const parentInbox = String(parentEmail || '').trim().toLowerCase();
  if (!learnerEmail || (parentInbox && learnerEmail === parentInbox)) {
    learnerEmail = `${compactRef(learnerNumber) || 'learner'}@fusionhigh.co.za`;
  }

  const roleRes = await db.query("SELECT id FROM roles WHERE LOWER(name) = 'learner' LIMIT 1");
  const learnerRoleId = roleRes.rows[0]?.id || 3;
  const homeLanguage = match.home_language || 'Sepedi';
  const subjects = curriculumService.getSubjectsForGradeAndStream(match.grade, match.stream, homeLanguage);

  const { withTransaction } = require('../../../db/transaction');
  const created = await withTransaction(async (client) => {
    const userRes = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [learnerEmail]);
    let learnerUserId = userRes.rows[0]?.id;
    let createdPassword = null;
    if (!learnerUserId) {
      const inserted = await client.query(
        `INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, school_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [learnerEmail, passwordHash, learnerRoleId, match.full_name, match.surname, idNumber, school]
      );
      learnerUserId = inserted.rows[0].id;
      createdPassword = plainPassword;
    }
    const childRes = await client.query(
      `INSERT INTO children (
         learner_user_id, full_name, surname, parent_id, learner_number, grade, stream,
         subjects, class_id, application_number, home_language, school_id, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE)
       RETURNING id`,
      [
        learnerUserId, match.full_name, match.surname, parentUserId, learnerNumber,
        match.grade, match.stream, subjects, match.class_id || null, match.application_number,
        homeLanguage, school
      ]
    );
    if (match.application_number) {
      await client.query(
        `UPDATE applications
         SET status = 'enrolled',
             provisional_learner_number = COALESCE(NULLIF(provisional_learner_number, ''), $2)
         WHERE application_number = $1`,
        [match.application_number, learnerNumber]
      );
    }
    return { id: childRes.rows[0].id, learnerUserId, createdPassword, subjects };
  });

  return {
    ...match,
    kind: 'child',
    id: created.id,
    learner_user_id: created.learnerUserId,
    parent_id: parentUserId,
    subjects: created.subjects,
    learner_email: learnerEmail,
    generated_password: created.createdPassword
  };
}

module.exports = {
  compactRef,
  findLinkableLearner,
  materializeAcceptedLearner
};
