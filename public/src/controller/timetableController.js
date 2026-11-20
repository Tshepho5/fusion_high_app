const db = require('../../../db/db');
const { resolveSchoolId } = require('../services/schoolScope');
const { parseGrade, parseAcademicYear } = require('../../../lib/academicContext');
const { teacherOwnsSlot, offeredSubjectNames } = require('../../../lib/teacherSlot');
const { buildClassProposal } = require('../../../lib/timetableGeneration');
const { selectPublishedClass, teacherCanPublish, parseTimetableData } = require('../../../lib/timetableAccess');
const emailService = require('../services/emailService');
const NotificationService = require('../services/notificationService');
const { isIsolatedRuntime } = require('../../../lib/testSafety');

const PERIODS_1_HOUR = [
    '08:00 - 09:00',
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:45 - 12:45',
    '12:45 - 13:45',
    '13:45 - 14:45'
];

// Ensure timetables table is initialized with grade, stream, status, and school_id columns
async function ensureTimetablesTable() {
    if (isIsolatedRuntime()) return;
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS timetables (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                grade INT DEFAULT 10,
                stream VARCHAR(100) DEFAULT 'General',
                timetable_data JSONB NOT NULL,
                status VARCHAR(50) DEFAULT 'draft_teachers',
                is_active BOOLEAN DEFAULT TRUE,
                school_id INT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE timetables ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft_teachers';
            ALTER TABLE timetables ADD COLUMN IF NOT EXISTS grade INT DEFAULT 10;
            ALTER TABLE timetables ADD COLUMN IF NOT EXISTS stream VARCHAR(100) DEFAULT 'General';
            ALTER TABLE timetables ADD COLUMN IF NOT EXISTS school_id INT;
            ALTER TABLE timetables ADD COLUMN IF NOT EXISTS created_by INT;
            ALTER TABLE timetables ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
            ALTER TABLE timetables ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE timetables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);
    } catch (e) {
        console.error('Error ensuring timetables table:', e);
    }
}
ensureTimetablesTable();

/**
 * Resolves the active school ID from token, query, header, or body.
 */
const getSchoolIdFromReq = (req) => resolveSchoolId(req);

function missingSchool(res, schoolId) {
    if (schoolId) return false;
    res.status(400).json({ error: 'Choose a school before opening a timetable.' });
    return true;
}

async function offeringsAvailable(schoolId, year, grade) {
    const ready = await db.query("SELECT to_regclass('public.school_subject_offerings') AS reg");
    if (!ready.rows[0] || !ready.rows[0].reg) {
        return { ready: false, subjects: [] };
    }
    const offeringRes = await db.query(
        `SELECT subject_name FROM school_subject_offerings
         WHERE school_id = $1 AND academic_year = $2 AND grade = $3 AND is_active = TRUE
         ORDER BY subject_name`,
        [schoolId, year, grade]
    );
    return { ready: true, subjects: offeredSubjectNames(offeringRes.rows) };
}

async function assignmentsForGrade(schoolId, grade) {
    const result = await db.query(
        `SELECT ta.teacher_id, ta.subject_name, ta.grade_level, ta.class_name, ta.class_id,
                u.full_name, u.surname
         FROM teacher_assignments ta
         JOIN users u ON u.id = ta.teacher_id
         WHERE u.school_id = $1 AND ta.grade_level = $2`,
        [schoolId, grade]
    );
    return result.rows;
}

