const fs = require('fs');
const path = require('path');
const db = require('../../../../db/db');
const { withTransaction } = require('../../../../db/transaction');
const { ensureLessonPlanningSchema } = require('../../../../db/migrate_lesson_planning');
const { resolveSchoolId } = require('../schoolScope');
const NotificationService = require('../notificationService');
const rules = require('./lessonPlanningRules');

const materialDirectory = path.join(process.cwd(), 'storage', 'lesson-materials');
const legacyMaterialDirectory = path.join(process.cwd(), 'uploads', 'lesson-materials');
const STORED_NAME = /^[0-9]+-[a-f0-9]{32}(?:\.[a-z0-9]{1,8})?$/;

function safeStoredName(name) {
  const base = path.basename(String(name || ''));
  return STORED_NAME.test(base) ? base : null;
}

function materialFilePath(storedName) {
  const base = safeStoredName(storedName);
  if (!base) throw httpError(404, 'File not found.');
  const current = path.join(materialDirectory, base);
  if (fs.existsSync(current)) return current;
  const legacy = path.join(legacyMaterialDirectory, base);
  if (fs.existsSync(legacy)) return legacy;
  return current;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function actorFromReq(req) {
  const schoolId = resolveSchoolId(req);
  return {
    userId: Number(req.user.id),
    schoolId: schoolId ? Number(schoolId) : null,
    role: String(req.user.role || '').toLowerCase(),
    isSuperadmin: Boolean(req.user.is_superadmin)
  };
}

async function ready(actor) {
  await ensureLessonPlanningSchema();
  if (!actor.schoolId) throw httpError(403, 'Your account is not linked to a registered school.');
}

async function loadAllocations(teacherId, schoolId) {
  const { rows } = await db.query(
    `SELECT DISTINCT
        ta.subject_name,
        ta.subject_code,
        ta.grade_level AS grade,
        COALESCE(c.name, ta.class_name) AS class_name,
        COALESCE(ta.class_id, c.id) AS class_id,
        COALESCE(c.stream, 'General') AS stream,
        c.school_id,
        s.id AS subject_id,
        s.school_id AS subject_school_id
     FROM teacher_assignments ta
     LEFT JOIN classes c ON (
       (ta.class_id IS NOT NULL AND c.id = ta.class_id)
       OR (
         ta.class_id IS NULL
         AND c.name = ta.class_name
         AND c.grade = ta.grade_level
         AND (c.school_id = $2 OR c.school_id IS NULL)
       )
     )
     LEFT JOIN LATERAL (
       SELECT id, school_id
       FROM subjects
       WHERE LOWER(name) = LOWER(ta.subject_name)
         AND grade = ta.grade_level
         AND (school_id = $2 OR school_id IS NULL)
       ORDER BY CASE WHEN school_id = $2 THEN 0 ELSE 1 END, id
       LIMIT 1
     ) s ON TRUE
     WHERE ta.teacher_id = $1`,
    [teacherId, schoolId]
  );
  const scoped = rows.filter((row) => !row.school_id || Number(row.school_id) === Number(schoolId));
  if (scoped.length) return scoped;

  const employee = await db.query(
    `SELECT subjects, grades_taught, classes_taught FROM employees WHERE user_id = $1`,
    [teacherId]
  );
  const record = employee.rows[0];
  if (!record) return [];
  const subjects = record.subjects || [];
  const grades = record.grades_taught || [];
  const classes = record.classes_taught || [];
  const expanded = [];
  subjects.forEach((subjectName) => {
    grades.forEach((grade) => {
      if (classes.length) {
        classes.forEach((className) => {
          expanded.push({
            subject_name: subjectName,
            grade: Number(grade),
            class_name: className,
            class_id: null,
            subject_id: null,
            stream: 'General',
            school_id: schoolId
          });
        });
      } else {
        expanded.push({
          subject_name: subjectName,
          grade: Number(grade),
          class_name: null,
          class_id: null,
          subject_id: null,
          stream: 'General',
          school_id: schoolId
        });
      }
    });
  });
  return expanded;
}

async function assertClassInSchool(classId, schoolId) {
  if (!classId) return;
  const { rows } = await db.query('SELECT id, school_id, name, grade, stream, ownership_quarantine FROM classes WHERE id = $1', [classId]);
  if (!rows.length) throw httpError(400, 'The selected class does not exist.');
  if (rows[0].ownership_quarantine) throw httpError(403, 'That class is not available until its original school has been identified.');
  if (rows[0].school_id && Number(rows[0].school_id) !== Number(schoolId)) {
    throw httpError(403, 'That class belongs to another school.');
  }
  return rows[0];
}

async function assertHomeworkLink(client, homeworkId, actor) {
  if (!homeworkId) return;
  const { rows } = await client.query(
    `SELECT id FROM homework_assignments
     WHERE id = $1 AND teacher_id = $2 AND (school_id = $3 OR school_id IS NULL)`,
    [homeworkId, actor.userId, actor.schoolId]
  );
  if (!rows.length) throw httpError(403, 'That homework record is not available to link to this lesson.');
}

const PLAN_COLUMNS = `
  p.id, p.school_id, p.teacher_id, p.subject_id, p.subject_name, p.class_id, p.class_name,
  p.grade, p.academic_year, p.term, p.scheduled_date, p.scheduled_time, p.duration_minutes,
  p.topic, p.sub_topic, p.previous_knowledge, p.status, p.timetable_id, p.timetable_class,
  p.timetable_day, p.timetable_period, p.last_reminder_at, p.created_at, p.updated_at,
  sch.name AS school_name, sch.emis_number, sch.physical_address, sch.contact_email,
  sch.contact_phone, sch.motto, sch.curriculum_type,
  u.full_name AS teacher_first_name, u.surname AS teacher_surname, u.email AS teacher_email
`;

async function attachChildren(plan) {
  const planId = plan.id;
  const [objectives, materials, methods, references, stages, evaluations, assignments, reflection] = await Promise.all([
    db.query('SELECT id, objective, display_order FROM lesson_objectives WHERE lesson_plan_id = $1 ORDER BY display_order, id', [planId]),
    db.query(`SELECT id, material_name, description, attachment_original_name, attachment_stored_name, display_order
              FROM lesson_materials WHERE lesson_plan_id = $1 ORDER BY display_order, id`, [planId]),
    db.query('SELECT id, method_name, display_order FROM lesson_methods WHERE lesson_plan_id = $1 ORDER BY display_order, id', [planId]),
    db.query('SELECT id, reference_title, author, reference_type, display_order FROM lesson_references WHERE lesson_plan_id = $1 ORDER BY display_order, id', [planId]),
    db.query(`SELECT id, stage_name, duration_minutes, teacher_activities, learner_activities, display_order
              FROM lesson_presentation_stages WHERE lesson_plan_id = $1 ORDER BY display_order, id`, [planId]),
    db.query('SELECT id, question, question_type, display_order FROM lesson_evaluations WHERE lesson_plan_id = $1 ORDER BY display_order, id', [planId]),
    db.query(`SELECT id, homework_assignment_id, title, assignment_content, due_date, display_order
              FROM lesson_assignments WHERE lesson_plan_id = $1 ORDER BY display_order, id`, [planId]),
    db.query('SELECT * FROM lesson_reflections WHERE lesson_plan_id = $1', [planId])
  ]);
  plan.objectives = objectives.rows;
  plan.materials = materials.rows.map((row) => ({
    ...row,
    download_url: row.attachment_stored_name ? `/api/teacher/lesson-plans/materials/${row.id}/file` : null
  }));
  plan.methods = methods.rows;
  plan.references = references.rows;
  plan.stages = stages.rows;
  plan.evaluations = evaluations.rows;
  plan.assignments = assignments.rows.map((row) => ({
    ...row,
    existing_assignment_id: row.homework_assignment_id
  }));
  plan.reflection = reflection.rows[0] || null;
  plan.timing = rules.timeWarning(plan.duration_minutes, plan.stages);
  plan.gaps = rules.preparationGaps(plan);
  return plan;
}

async function fetchPlanRow(id, schoolId) {
  const { rows } = await db.query(
    `SELECT ${PLAN_COLUMNS}
     FROM lesson_plans p
     JOIN schools sch ON sch.id = p.school_id
     LEFT JOIN users u ON u.id = p.teacher_id
     WHERE p.id = $1 AND p.school_id = $2`,
    [id, schoolId]
  );
  return rows[0] || null;
}

async function getPlan(actor, id) {
  await ready(actor);
  const plan = await fetchPlanRow(id, actor.schoolId);
  if (!plan || !rules.canReadPlan(actor, plan)) throw httpError(404, 'Lesson plan not found.');
  return attachChildren(plan);
}

function filtersFromQuery(query) {
  return {
    subject: rules.cleanText(query.subject, 150),
    grade: rules.cleanInt(query.grade),
    className: rules.cleanText(query.class_name || query.class, 100),
    term: rules.cleanInt(query.term),
    academicYear: rules.cleanInt(query.academic_year),
    date: rules.cleanDate(query.date),
    status: rules.STATUSES.includes(query.status) ? query.status : '',
    search: rules.likeTerm(query.q || query.search),
    ...rules.paginate(query.page, query.limit)
  };
}

function applyFilters(where, params, filters) {
  if (filters.subject) {
    params.push(filters.subject);
    where.push(`LOWER(p.subject_name) = LOWER($${params.length})`);
  }
  if (filters.grade) {
    params.push(filters.grade);
    where.push(`p.grade = $${params.length}`);
  }
  if (filters.className) {
    params.push(filters.className);
    where.push(`LOWER(p.class_name) = LOWER($${params.length})`);
  }
  if (filters.term) {
    params.push(filters.term);
    where.push(`p.term = $${params.length}`);
  }
  if (filters.academicYear) {
    params.push(filters.academicYear);
    where.push(`p.academic_year = $${params.length}`);
  }
  if (filters.date) {
    params.push(filters.date);
    where.push(`p.scheduled_date = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`p.status = $${params.length}`);
  }
  if (filters.search) {
    params.push(filters.search);
    where.push(`(p.topic ILIKE $${params.length} OR p.sub_topic ILIKE $${params.length} OR p.subject_name ILIKE $${params.length})`);
  }
  return { where, params };
}

function scopeClause(actor, params) {
  params.push(actor.schoolId);
  const schoolIndex = params.length;
  let teacherSql = '';
  if (!(actor.role === 'admin' || actor.isSuperadmin)) {
    params.push(actor.userId);
    teacherSql = ` AND p.teacher_id = $${params.length}`;
  }
  return { sql: `p.school_id = $${schoolIndex}${teacherSql}`, params };
}

async function listPlans(actor, query) {
  await ready(actor);
  const filters = filtersFromQuery(query);
  const params = [];
  const scope = scopeClause(actor, params);
  const built = applyFilters([scope.sql], params, filters);
  const whereSql = built.where.join(' AND ');
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM lesson_plans p WHERE ${whereSql}`, built.params);
  const pageParams = built.params.slice();
  pageParams.push(filters.limit, filters.offset);
  const { rows } = await db.query(
    `SELECT ${PLAN_COLUMNS}
     FROM lesson_plans p
     JOIN schools sch ON sch.id = p.school_id
     LEFT JOIN users u ON u.id = p.teacher_id
     WHERE ${whereSql}
     ORDER BY p.updated_at DESC
     LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
    pageParams
  );
  return {
    plans: rows,
    page: filters.page,
    limit: filters.limit,
    total: count.rows[0].total
  };
}

async function dashboard(actor, query) {
  await ready(actor);
  const filters = filtersFromQuery(query);
  const params = [];
  const scope = scopeClause(actor, params);
  const built = applyFilters([scope.sql], params, filters);
  const whereSql = built.where.join(' AND ');
  const stats = await db.query(
    `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE p.status = 'draft')::int AS drafts,
        COUNT(*) FILTER (WHERE p.status = 'scheduled')::int AS scheduled,
        COUNT(*) FILTER (WHERE p.status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE p.status = 'scheduled' AND p.scheduled_date >= CURRENT_DATE)::int AS upcoming,
        COUNT(*) FILTER (WHERE p.status <> 'completed' AND p.scheduled_date IS NOT NULL AND p.scheduled_date < CURRENT_DATE)::int AS overdue
     FROM lesson_plans p
     WHERE ${whereSql}`,
    built.params
  );
  const attention = await db.query(
    `SELECT p.id, p.topic, p.subject_name, p.class_name, p.grade, p.scheduled_date, p.status, p.updated_at
     FROM lesson_plans p
     WHERE ${whereSql}
       AND (
         (p.status <> 'completed' AND p.scheduled_date IS NOT NULL AND p.scheduled_date < CURRENT_DATE)
         OR (p.status <> 'completed' AND NOT EXISTS (SELECT 1 FROM lesson_objectives o WHERE o.lesson_plan_id = p.id))
         OR (p.status <> 'completed' AND NOT EXISTS (SELECT 1 FROM lesson_evaluations e WHERE e.lesson_plan_id = p.id))
       )
     ORDER BY p.scheduled_date NULLS LAST, p.updated_at DESC
     LIMIT 8`,
    built.params
  );
  const recentParams = built.params.slice();
  const recent = await db.query(
    `SELECT p.id, p.topic, p.subject_name, p.class_name, p.grade, p.status, p.scheduled_date, p.updated_at, p.term, p.academic_year
     FROM lesson_plans p
     WHERE ${whereSql}
     ORDER BY p.updated_at DESC
     LIMIT 6`,
    recentParams
  );
  await remindUpcoming(actor).catch(() => {});
  const row = stats.rows[0];
  return {
    total: row.total,
    drafts: row.drafts,
    scheduled: row.scheduled,
    completed: row.completed,
    upcoming: row.upcoming,
    attention: row.overdue,
    attention_items: attention.rows,
    recent: recent.rows
  };
}

async function remindUpcoming(actor) {
  if (actor.role === 'admin' && actor.userId) {
    // Remind only the signed-in teacher about their own lessons.
  }
  const { rows } = await db.query(
    `SELECT id, topic, subject_name, class_name, scheduled_date
     FROM lesson_plans
     WHERE school_id = $1
       AND teacher_id = $2
       AND status = 'scheduled'
       AND scheduled_date IS NOT NULL
       AND scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day'
       AND (last_reminder_at IS NULL OR last_reminder_at < NOW() - INTERVAL '20 hours')`,
    [actor.schoolId, actor.userId]
  );
  for (const plan of rows) {
    const topic = plan.topic || plan.subject_name;
    await NotificationService.sendNotification(
      actor.userId,
      'Upcoming lesson',
      `${topic} · ${plan.subject_name}${plan.class_name ? ` · ${plan.class_name}` : ''} is scheduled for ${plan.scheduled_date}.`,
      'lesson_reminder',
      'lesson-planning'
    );
    await db.query('UPDATE lesson_plans SET last_reminder_at = NOW() WHERE id = $1', [plan.id]);
  }
  return rows.length;
}

async function replaceChildren(client, planId, input, actor) {
  const existingFiles = await client.query(
    'SELECT attachment_stored_name FROM lesson_materials WHERE lesson_plan_id = $1 AND attachment_stored_name IS NOT NULL',
    [planId]
  );
  const allowedFiles = new Set(existingFiles.rows.map((row) => row.attachment_stored_name));

  await client.query('DELETE FROM lesson_objectives WHERE lesson_plan_id = $1', [planId]);
  await client.query('DELETE FROM lesson_materials WHERE lesson_plan_id = $1', [planId]);
  await client.query('DELETE FROM lesson_methods WHERE lesson_plan_id = $1', [planId]);
  await client.query('DELETE FROM lesson_references WHERE lesson_plan_id = $1', [planId]);
  await client.query('DELETE FROM lesson_presentation_stages WHERE lesson_plan_id = $1', [planId]);
  await client.query('DELETE FROM lesson_evaluations WHERE lesson_plan_id = $1', [planId]);
  await client.query('DELETE FROM lesson_assignments WHERE lesson_plan_id = $1', [planId]);

  for (let i = 0; i < input.objectives.length; i += 1) {
    await client.query(
      'INSERT INTO lesson_objectives (lesson_plan_id, objective, display_order) VALUES ($1, $2, $3)',
      [planId, input.objectives[i].objective, i]
    );
  }
  for (let i = 0; i < input.materials.length; i += 1) {
    const item = input.materials[i];
    const stored = safeStoredName(item.attachment_stored_name);
    const kept = stored && allowedFiles.has(stored) ? stored : null;
    await client.query(
      `INSERT INTO lesson_materials
        (lesson_plan_id, material_name, description, attachment_original_name, attachment_stored_name, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [planId, item.material_name, item.description || null, kept ? item.attachment_original_name : null, kept, i]
    );
  }
  for (let i = 0; i < input.methods.length; i += 1) {
    await client.query(
      'INSERT INTO lesson_methods (lesson_plan_id, method_name, display_order) VALUES ($1, $2, $3)',
      [planId, input.methods[i].method_name, i]
    );
  }
  for (let i = 0; i < input.references.length; i += 1) {
    const item = input.references[i];
    await client.query(
      `INSERT INTO lesson_references (lesson_plan_id, reference_title, author, reference_type, display_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [planId, item.reference_title, item.author || null, item.reference_type, i]
    );
  }
  for (let i = 0; i < input.stages.length; i += 1) {
    const item = input.stages[i];
    await client.query(
      `INSERT INTO lesson_presentation_stages
        (lesson_plan_id, stage_name, duration_minutes, teacher_activities, learner_activities, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [planId, item.stage_name, item.duration_minutes, item.teacher_activities || null, item.learner_activities || null, i]
    );
  }
  for (let i = 0; i < input.evaluations.length; i += 1) {
    const item = input.evaluations[i];
    await client.query(
      'INSERT INTO lesson_evaluations (lesson_plan_id, question, question_type, display_order) VALUES ($1, $2, $3, $4)',
      [planId, item.question, item.question_type, i]
    );
  }
  for (let i = 0; i < input.assignments.length; i += 1) {
    const item = input.assignments[i];
    await assertHomeworkLink(client, item.homework_assignment_id, actor);
    await client.query(
      `INSERT INTO lesson_assignments
        (lesson_plan_id, homework_assignment_id, title, assignment_content, due_date, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [planId, item.homework_assignment_id, item.title || null, item.assignment_content || null, item.due_date, i]
    );
  }

  if (input.reflection) {
    const reflection = input.reflection;
    await client.query(
      `INSERT INTO lesson_reflections (
         lesson_plan_id, objectives_achieved_flag, objectives_achieved, what_went_well, challenges,
         learners_needing_support, areas_for_improvement, recommendations, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT (lesson_plan_id) DO UPDATE SET
         objectives_achieved_flag = EXCLUDED.objectives_achieved_flag,
         objectives_achieved = EXCLUDED.objectives_achieved,
         what_went_well = EXCLUDED.what_went_well,
         challenges = EXCLUDED.challenges,
         learners_needing_support = EXCLUDED.learners_needing_support,
         areas_for_improvement = EXCLUDED.areas_for_improvement,
         recommendations = EXCLUDED.recommendations,
         updated_at = CURRENT_TIMESTAMP`,
      [
        planId,
        reflection.objectives_achieved_flag,
        reflection.objectives_achieved || null,
        reflection.what_went_well || null,
        reflection.challenges || null,
        reflection.learners_needing_support || null,
        reflection.areas_for_improvement || null,
        reflection.recommendations || null
      ]
    );
  }
}

async function assertAuthorisedAllocation(actor, input) {
  const allocations = await loadAllocations(actor.userId, actor.schoolId);
  const matches = allocations.filter((row) => rules.allocationMatches([row], input));
  if (!matches.length) {
    throw httpError(403, 'You can only plan lessons for subjects and classes assigned to you.');
  }
  const chosen = matches.find((row) => input.class_id && Number(row.class_id) === Number(input.class_id)) || matches[0];
  input.subject_name = chosen.subject_name;
  input.grade = Number(chosen.grade);
  input.class_name = chosen.class_name || input.class_name;
  input.class_id = chosen.class_id || null;
  input.subject_id = chosen.subject_id || null;
  if (chosen.subject_school_id && Number(chosen.subject_school_id) !== Number(actor.schoolId)) {
    input.subject_id = null;
  }
  await assertClassInSchool(input.class_id, actor.schoolId);
}

async function assertTimetableSlot(actor, input) {
  if (!input.timetable_id) return;
  const { rows } = await db.query(
    'SELECT id, school_id, timetable_data FROM timetables WHERE id = $1',
    [input.timetable_id]
  );
  if (!rows.length) throw httpError(400, 'That timetable does not exist.');
  if (rows[0].school_id && Number(rows[0].school_id) !== Number(actor.schoolId)) {
    throw httpError(403, 'That timetable belongs to another school.');
  }
  const user = await db.query('SELECT full_name, surname FROM users WHERE id = $1 AND school_id = $2', [actor.userId, actor.schoolId]);
  if (!user.rows.length) throw httpError(403, 'Your account is not linked to this school.');
  const full = `${user.rows[0].full_name || ''} ${user.rows[0].surname || ''}`.trim().toLowerCase();
  const surname = (user.rows[0].surname || '').toLowerCase();
  const data = typeof rows[0].timetable_data === 'string' ? JSON.parse(rows[0].timetable_data) : rows[0].timetable_data;
  const mentions = (value) => {
    const teacher = String(value || '').toLowerCase();
    return Boolean(teacher) && ((full && teacher.includes(full)) || (surname && surname.length >= 3 && teacher.includes(surname)));
  };
  if (input.timetable_class && input.timetable_day && input.timetable_period) {
    const slot = data?.[input.timetable_class]?.[input.timetable_day]?.[input.timetable_period];
    if (!mentions(slot && slot.teacher)) throw httpError(403, 'That timetable period is not on your schedule.');
    return;
  }
  const blob = JSON.stringify(data || {}).toLowerCase();
  const listed = (full && blob.includes(full)) || (surname && surname.length >= 3 && blob.includes(surname));
  if (!listed) throw httpError(403, 'That timetable is not on your schedule.');
}

async function savePlan(actor, planId, body) {
  await ready(actor);
  const input = rules.normalisePlanInput(body);
  const errors = rules.validatePlanInput(input, { forComplete: input.save_as === 'completed' });
  if (errors.length) throw httpError(400, errors.join(' '));
  await assertAuthorisedAllocation(actor, input);
  await assertTimetableSlot(actor, input);

  const id = await withTransaction(async (client) => {
    let existing = null;
    if (planId) {
      const current = await client.query(
        'SELECT * FROM lesson_plans WHERE id = $1 AND school_id = $2 FOR UPDATE',
        [planId, actor.schoolId]
      );
      existing = current.rows[0];
      if (!existing || !rules.canWritePlan(actor, existing)) throw httpError(404, 'Lesson plan not found.');
      if (input.expected_updated_at) {
        const previous = new Date(existing.updated_at).getTime();
        const expected = new Date(input.expected_updated_at).getTime();
        if (!Number.isNaN(expected) && previous !== expected) {
          throw httpError(409, 'This lesson plan was updated in another session. Reload it before saving again.');
        }
      }
    }
    const status = rules.resolveStatus(input, existing && existing.status);
    const values = [
      input.subject_id,
      input.subject_name,
      input.class_id,
      input.class_name,
      input.grade,
      input.academic_year,
      input.term,
      input.scheduled_date,
      input.scheduled_time,
      input.duration_minutes,
      input.topic || null,
      input.sub_topic || null,
      input.previous_knowledge || null,
      status,
      input.timetable_id,
      input.timetable_class || null,
      input.timetable_day || null,
      input.timetable_period || null
    ];
    if (existing) {
      await client.query(
        `UPDATE lesson_plans SET
           subject_id = $1, subject_name = $2, class_id = $3, class_name = $4, grade = $5,
           academic_year = $6, term = $7, scheduled_date = $8, scheduled_time = $9,
           duration_minutes = $10, topic = $11, sub_topic = $12, previous_knowledge = $13,
           status = $14, timetable_id = $15, timetable_class = $16, timetable_day = $17,
           timetable_period = $18, updated_at = CURRENT_TIMESTAMP
         WHERE id = $19 AND school_id = $20 AND teacher_id = $21`,
        [...values, existing.id, actor.schoolId, actor.userId]
      );
      await replaceChildren(client, existing.id, input, actor);
      return existing.id;
    }
    const inserted = await client.query(
      `INSERT INTO lesson_plans (
         school_id, teacher_id, subject_id, subject_name, class_id, class_name, grade,
         academic_year, term, scheduled_date, scheduled_time, duration_minutes, topic,
         sub_topic, previous_knowledge, status, timetable_id, timetable_class, timetable_day, timetable_period
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING id`,
      [actor.schoolId, actor.userId, ...values]
    );
    await replaceChildren(client, inserted.rows[0].id, input, actor);
    return inserted.rows[0].id;
  });
  return getPlan(actor, id);
}

async function deletePlan(actor, planId) {
  await ready(actor);
  const plan = await fetchPlanRow(planId, actor.schoolId);
  if (!plan || !rules.canWritePlan(actor, plan)) throw httpError(404, 'Lesson plan not found.');
  await db.query('DELETE FROM lesson_plans WHERE id = $1 AND school_id = $2 AND teacher_id = $3', [planId, actor.schoolId, actor.userId]);
  return { deleted: true };
}

async function duplicatePlan(actor, planId) {
  const plan = await getPlan(actor, planId);
  if (!rules.canWritePlan(actor, plan)) throw httpError(404, 'Lesson plan not found.');
  const copy = rules.normalisePlanInput({
    ...plan,
    topic: plan.topic ? `${plan.topic} copy`.slice(0, 500) : '',
    scheduled_date: null,
    scheduled_time: null,
    timetable_id: null,
    timetable_class: null,
    timetable_day: null,
    timetable_period: null,
    save_as: 'draft',
    reflection: null,
    assignments: (plan.assignments || []).map((item) => ({
      title: item.title,
      assignment_content: item.assignment_content,
      due_date: item.due_date
    })),
    materials: (plan.materials || []).map((item) => ({
      material_name: item.material_name,
      description: item.description
    }))
  });
  return savePlan(actor, null, copy);
}

async function getContext(actor) {
  await ready(actor);
  const [school, teacher, allocations] = await Promise.all([
    db.query(
      `SELECT id, name, emis_number, physical_address, contact_email, contact_phone, motto, curriculum_type, province, district
       FROM schools WHERE id = $1`,
      [actor.schoolId]
    ),
    db.query('SELECT id, full_name, surname, email FROM users WHERE id = $1', [actor.userId]),
    loadAllocations(actor.userId, actor.schoolId)
  ]);
  if (!school.rows.length) throw httpError(403, 'Your account is not linked to a registered school.');
  const year = rules.currentAcademicYear();
  return {
    school: school.rows[0],
    teacher: teacher.rows[0],
    allocations,
    academic_years: [year - 1, year, year + 1],
    terms: [1, 2, 3, 4],
    suggested_year: year,
    suggested_term: rules.suggestedTerm(),
    can_manage_own: actor.role === 'teacher' || actor.role === 'admin' || actor.isSuperadmin,
    oversight: actor.role === 'admin' || actor.isSuperadmin
  };
}

async function progress(actor, query) {
  const summary = await dashboard(actor, query);
  const params = [];
  const scope = scopeClause(actor, params);
  const missingObjectives = await db.query(
    `SELECT COUNT(*)::int AS total FROM lesson_plans p
     WHERE ${scope.sql} AND NOT EXISTS (SELECT 1 FROM lesson_objectives o WHERE o.lesson_plan_id = p.id)`,
    params
  );
  const missingEvaluation = await db.query(
    `SELECT COUNT(*)::int AS total FROM lesson_plans p
     WHERE ${scope.sql} AND NOT EXISTS (SELECT 1 FROM lesson_evaluations e WHERE e.lesson_plan_id = p.id)`,
    params
  );
  const reflectionPending = await db.query(
    `SELECT COUNT(*)::int AS total FROM lesson_plans p
     WHERE ${scope.sql} AND p.status = 'completed'
       AND NOT EXISTS (
         SELECT 1 FROM lesson_reflections r
         WHERE r.lesson_plan_id = p.id
           AND (COALESCE(r.what_went_well, '') <> '' OR COALESCE(r.challenges, '') <> '' OR COALESCE(r.objectives_achieved, '') <> '')
       )`,
    params
  );
  const bySubject = await db.query(
    `SELECT p.subject_name, p.grade,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE p.status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE p.status = 'draft')::int AS drafts
     FROM lesson_plans p
     WHERE ${scope.sql}
     GROUP BY p.subject_name, p.grade
     ORDER BY p.grade, p.subject_name`,
    params
  );
  return {
    ...summary,
    missing_objectives: missingObjectives.rows[0].total,
    missing_evaluation: missingEvaluation.rows[0].total,
    reflections_pending: reflectionPending.rows[0].total,
    by_subject: bySubject.rows
  };
}

async function teacherSlots(actor) {
  const user = await db.query('SELECT full_name, surname FROM users WHERE id = $1', [actor.userId]);
  const full = `${user.rows[0]?.full_name || ''} ${user.rows[0]?.surname || ''}`.trim().toLowerCase();
  const surname = (user.rows[0]?.surname || '').toLowerCase();
  const tables = await db.query(
    `SELECT id, grade, stream, timetable_data FROM timetables WHERE school_id = $1 AND COALESCE(is_active, TRUE) = TRUE`,
    [actor.schoolId]
  );
  const slots = [];
  tables.rows.forEach((table) => {
    const data = typeof table.timetable_data === 'string' ? JSON.parse(table.timetable_data) : table.timetable_data;
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach((className) => {
      const days = data[className];
      if (!days || typeof days !== 'object') return;
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach((day) => {
        const daySlots = days[day];
        if (!daySlots || typeof daySlots !== 'object') return;
        Object.keys(daySlots).forEach((period) => {
          const slot = daySlots[period];
          if (!slot || !slot.teacher) return;
          const teacher = String(slot.teacher).toLowerCase();
          const isMatch = (full && teacher.includes(full)) || (surname && teacher.includes(surname));
          if (!isMatch) return;
          slots.push({
            timetable_id: table.id,
            grade: table.grade,
            stream: table.stream,
            class_name: className,
            day,
            period,
            subject: slot.subject || '',
            room: slot.room || '',
            duration: slot.duration || ''
          });
        });
      });
    });
  });
  return slots;
}

async function calendar(actor, query) {
  await ready(actor);
  const from = rules.cleanDate(query.from) || new Date().toISOString().slice(0, 10);
  const to = rules.cleanDate(query.to) || from;
  const params = [actor.schoolId, from, to];
  let teacherSql = '';
  if (!(actor.role === 'admin' || actor.isSuperadmin)) {
    params.push(actor.userId);
    teacherSql = ` AND p.teacher_id = $${params.length}`;
  } else if (query.teacher_id && (actor.role === 'admin' || actor.isSuperadmin)) {
    params.push(rules.cleanInt(query.teacher_id));
    teacherSql = ` AND p.teacher_id = $${params.length}`;
  }
  const plans = await db.query(
    `SELECT p.id, p.teacher_id, p.subject_name, p.class_name, p.grade, p.topic, p.status,
            p.scheduled_date, p.scheduled_time, p.duration_minutes, p.timetable_id,
            p.timetable_day, p.timetable_period, p.timetable_class,
            u.full_name AS teacher_first_name, u.surname AS teacher_surname
     FROM lesson_plans p
     LEFT JOIN users u ON u.id = p.teacher_id
     WHERE p.school_id = $1 AND p.scheduled_date BETWEEN $2 AND $3 ${teacherSql}
     ORDER BY p.scheduled_date, p.scheduled_time NULLS LAST`,
    params
  );
  const slots = actor.role === 'admin' && !query.teacher_id ? [] : await teacherSlots(actor);
  const linked = new Set(
    (await db.query(
      `SELECT timetable_id, timetable_day, timetable_period, timetable_class
       FROM lesson_plans
       WHERE school_id = $1 AND teacher_id = $2 AND timetable_id IS NOT NULL`,
      [actor.schoolId, actor.userId]
    )).rows.map((row) => `${row.timetable_id}|${String(row.timetable_day).toLowerCase()}|${String(row.timetable_period).toLowerCase()}|${String(row.timetable_class).toLowerCase()}`)
  );
  const unprepared = slots.filter((slot) => !linked.has(
    `${slot.timetable_id}|${String(slot.day).toLowerCase()}|${String(slot.period).toLowerCase()}|${String(slot.class_name).toLowerCase()}`
  ));
  return { from, to, plans: plans.rows, slots, unprepared };
}

async function addMaterialFile(actor, planId, file) {
  const plan = await getPlan(actor, planId);
  if (!rules.canWritePlan(actor, plan)) throw httpError(404, 'Lesson plan not found.');
  const count = await db.query('SELECT COUNT(*)::int AS total FROM lesson_materials WHERE lesson_plan_id = $1', [planId]);
  const { rows } = await db.query(
    `INSERT INTO lesson_materials
      (lesson_plan_id, material_name, description, attachment_original_name, attachment_stored_name, display_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, material_name, attachment_original_name, attachment_stored_name`,
    [planId, file.materialName, null, file.originalName, file.storedName, count.rows[0].total]
  );
  return {
    ...rows[0],
    download_url: `/api/teacher/lesson-plans/materials/${rows[0].id}/file`
  };
}

async function materialFile(actor, materialId) {
  await ready(actor);
  const { rows } = await db.query(
    `SELECT m.attachment_stored_name, m.attachment_original_name, p.school_id, p.teacher_id
     FROM lesson_materials m
     JOIN lesson_plans p ON p.id = m.lesson_plan_id
     WHERE m.id = $1`,
    [materialId]
  );
  const row = rows[0];
  if (!row || !rules.canReadPlan(actor, row) || !row.attachment_stored_name) {
    throw httpError(404, 'File not found.');
  }
  return {
    absolutePath: materialFilePath(row.attachment_stored_name),
    downloadName: row.attachment_original_name || 'material'
  };
}

function normaliseNote(body) {
  const source = body && typeof body === 'object' ? body : {};
  const sections = (Array.isArray(source.sections) ? source.sections : []).slice(0, 40).map((section) => ({
    heading: rules.cleanText(section && section.heading, 200),
    body: rules.cleanMultiline(section && section.body, 8000),
    attachment_original_name: section && section.attachment_original_name ? rules.cleanText(section.attachment_original_name, 255) : null,
    attachment_stored_name: section && section.attachment_stored_name ? rules.cleanText(section.attachment_stored_name, 255) : null
  })).filter((section) => section.heading || section.body);
  return {
    lesson_plan_id: rules.cleanInt(source.lesson_plan_id),
    subject_name: rules.cleanText(source.subject_name, 150),
    subject_id: rules.cleanInt(source.subject_id),
    class_id: rules.cleanInt(source.class_id),
    class_name: rules.cleanText(source.class_name, 100),
    grade: rules.cleanInt(source.grade),
    academic_year: rules.cleanInt(source.academic_year),
    term: rules.cleanInt(source.term),
    title: rules.cleanText(source.title, 255),
    topic: rules.cleanText(source.topic, 500),
    sub_topic: rules.cleanText(source.sub_topic, 500),
    introduction: rules.cleanMultiline(source.introduction, 8000),
    content: rules.cleanMultiline(source.content, 8000),
    summary: rules.cleanMultiline(source.summary, 8000),
    status: source.status === 'saved' ? 'saved' : 'draft',
    expected_updated_at: source.expected_updated_at ? String(source.expected_updated_at) : null,
    sections
  };
}

async function attachNoteSections(note) {
  const { rows } = await db.query(
    `SELECT id, heading, body, attachment_original_name, attachment_stored_name, display_order
     FROM lesson_note_sections WHERE lesson_note_id = $1 ORDER BY display_order, id`,
    [note.id]
  );
  note.sections = rows.map((row) => ({
    ...row,
    download_url: row.attachment_stored_name ? `/api/teacher/lesson-notes/attachments/${row.id}/file` : null
  }));
  return note;
}

async function getNote(actor, id) {
  await ready(actor);
  const { rows } = await db.query('SELECT * FROM lesson_notes WHERE id = $1 AND school_id = $2', [id, actor.schoolId]);
  const note = rows[0];
  if (!note || !rules.canReadPlan(actor, note)) throw httpError(404, 'Lesson note not found.');
  return attachNoteSections(note);
}

async function listNotes(actor, query) {
  await ready(actor);
  const params = [actor.schoolId];
  let teacherSql = '';
  if (!(actor.role === 'admin' || actor.isSuperadmin)) {
    params.push(actor.userId);
    teacherSql = ` AND n.teacher_id = $${params.length}`;
  }
  const search = rules.likeTerm(query.q || query.search);
  let searchSql = '';
  if (search) {
    params.push(search);
    searchSql = ` AND (n.title ILIKE $${params.length} OR n.topic ILIKE $${params.length} OR n.subject_name ILIKE $${params.length})`;
  }
  const page = rules.paginate(query.page, query.limit);
  const { rows } = await db.query(
    `SELECT n.*, u.full_name AS teacher_first_name, u.surname AS teacher_surname
     FROM lesson_notes n
     LEFT JOIN users u ON u.id = n.teacher_id
     WHERE n.school_id = $1 ${teacherSql} ${searchSql}
     ORDER BY n.updated_at DESC
     LIMIT ${page.limit} OFFSET ${page.offset}`,
    params
  );
  return { notes: rows, page: page.page, limit: page.limit };
}

async function saveNote(actor, noteId, body) {
  await ready(actor);
  const input = normaliseNote(body);
  if (!input.title) throw httpError(400, 'Lesson note title is required.');
  if (!input.subject_name || !input.grade || (!input.class_name && !input.class_id)) {
    throw httpError(400, 'Subject, grade, and class are required.');
  }
  await assertAuthorisedAllocation(actor, input);
  if (!input.academic_year || input.academic_year < 2000 || input.academic_year > 2100) {
    throw httpError(400, 'Academic year is required.');
  }
  if (!input.term || input.term < 1 || input.term > 4) {
    throw httpError(400, 'Term must be between 1 and 4.');
  }
  if (input.lesson_plan_id) {
    const plan = await fetchPlanRow(input.lesson_plan_id, actor.schoolId);
    if (!plan || !rules.canReadPlan(actor, plan)) throw httpError(403, 'That lesson plan cannot be linked.');
    if (Number(plan.teacher_id) !== Number(actor.userId) && actor.role !== 'admin') {
      throw httpError(403, 'That lesson plan cannot be linked.');
    }
  }

  const id = await withTransaction(async (client) => {
    let existing = null;
    if (noteId) {
      const current = await client.query(
        'SELECT * FROM lesson_notes WHERE id = $1 AND school_id = $2 FOR UPDATE',
        [noteId, actor.schoolId]
      );
      existing = current.rows[0];
      if (!existing || !rules.canWritePlan(actor, existing)) throw httpError(404, 'Lesson note not found.');
      if (input.expected_updated_at && new Date(existing.updated_at).getTime() !== new Date(input.expected_updated_at).getTime()) {
        throw httpError(409, 'This lesson note was updated in another session. Reload it before saving again.');
      }
    }
    let savedId;
    if (existing) {
      await client.query(
        `UPDATE lesson_notes SET
           lesson_plan_id = $1, subject_id = $2, subject_name = $3, class_id = $4, class_name = $5,
           grade = $6, academic_year = $7, term = $8, title = $9, topic = $10, sub_topic = $11,
           introduction = $12, content = $13, summary = $14, status = $15, updated_at = CURRENT_TIMESTAMP
         WHERE id = $16 AND teacher_id = $17`,
        [
          input.lesson_plan_id, input.subject_id, input.subject_name, input.class_id, input.class_name,
          input.grade, input.academic_year, input.term, input.title, input.topic || null, input.sub_topic || null,
          input.introduction || null, input.content || null, input.summary || null, input.status, existing.id, actor.userId
        ]
      );
      savedId = existing.id;
    } else {
      const inserted = await client.query(
        `INSERT INTO lesson_notes (
           school_id, teacher_id, lesson_plan_id, subject_id, subject_name, class_id, class_name,
           grade, academic_year, term, title, topic, sub_topic, introduction, content, summary, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING id`,
        [
          actor.schoolId, actor.userId, input.lesson_plan_id, input.subject_id, input.subject_name,
          input.class_id, input.class_name, input.grade, input.academic_year, input.term, input.title,
          input.topic || null, input.sub_topic || null, input.introduction || null, input.content || null,
          input.summary || null, input.status
        ]
      );
      savedId = inserted.rows[0].id;
    }
    const existingFiles = await client.query(
      'SELECT attachment_stored_name FROM lesson_note_sections WHERE lesson_note_id = $1 AND attachment_stored_name IS NOT NULL',
      [savedId]
    );
    const allowed = new Set(existingFiles.rows.map((row) => row.attachment_stored_name));
    await client.query('DELETE FROM lesson_note_sections WHERE lesson_note_id = $1', [savedId]);
    for (let i = 0; i < input.sections.length; i += 1) {
      const section = input.sections[i];
      const candidate = safeStoredName(section.attachment_stored_name);
      const stored = candidate && allowed.has(candidate) ? candidate : null;
      await client.query(
        `INSERT INTO lesson_note_sections
          (lesson_note_id, heading, body, attachment_original_name, attachment_stored_name, display_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [savedId, section.heading || 'Section', section.body || null, stored ? section.attachment_original_name : null, stored, i]
      );
    }
    return savedId;
  });
  return getNote(actor, id);
}

async function deleteNote(actor, id) {
  const note = await getNote(actor, id);
  if (!rules.canWritePlan(actor, note)) throw httpError(404, 'Lesson note not found.');
  await db.query('DELETE FROM lesson_notes WHERE id = $1 AND school_id = $2 AND teacher_id = $3', [id, actor.schoolId, actor.userId]);
  return { deleted: true };
}

async function addNoteAttachment(actor, noteId, sectionId, file) {
  const note = await getNote(actor, noteId);
  if (!rules.canWritePlan(actor, note)) throw httpError(404, 'Lesson note not found.');
  const { rows } = await db.query(
    `UPDATE lesson_note_sections
     SET attachment_original_name = $1, attachment_stored_name = $2
     WHERE id = $3 AND lesson_note_id = $4
     RETURNING id, heading, attachment_original_name, attachment_stored_name`,
    [file.originalName, file.storedName, sectionId, noteId]
  );
  if (!rows.length) throw httpError(404, 'Lesson note section not found.');
  return { ...rows[0], download_url: `/api/teacher/lesson-notes/attachments/${rows[0].id}/file` };
}

async function noteFile(actor, sectionId) {
  await ready(actor);
  const { rows } = await db.query(
    `SELECT s.attachment_stored_name, s.attachment_original_name, n.school_id, n.teacher_id
     FROM lesson_note_sections s
     JOIN lesson_notes n ON n.id = s.lesson_note_id
     WHERE s.id = $1`,
    [sectionId]
  );
  const row = rows[0];
  if (!row || !rules.canReadPlan(actor, row) || !row.attachment_stored_name) throw httpError(404, 'File not found.');
  return {
    absolutePath: materialFilePath(row.attachment_stored_name),
    downloadName: row.attachment_original_name || 'diagram'
  };
}

async function listTemplates(actor) {
  await ready(actor);
  const { rows } = await db.query(
    `SELECT t.id, t.school_id, t.teacher_id, t.template_name, t.visibility, t.created_at, t.updated_at,
            u.full_name AS teacher_first_name, u.surname AS teacher_surname
     FROM lesson_plan_templates t
     LEFT JOIN users u ON u.id = t.teacher_id
     WHERE t.school_id = $1 AND (t.teacher_id = $2 OR t.visibility = 'school' OR $3 = TRUE)
     ORDER BY t.updated_at DESC`,
    [actor.schoolId, actor.userId, actor.role === 'admin' || actor.isSuperadmin]
  );
  return rows;
}

async function getTemplate(actor, id) {
  await ready(actor);
  const { rows } = await db.query(
    'SELECT * FROM lesson_plan_templates WHERE id = $1 AND school_id = $2',
    [id, actor.schoolId]
  );
  const template = rows[0];
  if (!template) throw httpError(404, 'Template not found.');
  const visible = Number(template.teacher_id) === Number(actor.userId)
    || template.visibility === 'school'
    || actor.role === 'admin'
    || actor.isSuperadmin;
  if (!visible) throw httpError(404, 'Template not found.');
  return template;
}

async function saveTemplateRecord(actor, templateId, body) {
  await ready(actor);
  const name = rules.cleanText(body.template_name, 200);
  if (!name) throw httpError(400, 'Template name is required.');
  const visibility = body.visibility === 'school' ? 'school' : 'private';
  const content = body.template_content && typeof body.template_content === 'object'
    ? rules.buildTemplateContent(body.template_content)
    : { objectives: [], materials: [], methods: [], references: [], stages: [], evaluations: [], assignments: [] };
  if (rules.templateHasIdentity(content)) {
    throw httpError(400, 'Templates cannot store school or teacher identity.');
  }
  if (templateId) {
    const existing = await getTemplate(actor, templateId);
    if (Number(existing.teacher_id) !== Number(actor.userId)) throw httpError(403, 'You can only edit your own templates.');
    const { rows } = await db.query(
      `UPDATE lesson_plan_templates
       SET template_name = $1, template_content = $2::jsonb, visibility = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND teacher_id = $5
       RETURNING id, template_name, visibility, updated_at`,
      [name, JSON.stringify(content), visibility, templateId, actor.userId]
    );
    return rows[0];
  }
  const { rows } = await db.query(
    `INSERT INTO lesson_plan_templates (school_id, teacher_id, template_name, template_content, visibility, source_lesson_plan_id)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     RETURNING id, template_name, visibility, updated_at`,
    [actor.schoolId, actor.userId, name, JSON.stringify(content), visibility, rules.cleanInt(body.source_lesson_plan_id)]
  );
  return rows[0];
}

async function templateFromPlan(actor, planId, body) {
  const plan = await getPlan(actor, planId);
  if (!rules.canWritePlan(actor, plan)) throw httpError(404, 'Lesson plan not found.');
  return saveTemplateRecord(actor, null, {
    template_name: body.template_name || (plan.topic ? `${plan.topic} template` : 'Lesson template'),
    visibility: body.visibility,
    template_content: plan,
    source_lesson_plan_id: plan.id
  });
}

async function deleteTemplate(actor, id) {
  const template = await getTemplate(actor, id);
  if (Number(template.teacher_id) !== Number(actor.userId)) throw httpError(403, 'You can only delete your own templates.');
  await db.query('DELETE FROM lesson_plan_templates WHERE id = $1 AND teacher_id = $2', [id, actor.userId]);
  return { deleted: true };
}

async function applyTemplate(actor, templateId, body) {
  const template = await getTemplate(actor, templateId);
  const identity = rules.normalisePlanInput(body);
  const merged = rules.applyTemplateContent(template.template_content, identity);
  return savePlan(actor, null, merged);
}

async function homeworkOptions(actor, query) {
  await ready(actor);
  await db.query('ALTER TABLE homework_assignments ADD COLUMN IF NOT EXISTS school_id INTEGER').catch(() => {});
  const params = [actor.userId, actor.schoolId];
  let extra = '';
  if (query.subject) {
    params.push(rules.cleanText(query.subject, 150));
    extra += ` AND LOWER(subject) = LOWER($${params.length})`;
  }
  if (query.grade) {
    params.push(rules.cleanInt(query.grade));
    extra += ` AND grade = $${params.length}`;
  }
  const { rows } = await db.query(
    `SELECT id, title, subject, grade, due_date, description
     FROM homework_assignments
     WHERE teacher_id = $1 AND (school_id = $2 OR school_id IS NULL) ${extra}
     ORDER BY created_at DESC
     LIMIT 50`,
    params
  );
  return rows;
}

module.exports = {
  materialDirectory,
  httpError,
  actorFromReq,
  getContext,
  dashboard,
  listPlans,
  getPlan,
  savePlan,
  deletePlan,
  duplicatePlan,
  progress,
  calendar,
  addMaterialFile,
  materialFile,
  listNotes,
  getNote,
  saveNote,
  deleteNote,
  addNoteAttachment,
  noteFile,
  listTemplates,
  getTemplate,
  saveTemplateRecord,
  templateFromPlan,
  deleteTemplate,
  applyTemplate,
  homeworkOptions,
  loadAllocations
};