exports.generateAITimetable = async (req, res) => {
    const gradeCheck = parseGrade(req.body && req.body.grade);
    const stream = String((req.body && req.body.stream) || '').trim();
    const yearCheck = parseAcademicYear(req.body && (req.body.academic_year || req.body.academicYear));
    if (!gradeCheck.ok) return res.status(400).json({ error: gradeCheck.message });
    if (!stream) return res.status(400).json({ error: 'Choose the class stream.' });
    if (!yearCheck.ok) return res.status(400).json({ error: yearCheck.message });
    const schoolId = getSchoolIdFromReq(req);
    if (missingSchool(res, schoolId)) return;
    const targetGrade = gradeCheck.grade;
    const targetSubject = String((req.body && req.body.target_subject) || '').trim();

    try {
        const classesRes = await db.query(
            `SELECT id, name, grade, stream, room_number
             FROM classes
             WHERE school_id = $1 AND grade = $2 AND stream = $3
               AND COALESCE(ownership_quarantine, FALSE) = FALSE
             ORDER BY name`,
            [schoolId, targetGrade, stream]
        );
        if (classesRes.rows.length === 0) {
            return res.status(400).json({ error: 'This school has no classes recorded for that grade and stream.' });
        }
        const offerings = await offeringsAvailable(schoolId, yearCheck.year, targetGrade);
        if (!offerings.ready) {
            return res.status(400).json({
                error: 'This school has no subject-offering records yet. An administrator must configure the subjects for this grade and year before a timetable can be generated.'
            });
        }
        let subjects = offerings.subjects;
        if (subjects.length === 0) {
            return res.status(400).json({ error: 'This school has no subjects configured for that grade and year.' });
        }
        if (targetSubject && !subjects.includes(targetSubject)) {
            return res.status(400).json({ error: 'That subject is not offered by this school for the selected grade.' });
        }
        if (targetSubject) {
            subjects = [targetSubject, ...subjects.filter((name) => name !== targetSubject)];
        }
        const assignments = await assignmentsForGrade(schoolId, targetGrade);
        const proposal = buildClassProposal({
            classes: classesRes.rows,
            subjects,
            assignments,
            periods: PERIODS_1_HOUR,
            maxDailySlots: parseInt(req.body && req.body.max_teacher_daily_slots, 10) || 3
        });
        if (proposal.filled_count === 0) {
            return res.status(400).json({
                error: 'No timetable was produced. Teacher assignments do not cover the configured subjects for these classes.',
                gaps: proposal.gaps,
                saved: false
            });
        }
        res.json({
            message: 'This is an unsaved proposal. Existing timetables were not changed.',
            saved: false,
            status: 'proposal',
            timetable_data: proposal.timetable_data,
            gaps: proposal.gaps,
            filled_count: proposal.filled_count,
            classes: classesRes.rows,
            periods: PERIODS_1_HOUR,
            generation_details: { grade: targetGrade, stream, academic_year: yearCheck.year, school_id: schoolId }
        });
    } catch (err) {
        console.error('Error generating timetable preview:', err);
        res.status(500).json({ error: 'Failed to generate timetable preview.' });
    }
};

exports.generateSchoolWideTimetable = async (req, res) => {
    const schoolId = getSchoolIdFromReq(req);
    if (missingSchool(res, schoolId)) return;
    const yearCheck = parseAcademicYear(req.body && (req.body.academic_year || req.body.academicYear));
    if (!yearCheck.ok) return res.status(400).json({ error: yearCheck.message });

    try {
        const classesRes = await db.query(
            `SELECT id, name, grade, stream, room_number
             FROM classes
             WHERE school_id = $1 AND COALESCE(ownership_quarantine, FALSE) = FALSE
             ORDER BY grade, name`,
            [schoolId]
        );
        const grades = [...new Set(classesRes.rows.map((row) => Number(row.grade)).filter((grade) => Number.isInteger(grade)))];
        if (grades.length === 0) {
            return res.status(400).json({ error: 'This school has no classes recorded for a timetable.' });
        }
        const proposals = [];
        const skipped = [];
        for (const grade of grades) {
            const gradeClasses = classesRes.rows.filter((row) => Number(row.grade) === grade);
            const offerings = await offeringsAvailable(schoolId, yearCheck.year, grade);
            if (!offerings.ready) {
                return res.status(400).json({
                    error: 'This school has no subject-offering records yet. An administrator must configure the subjects for each grade and year before a timetable can be generated.',
                    saved: false
                });
            }
            if (offerings.subjects.length === 0) {
                skipped.push({ grade, reason: 'No subjects are configured for this grade and year.' });
                continue;
            }
            const assignments = await assignmentsForGrade(schoolId, grade);
            const proposal = buildClassProposal({
                classes: gradeClasses,
                subjects: offerings.subjects,
                assignments,
                periods: PERIODS_1_HOUR
            });
            if (proposal.filled_count === 0) {
                skipped.push({ grade, reason: 'No teacher assignment could be placed for this grade.', gaps: proposal.gaps });
                continue;
            }
            proposals.push({
                grade,
                streams: [...new Set(gradeClasses.map((row) => String(row.stream || '').trim()).filter(Boolean))],
                timetable_data: proposal.timetable_data,
                gaps: proposal.gaps,
                filled_count: proposal.filled_count,
                saved: false
            });
        }
        if (proposals.length === 0) {
            return res.status(400).json({
                error: 'No timetable was produced from this school\'s classes, subjects, and teacher assignments.',
                skipped,
                saved: false
            });
        }
        res.json({
            message: 'These are unsaved proposals for the classes this school has recorded. Existing timetables were not changed.',
            saved: false,
            proposals,
            skipped
        });
    } catch (err) {
        console.error('Error generating school-wide timetable:', err);
        res.status(500).json({ error: 'Failed to generate school-wide timetable.' });
    }
};

/**
 * ADMIN / PRINCIPAL: Publishes master timetable draft to educators for subject review.
 * Timetable remains in 'draft_teachers' status until educators confirm and release it to learners.
 */
exports.publishToTeachers = async (req, res) => {
    const { timetable_data, generation_details, name } = req.body;
    const gradeCheck = parseGrade(generation_details && generation_details.grade);
    const stream = String((generation_details && generation_details.stream) || '').trim();
    const yearCheck = parseAcademicYear(generation_details && (generation_details.academic_year || generation_details.academicYear));
    if (!gradeCheck.ok) return res.status(400).json({ error: gradeCheck.message });
    if (!stream) return res.status(400).json({ error: 'Choose the class stream.' });
    if (!yearCheck.ok) return res.status(400).json({ error: yearCheck.message });
    const grade = gradeCheck.grade;
    const adminId = req.user ? req.user.id : null;
    const schoolId = getSchoolIdFromReq(req);
    if (missingSchool(res, schoolId)) return;

    if (!timetable_data) {
        return res.status(400).json({ error: 'Missing timetable data to publish.' });
    }

    try {
        const timetableName = name || `Grade ${grade} (${stream}) ${yearCheck.year} timetable draft`;

        const result = await db.query(
            `INSERT INTO timetables (name, grade, stream, timetable_data, status, is_active, school_id, created_by, updated_at) 
             VALUES ($1, $2, $3, $4, 'draft_teachers', FALSE, $5, $6, NOW()) RETURNING *`,
            [timetableName, grade, stream, JSON.stringify(timetable_data), schoolId, adminId]
        );

        // Fetch educators of THIS school who teach this grade
        const teachersRes = await db.query(
            `SELECT u.id, u.full_name, u.email 
             FROM users u 
             JOIN employees e ON u.id = e.user_id 
             WHERE u.school_id = $2 AND ($1 = ANY(e.grades_taught) OR e.grades_taught IS NULL OR ARRAY_LENGTH(e.grades_taught, 1) = 0)`,
            [grade, schoolId]
        );

        const notifySubject = `Educator Review Required: Grade ${grade} (${stream}) Timetable Draft`;
        const notifyBody = `Administration has generated the 1-hour weekly timetable draft for Grade ${grade} (${stream}). Please inspect your subject slots in your Educator Portal. Once all subject allocations are verified, you can release the schedule to your learners.`;

        // Send in-app notification to assigned teachers (Notification Icon)
        const assignedTeacherIds = teachersRes.rows.map(t => t.id).filter(Boolean);
        if (assignedTeacherIds.length > 0) {
            await NotificationService.sendToUsers(assignedTeacherIds, {
                title: notifySubject,
                message: notifyBody,
                type: 'timetable',
                category: 'timetable',
                actionUrl: `/dashboard/teacher?tab=timetable`
            }).catch(e => console.warn('Timetable draft notification error:', e.message));
        }

        for (const teacher of teachersRes.rows) {

            if (teacher.email) {
                emailService.sendTimetableDraftToTeacher({
                    teacherName: teacher.full_name,
                    teacherEmail: teacher.email,
                    grade,
                    stream,
                    timetableName
                }).catch(err => console.error(`[EMAIL ERROR] Timetable draft email to ${teacher.email}:`, err.message));
            }
        }

        // Broadcast teacher notice safely
        try {
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS role_target VARCHAR(50) DEFAULT 'all'`);
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_id INTEGER`);
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS grade_target INTEGER`);
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS stream_target VARCHAR(50)`);
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS school_id INTEGER`);

            await db.query(
                `INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target, school_id)
                 VALUES ($1, $2, 'teacher', $3, $4, $5, $6)`,
                [
                    `Timetable Draft Live for Review: Grade ${grade} (${stream})`,
                    `The 1-hour class schedule draft for Grade ${grade} (${stream}) has been sent by Administration. Please check your assigned subject periods and release to learners once confirmed.`,
                    adminId,
                    grade,
                    stream,
                    schoolId
                ]
            );
        } catch (annErr) {
            console.warn('Could not dispatch teacher review announcement:', annErr.message);
        }

        res.json({
            message: `Timetable draft successfully distributed to Grade ${grade} educators via email and portal!`,
            timetable: result.rows[0],
            target_teachers_count: teachersRes.rows.length
        });
    } catch (err) {
        console.error('Error publishing timetable to teachers:', err);
        res.status(500).json({ error: 'Failed to publish timetable: ' + err.message });
    }
};

/**
 * TEACHER: Gets timetables assigned to this teacher with dedicated personal slot synthesis.
 */
exports.getTeacherTimetables = async (req, res) => {
    const teacherId = req.user.id;
    const schoolId = resolveSchoolId(req);
    if (missingSchool(res, schoolId)) return;
    try {
        const [empRes, userRes] = await Promise.all([
            db.query('SELECT grades_taught, subjects FROM employees WHERE user_id = $1', [teacherId]),
            db.query('SELECT full_name, surname FROM users WHERE id = $1 AND school_id = $2', [teacherId, schoolId])
        ]);
        const grades = Array.isArray(empRes.rows[0]?.grades_taught) ? empRes.rows[0].grades_taught.filter((grade) => Number.isInteger(Number(grade))) : [];
        if (grades.length === 0) {
            return res.json({
                timetables: [],
                personal_schedule: { Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {} },
                my_slots: [],
                message: 'No grades are assigned to this teacher.'
            });
        }
        const teacherName = userRes.rows[0] ? `${userRes.rows[0].full_name} ${userRes.rows[0].surname || ''}`.trim() : '';
        const assignmentRes = await db.query(
            `SELECT teacher_id, subject_name, class_name, grade_level
             FROM teacher_assignments
             WHERE teacher_id = $1`,
            [teacherId]
        ).catch(() => ({ rows: [] }));

        const { rows } = await db.query(
            `SELECT * FROM timetables 
             WHERE school_id = $1 AND grade = ANY($2::int[])
             ORDER BY updated_at DESC`,
            [schoolId, grades]
        );

        // Build personalized timetable slots for this teacher across all active grades & classes
        const mySlots = [];
        const personalTimetable = {
            Monday: {},
            Tuesday: {},
            Wednesday: {},
            Thursday: {},
            Friday: {}
        };

        rows.forEach(tt => {
            const data = typeof tt.timetable_data === 'string' ? JSON.parse(tt.timetable_data) : tt.timetable_data;
            if (!data) return;

            Object.keys(data).forEach(className => {
                const classDays = data[className];
                ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
                    const daySlots = classDays?.[day];
                    if (!daySlots) return;

                    Object.keys(daySlots).forEach(period => {
                        const slot = daySlots[period];
                        if (slot && teacherOwnsSlot(slot, className, teacherId, assignmentRes.rows)) {
                            const isMatch = true;

                            if (isMatch) {
                                const entry = {
                                    timetable_id: tt.id,
                                    grade: tt.grade,
                                    class_name: className,
                                    day,
                                    period,
                                    subject: slot.subject,
                                    teacher: slot.teacher,
                                    room: slot.room || null,
                                    duration: slot.duration || '1 Hour (60 min)',
                                    lesson_focus: slot.lesson_focus
                                };
                                mySlots.push(entry);
                                personalTimetable[day][period] = entry;
                            }
                        }
                    });
                });
            });
        });

        res.json({
            timetables: rows,
            personal_schedule: personalTimetable,
            my_slots: mySlots,
            teacher_name: teacherName
        });
    } catch (err) {
        console.error('Error fetching teacher timetables:', err);
        res.status(500).json({ error: 'Failed to load teacher timetables.' });
    }
};

/**
 * TEACHER: Officially verifies subject allocations and publishes timetable to learners & parents.
 */
exports.teacherPublishToLearners = async (req, res) => {
    const { timetable_id } = req.body;
    const teacherId = req.user.id;
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ error: 'Choose a school before opening a timetable.' });
    if (!timetable_id) return res.status(400).json({ error: 'Choose the timetable draft to publish.' });

    try {
        const ttRes = await db.query(
            `SELECT t.*, r.name AS author_role
             FROM timetables t
             LEFT JOIN users u ON u.id = t.created_by
             LEFT JOIN roles r ON r.id = u.role_id
             WHERE t.id = $1 AND t.school_id = $2`,
            [timetable_id, schoolId]
        );
        const tt = ttRes.rows[0];

        if (!tt) {
            return res.status(404).json({ error: 'Timetable not found for this school to publish.' });
        }
        if (tt.status !== 'draft_teachers') {
            return res.status(409).json({ error: 'Only a timetable draft can be published.' });
        }
        if (!tt.grade || !String(tt.stream || '').trim()) {
            return res.status(400).json({ error: 'This draft has no grade or stream, so it cannot be published.' });
        }

        const grade = tt.grade;
        const stream = tt.stream;
        const draftData = parseTimetableData(tt.timetable_data) || {};
        const classNames = Object.keys(draftData);
        const [assignmentRes, classRes] = await Promise.all([
            db.query(
                `SELECT ta.teacher_id, ta.class_name
                 FROM teacher_assignments ta
                 JOIN users u ON u.id = ta.teacher_id
                 WHERE ta.teacher_id = $1 AND u.school_id = $2`,
                [teacherId, schoolId]
            ),
            db.query(
                `SELECT name, assigned_teacher_id, homeroom_teacher_id
                 FROM classes
                 WHERE school_id = $1 AND grade = $2`,
                [schoolId, grade]
            )
        ]);
        if (!teacherCanPublish({
            role: req.user.role,
            teacherId,
            classNames,
            assignments: assignmentRes.rows,
            classRows: classRes.rows,
            createdBy: tt.created_by,
            authorRole: tt.author_role
        })) {
            return res.status(403).json({ error: 'You can publish your own class draft, or a school draft for classes assigned to you. Another teacher’s draft stays with that teacher.' });
        }

        const updatedRes = await db.query(
            `UPDATE timetables 
             SET status = 'published_to_learners',
                 is_active = TRUE,
                 updated_at = NOW() 
             WHERE id = $1 AND school_id = $2 AND status = 'draft_teachers' RETURNING *`,
            [tt.id, schoolId]
        );
        await db.query(
            `UPDATE timetables
             SET status = 'archived', is_active = FALSE, updated_at = NOW()
             WHERE school_id = $1 AND grade = $2 AND stream = $3 AND id <> $4
               AND status = 'published_to_learners' AND is_active = TRUE`,
            [schoolId, grade, stream, tt.id]
        );

        // Fetch learners and linked parents for this grade in THIS school with email addresses
        const learnersRes = await db.query(
            `SELECT c.id as child_id, c.learner_user_id, c.parent_id, c.full_name, c.surname,
                    u_l.email as learner_email, u_p.email as parent_email
             FROM children c
             LEFT JOIN users u_l ON c.learner_user_id = u_l.id
             LEFT JOIN users u_p ON c.parent_id = u_p.id
             WHERE c.grade = $1 AND c.school_id = $2`,
            [grade, schoolId]
        );

        const notifySubject = `Official Timetable Released: Grade ${grade} (${stream})`;
        const notifyBody = `Your subject educators have verified and officially published the 1-hour weekly class schedule for Grade ${grade} (${stream}). Check your Timetable tab for periods and room allocations.`;

        // Send in-app notification to learners and parents (Notification Icon)
        const recipientUserIds = [
            ...learnersRes.rows.map(r => r.learner_user_id).filter(Boolean),
            ...learnersRes.rows.map(r => r.parent_id).filter(Boolean)
        ];
        if (recipientUserIds.length > 0) {
            await NotificationService.sendToUsers(recipientUserIds, {
                title: notifySubject,
                message: notifyBody,
                type: 'timetable',
                category: 'timetable',
                actionUrl: '/dashboard'
            }).catch(e => console.warn('Timetable release notification error:', e.message));
        }

        for (const record of learnersRes.rows) {
            if (record.learner_user_id && record.learner_email) {
                emailService.sendTimetableReleased({
                    recipientName: `${record.full_name} ${record.surname || ''}`.trim(),
                    email: record.learner_email,
                    grade,
                    stream,
                    timetableName: tt.name
                }).catch(err => console.error(`[EMAIL ERROR] Timetable released email to learner ${record.learner_email}:`, err.message));
            }
            if (record.parent_id && record.parent_email) {
                emailService.sendTimetableReleased({
                    recipientName: 'Parent / Guardian',
                    email: record.parent_email,
                    grade,
                    stream,
                    timetableName: tt.name
                }).catch(err => console.error(`[EMAIL ERROR] Timetable released email to parent ${record.parent_email}:`, err.message));
            }
        }

        // Broadcast school-wide release notice safely
        try {
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS role_target VARCHAR(50) DEFAULT 'all'`);
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_id INTEGER`);
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS grade_target INTEGER`);
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS stream_target VARCHAR(50)`);
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS school_id INTEGER`);

            await db.query(
                `INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target, school_id)
                 VALUES ($1, $2, 'all', $3, $4, $5, $6)`,
                [
                    `Official Class Timetable Released: Grade ${grade} (${stream})`,
                    `Subject educators have finalized and published the official 1-hour class timetable for Grade ${grade} (${stream}). Real-time schedules are now active for learners and parents.`,
                    teacherId,
                    grade,
                    stream,
                    schoolId
                ]
            );
        } catch (annErr) {
            console.warn('Could not dispatch timetable release announcement:', annErr.message);
        }

        res.json({
            message: `Timetable officially released to Grade ${grade} learners and parents via email and portal!`,
            timetable: updatedRes.rows[0],
            target_learners_count: learnersRes.rows.length
        });
    } catch (err) {
        console.error('Error publishing timetable to learners:', err);
        res.status(500).json({ error: 'Failed to publish timetable to learners: ' + err.message });
    }
};

/**
 * LEARNER: Gets active published timetable for the learner's grade, stream, and school.
 */
exports.getLearnerTimetable = async (req, res) => {
    try {
        const learnerUser = req.user.id;
        const childRes = await db.query(
            `SELECT c.grade, c.school_id, c.class_id, cl.name AS class_name, cl.school_id AS class_school_id
             FROM children c
             LEFT JOIN classes cl ON cl.id = c.class_id
             WHERE c.learner_user_id = $1`,
            [learnerUser]
        );
        const child = childRes.rows[0];
        const schoolId = child && parseInt(child.school_id, 10);
        const actorSchool = resolveSchoolId(req);
        const grade = child && parseInt(child.grade, 10);
        const className = child && child.class_school_id && parseInt(child.class_school_id, 10) === schoolId
            ? child.class_name
            : null;
        if (!schoolId || !grade || (actorSchool && actorSchool !== schoolId)) {
            return res.json({ timetables: [], message: 'No published timetable is available for this learner.' });
        }
        if (!className) {
            return res.json({ timetables: [], message: 'No class is recorded for this learner.' });
        }

        const { rows } = await db.query(
            `SELECT * FROM timetables 
             WHERE school_id = $1 AND grade = $2 AND status = 'published_to_learners' AND is_active = TRUE`,
            [schoolId, grade]
        );
        const selected = selectPublishedClass(rows, className);
        if (!selected.ok) {
            const message = selected.code === 'ambiguous'
                ? 'More than one published timetable matches this class.'
                : 'No published timetable is available for this class.';
            return res.json({ timetables: [], message });
        }
        res.json({ timetables: [selected.timetable], class_name: className });
    } catch (err) {
        console.error('Error fetching learner timetable:', err);
        res.status(500).json({ error: 'Failed to retrieve timetable.' });
    }
};

/**
 * PARENT: Gets active published timetable for a selected child.
 */
exports.getChildTimetable = async (req, res) => {
    const childId = req.query.child_id || req.query.childId;
    try {
        const parentId = req.user && req.user.id;
        if (!childId || !parentId) return res.status(400).json({ error: 'Choose a linked child.' });
        const childRes = await db.query(
            `SELECT c.grade, c.school_id, cl.name AS class_name, cl.school_id AS class_school_id
             FROM children c
             LEFT JOIN classes cl ON cl.id = c.class_id
             WHERE c.id = $1
               AND (c.parent_id = $2 OR c.secondary_parent_id = $2 OR EXISTS (
                    SELECT 1 FROM parent_children pc WHERE pc.child_id = c.id AND pc.parent_id = $2
               ))`,
            [childId, parentId]
        );
        const child = childRes.rows[0];
        const schoolId = child && parseInt(child.school_id, 10);
        const grade = child && parseInt(child.grade, 10);
        const className = child && child.class_school_id && parseInt(child.class_school_id, 10) === schoolId
            ? child.class_name
            : null;
        if (!child || !schoolId || !grade) return res.status(404).json({ error: 'Child not found.' });
        if (!className) return res.status(404).json({ error: 'No class is recorded for this learner.' });

        const { rows } = await db.query(
            `SELECT * FROM timetables 
             WHERE school_id = $1 AND grade = $2 AND status = 'published_to_learners' AND is_active = TRUE`,
            [schoolId, grade]
        );
        const selected = selectPublishedClass(rows, className);
        if (!selected.ok) return res.json(null);
        res.json(selected.timetable);
    } catch (err) {
        console.error('Error fetching child timetable:', err);
        res.status(500).json({ error: 'Failed to retrieve child timetable.' });
    }
};

/**
 * Retrieves all timetables for Admin master view filtered by school.
 */
exports.getTimetables = async (req, res) => {
    try {
        const schoolId = getSchoolIdFromReq(req);
        if (missingSchool(res, schoolId)) return;
        const { rows } = await db.query('SELECT * FROM timetables WHERE school_id = $1 ORDER BY grade, created_at DESC', [schoolId]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching timetables:', err);
        res.status(500).json({ error: 'Failed to retrieve timetables.' });
    }
};

exports.getTimetableById = async (req, res) => {
    const { id } = req.params;
    const schoolId = getSchoolIdFromReq(req);
    if (missingSchool(res, schoolId)) return;
    try {
        const { rows } = await db.query('SELECT * FROM timetables WHERE id = $1 AND school_id = $2', [id, schoolId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Timetable not found for this school.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

function cleanTimetableClassName(name) {
    return String(name || '')
        .replace(/\s*[•·-]\s*school\s*\d+/gi, '')
        .replace(/\bschool\s*\d+\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function describeTimetable(grade, stream, classNames = []) {
    const classes = [...new Set(classNames.map(cleanTimetableClassName).filter(Boolean))];
    const who = classes.length ? classes.join(', ') : `Grade ${grade}`;
    const streamText = stream && !/multi-stream/i.test(String(stream)) ? String(stream) : '';
    return streamText ? `${who} (${streamText})` : who;
}

exports.deleteTimetable = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user ? req.user.id : null;
    const schoolId = getSchoolIdFromReq(req);
    if (missingSchool(res, schoolId)) return;

    try {
        let grade = null;
        let stream = '';
        let classNames = [];
        let deleted = false;

        // 1. Fetch timetable details before deletion if present
        if (id && !isNaN(parseInt(id, 10))) {
            const ttRes = await db.query('SELECT * FROM timetables WHERE id = $1 AND school_id = $2', [parseInt(id, 10), schoolId]);
            if (ttRes.rows.length > 0) {
                const tt = ttRes.rows[0];
                grade = tt.grade;
                stream = tt.stream || '';
                try {
                    const data = typeof tt.timetable_data === 'string' ? JSON.parse(tt.timetable_data) : tt.timetable_data;
                    classNames = Object.keys(data || {});
                } catch (e) {}
                await db.query(
                    `UPDATE timetables SET status = 'archived', is_active = FALSE, updated_at = NOW()
                     WHERE id = $1 AND school_id = $2 AND status <> 'archived'`,
                    [parseInt(id, 10), schoolId]
                );
                deleted = true;
            }
        } else {
            const named = await db.query('SELECT * FROM timetables WHERE (name ILIKE $1 OR id::text = $1) AND school_id = $2', [`%${id}%`, schoolId]);
            if (named.rows[0]) {
                grade = named.rows[0].grade;
                stream = named.rows[0].stream || '';
                await db.query(
                    `UPDATE timetables SET status = 'archived', is_active = FALSE, updated_at = NOW()
                     WHERE id = $1 AND school_id = $2 AND status <> 'archived'`,
                    [named.rows[0].id, schoolId]
                );
                deleted = true;
            }
        }

        if (!deleted) {
            return res.status(404).json({ error: 'Timetable not found for this school.' });
        }

        const timetableLabel = describeTimetable(grade, stream, classNames);

        // 3. Post notification to announcements specifically for educators of this deleted class/grade
        try {
            await db.query(
                `INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target, school_id, created_at)
                 VALUES ($1, $2, 'teacher', $3, $4, $5, $6, NOW())`,
                [
                    `Timetable Deleted: ${timetableLabel}`,
                    `Notice to Educators: The class timetable for ${timetableLabel} has been removed and reset by Administration. Previous teaching allocations for these classes are now open for new schedule generation.`,
                    adminId,
                    grade,
                    stream && !/multi-stream/i.test(stream) ? stream : null,
                    schoolId
                ]
            );
        } catch (annErr) {
            console.warn('Could not dispatch timetable deletion announcement:', annErr.message);
        }

        // 4. Send direct message notification to educators teaching this grade/class in THIS school
        try {
            const teachersRes = await db.query(
                `SELECT u.id, u.full_name 
                 FROM users u 
                 JOIN employees e ON u.id = e.user_id 
                 WHERE u.school_id = $2 AND ($1 = ANY(e.grades_taught) OR e.grades_taught IS NULL OR ARRAY_LENGTH(e.grades_taught, 1) = 0)`,
                [grade, schoolId]
            );

            const notifySubject = `Timetable Reset Notice: ${timetableLabel}`;
            const notifyBody = `Administration has deleted and reset the timetable for ${timetableLabel}. A new schedule will be published when it is ready.`;

            const resetTeacherIds = teachersRes.rows.map(t => t.id).filter(Boolean);
            if (resetTeacherIds.length > 0) {
                await NotificationService.sendToUsers(resetTeacherIds, {
                    title: notifySubject,
                    message: notifyBody,
                    type: 'timetable',
                    category: 'timetable',
                    actionUrl: '/dashboard/teacher?tab=timetable'
                }).catch(e => console.warn('Timetable reset notification error:', e.message));
            }
        } catch (msgErr) {
            console.warn('Could not dispatch direct teacher messages:', msgErr.message);
        }

        res.json({
            success: true,
            message: `Timetable archived. The record remains available as history.`
        });
    } catch (err) {
        console.error('Error deleting timetable:', err);
        res.status(500).json({ error: 'Failed to delete timetable: ' + err.message });
    }
};

exports.updateTimetable = async (req, res) => {
    const { id } = req.params;
    const schoolId = getSchoolIdFromReq(req);
    if (missingSchool(res, schoolId)) return;
    const { timetable_data } = req.body;
    if (req.body && req.body.status === 'published_to_learners') {
        return res.status(403).json({ error: 'Use the timetable publication action. A status change alone cannot publish a timetable.' });
    }
    try {
        const existing = await db.query(
            `SELECT t.id, t.status, t.timetable_data, t.grade, t.created_by, r.name AS author_role
             FROM timetables t
             LEFT JOIN users u ON u.id = t.created_by
             LEFT JOIN roles r ON r.id = u.role_id
             WHERE t.id = $1 AND t.school_id = $2`,
            [id, schoolId]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Timetable not found for this school.' });
        if (existing.rows[0].status !== 'draft_teachers') {
            return res.status(409).json({ error: 'A published timetable is kept as history. Save a new draft instead of changing it.' });
        }
        const role = String(req.user && req.user.role || '').toLowerCase();
        if (role === 'teacher' || role === 'class_teacher') {
            if (existing.rows[0].created_by && String(existing.rows[0].created_by) !== String(req.user.id) && String(existing.rows[0].author_role || '').toLowerCase() === 'teacher') {
                return res.status(403).json({ error: 'Another teacher’s draft can be changed only by that teacher or a school admin.' });
            }
            const data = parseTimetableData(timetable_data) || parseTimetableData(existing.rows[0].timetable_data) || {};
            const [assignmentRes, classRes] = await Promise.all([
                db.query(
                    `SELECT ta.teacher_id, ta.class_name
                     FROM teacher_assignments ta
                     JOIN users u ON u.id = ta.teacher_id
                     WHERE ta.teacher_id = $1 AND u.school_id = $2`,
                    [req.user.id, schoolId]
                ),
                db.query('SELECT name, assigned_teacher_id, homeroom_teacher_id FROM classes WHERE school_id = $1 AND grade = $2', [schoolId, existing.rows[0].grade])
            ]);
            if (!teacherCanPublish({
                role,
                teacherId: req.user.id,
                classNames: Object.keys(data),
                assignments: assignmentRes.rows,
                classRows: classRes.rows
            })) {
                return res.status(403).json({ error: 'You can change a timetable only for classes assigned to you.' });
            }
        }
        const { rows } = await db.query(
            `UPDATE timetables 
             SET timetable_data = COALESCE($1, timetable_data),
                 updated_at = NOW()
             WHERE id = $2 AND school_id = $3 AND status = 'draft_teachers' RETURNING *`,
            [timetable_data ? JSON.stringify(timetable_data) : null, id, schoolId]
        );
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update timetable.' });
    }
};

exports.saveTeacherDraft = async (req, res) => {
    const schoolId = resolveSchoolId(req);
    if (missingSchool(res, schoolId)) return;
    const role = String(req.user && req.user.role || '').toLowerCase();
    if (role !== 'teacher' && role !== 'class_teacher') {
        return res.status(403).json({ error: 'Only a teacher can save a personal class draft.' });
    }
    const data = parseTimetableData(req.body && req.body.timetable_data);
    const grade = parseInt(req.body && req.body.grade, 10);
    const stream = String((req.body && req.body.stream) || '').trim();
    const year = parseInt(req.body && req.body.academic_year, 10);
    const classNames = data && typeof data === 'object' ? Object.keys(data) : [];
    if (!data || !Number.isInteger(grade) || !stream || !Number.isInteger(year) || classNames.length === 0) {
        return res.status(400).json({ error: 'A class draft needs the timetable, grade, stream, academic year, and at least one class.' });
    }
    try {
        const [assignmentRes, classRes] = await Promise.all([
            db.query('SELECT teacher_id, class_name FROM teacher_assignments WHERE teacher_id = $1', [req.user.id]),
            db.query(
                `SELECT name, assigned_teacher_id, homeroom_teacher_id, stream
                 FROM classes
                 WHERE school_id = $1 AND grade = $2 AND COALESCE(ownership_quarantine, FALSE) = FALSE`,
                [schoolId, grade]
            )
        ]);
        if (!teacherCanPublish({
            role,
            teacherId: req.user.id,
            classNames,
            assignments: assignmentRes.rows,
            classRows: classRes.rows
        })) {
            return res.status(403).json({ error: 'A teacher can save a draft only for classes assigned to them.' });
        }
        const classesMatch = classNames.every((name) => classRes.rows.some((row) => (
            String(row.name || '').trim().toLowerCase() === String(name).trim().toLowerCase()
            && String(row.stream || '').trim().toLowerCase() === stream.toLowerCase()
        )));
        if (!classesMatch) {
            return res.status(400).json({ error: 'Every class in the draft must belong to this school, grade, and stream.' });
        }
        const inserted = await db.query(
            `INSERT INTO timetables (name, grade, stream, timetable_data, status, is_active, school_id, created_by, updated_at)
             VALUES ($1, $2, $3, $4, 'draft_teachers', FALSE, $5, $6, NOW())
             RETURNING id, school_id, created_by, status, grade, stream`,
            [`Grade ${grade} ${stream} teacher draft`, grade, stream, JSON.stringify(data), schoolId, req.user.id]
        );
        res.status(201).json({
            saved: true,
            message: 'Your class draft was saved. It is not visible to learners or parents.',
            timetable: inserted.rows[0]
        });
    } catch (err) {
        console.error('Error saving teacher draft:', err);
        res.status(500).json({ error: 'Failed to save the class draft.' });
    }
};
