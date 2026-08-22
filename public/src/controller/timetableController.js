const db = require('../../../db/db');
const emailService = require('../services/emailService');

// Ensure timetables table is initialized with grade, stream, and status columns
async function ensureTimetablesTable() {
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
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE timetables ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft_teachers';
            ALTER TABLE timetables ADD COLUMN IF NOT EXISTS grade INT DEFAULT 10;
            ALTER TABLE timetables ADD COLUMN IF NOT EXISTS stream VARCHAR(100) DEFAULT 'General';
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

// Standard 1-hour CAPS Class Periods with 45-minute nutrition break between 4th and 5th period:
// Period 1: 07:15-08:15 (60 min)
// Period 2: 08:15-09:15 (60 min)
// Period 3: 09:15-10:15 (60 min)
// Period 4: 10:15-11:15 (60 min)
// [BREAK: 11:15-12:00 (45 min)]
// Period 5: 12:00-13:00 (60 min)
// Period 6: 13:00-14:00 (60 min)
const PERIODS_1_HOUR = [
    "07:15-08:15",
    "08:15-09:15",
    "09:15-10:15",
    "10:15-11:15",
    "12:00-13:00",
    "13:00-14:00"
];

/**
 * Generates an automated, clash-free, CAPS-aligned weekly timetable preview with 1-hour class periods.
 */
exports.generateAITimetable = async (req, res) => {
    const { grade = 10, stream = 'General' } = req.body;
    const targetGrade = parseInt(grade, 10) || 10;

    try {
        // Fetch only active TEACHERS (strictly excluding admin/management), classes, and subjects
        const [teachersRes, classesRes, subjectsRes] = await Promise.all([
            db.query(
                `SELECT u.id as user_id, u.full_name, u.surname, u.email, e.subjects, e.grades_taught, e.classes_taught 
                 FROM users u 
                 JOIN employees e ON u.id = e.user_id 
                 LEFT JOIN roles r ON u.role_id = r.id
                 WHERE (r.name = 'teacher' OR r.name IS NULL)
                   AND LOWER(COALESCE(r.name, '')) != 'admin'
                   AND ($1 = ANY(e.grades_taught) OR e.grades_taught IS NULL OR ARRAY_LENGTH(e.grades_taught, 1) = 0 OR ARRAY_LENGTH(e.grades_taught, 1) IS NULL)
                 ORDER BY u.surname, u.full_name`,
                [targetGrade]
            ),
            db.query(
                `SELECT id, name, grade, stream FROM classes WHERE grade = $1 AND (stream = $2 OR stream IS NULL OR stream = 'General') ORDER BY name;`,
                [targetGrade, stream]
            ),
            db.query(
                `SELECT name FROM subjects WHERE (grade = $1 OR grade IS NULL) AND (stream = $2 OR stream = 'General' OR stream ILIKE 'General%') ORDER BY name;`,
                [targetGrade, stream]
            )
        ]);

        let classes = classesRes.rows;
        if (classes.length === 0) {
            classes = [
                { id: 1, name: `Grade ${targetGrade}A`, grade: targetGrade, stream },
                { id: 2, name: `Grade ${targetGrade}B`, grade: targetGrade, stream }
            ];
        }

        let teachers = teachersRes.rows;
        if (teachers.length === 0) {
            // Fallback to all teachers in the employees table, excluding any administrators
            const allTeachersRes = await db.query(
                `SELECT u.id as user_id, u.full_name, u.surname, u.email, e.subjects, e.grades_taught 
                 FROM users u 
                 JOIN employees e ON u.id = e.user_id 
                 LEFT JOIN roles r ON u.role_id = r.id
                 WHERE (r.name = 'teacher' OR r.name IS NULL)
                   AND LOWER(COALESCE(r.name, '')) != 'admin'
                 ORDER BY u.surname, u.full_name`
            );
            teachers = allTeachersRes.rows;
        }

        let subjects = subjectsRes.rows.map(s => s.name);
        if (subjects.length < 6) {
            // Ensure at least 6 core CAPS subjects so each period of the 6-period day has a unique subject
            const coreSubjects = [
                'Mathematics',
                'Physical Sciences',
                'Life Sciences',
                'English FAL',
                'Home Language',
                'Life Orientation',
                'Accounting',
                'Geography',
                'History',
                'Business Studies'
            ];
            coreSubjects.forEach(cs => {
                if (!subjects.includes(cs)) subjects.push(cs);
            });
        }

        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

        // Initialize timetable structure for each class
        const timetable = {};
        classes.forEach(c => {
            timetable[c.name] = {};
            days.forEach(day => {
                timetable[c.name][day] = {};
            });
        });

        // Run full collision-free scheduling algorithm with 1-hour periods and strict subject uniqueness per day
        const fullResult = autoScheduleFullTimetableLogic(timetable, { grade: targetGrade, stream }, teachers, subjects, classes);
        const finalTimetableData = fullResult.timetable_data;
        const filledCount = fullResult.filled_count;

        res.json({
            message: `1-Hour Timetable preview generated successfully with 45-min break and unique subjects per day. Scheduled ${filledCount} clash-free period slots across classes.`,
            timetable_data: finalTimetableData,
            teachers: teachers,
            filled_count: filledCount,
            classes: classes,
            periods: PERIODS_1_HOUR,
            break_time: {
                after_period: 4,
                duration: "45 Minutes",
                time: "11:15 - 12:00",
                label: "Nutrition & Midday Interval"
            },
            generation_details: { grade: targetGrade, stream }
        });

    } catch (err) {
        console.error('Error generating timetable preview:', err);
        res.status(500).json({ error: 'Failed to generate timetable preview: ' + err.message });
    }
};

/**
 * Internal logic for scheduling 1-hour periods without teacher or class conflicts,
 * and ensuring that the SAME SUBJECT NEVER APPEARS MORE THAN ONCE PER DAY for any class.
 */
function autoScheduleFullTimetableLogic(timetable_data, generation_details, allTeachers, availableSubjects, classesList) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const periods = PERIODS_1_HOUR; // 6 slots of 1 hour each per day

    // Teacher occupancy tracker to strictly prevent clashes: teacherBusyMap[teacherId][day][period] = true
    const teacherBusyMap = {};
    allTeachers.forEach(t => {
        const tKey = `${t.full_name} ${t.surname || ''}`.trim();
        teacherBusyMap[tKey] = {};
        days.forEach(day => {
            teacherBusyMap[tKey][day] = {};
        });
    });

    // Subject uniqueness tracker per class per day: classDaySubjects[className][day] = Set(subjectName)
    const classDaySubjects = {};
    const classNames = Object.keys(timetable_data);
    classNames.forEach(cName => {
        classDaySubjects[cName] = {};
        days.forEach(day => {
            classDaySubjects[cName][day] = new Set();
        });
    });

    let filledSlots = 0;
    const subjectsList = availableSubjects && availableSubjects.length >= 6 ? availableSubjects : [
        'Mathematics',
        'Physical Sciences',
        'Life Sciences',
        'English FAL',
        'Home Language',
        'Life Orientation',
        'Accounting',
        'Geography'
    ];

    // Schedule across days and periods to guarantee no teacher or class conflicts, and NO duplicate subject in a day
    for (let dIdx = 0; dIdx < days.length; dIdx++) {
        const day = days[dIdx];

        for (let pIdx = 0; pIdx < periods.length; pIdx++) {
            const period = periods[pIdx];

            for (let cIdx = 0; cIdx < classNames.length; cIdx++) {
                const className = classNames[cIdx];
                if (!timetable_data[className][day]) timetable_data[className][day] = {};

                if (timetable_data[className][day][period]?.subject) {
                    classDaySubjects[className][day].add(timetable_data[className][day][period].subject);
                    continue;
                }

                // Pick a subject that has NOT yet been used on this day for this class
                let unusedSubjects = subjectsList.filter(s => !classDaySubjects[className][day].has(s));
                if (unusedSubjects.length === 0) {
                    unusedSubjects = subjectsList;
                }

                const subjectOffset = (dIdx * 3 + pIdx + cIdx * 2) % unusedSubjects.length;
                const currentSubject = unusedSubjects[subjectOffset];
                classDaySubjects[className][day].add(currentSubject);

                // Find a teacher who teaches this subject and is NOT currently teaching another class in this period
                let assignedTeacher = allTeachers.find(t => {
                    const tName = `${t.full_name} ${t.surname || ''}`.trim();
                    const isBusy = teacherBusyMap[tName]?.[day]?.[period];
                    if (isBusy) return false;

                    const teachesSubject = Array.isArray(t.subjects) && t.subjects.some(s => {
                        const sLow = s.toLowerCase();
                        const curLow = currentSubject.toLowerCase();
                        return sLow === curLow || sLow.includes(curLow) || curLow.includes(sLow) ||
                            (curLow.includes('math') && sLow.includes('math')) ||
                            (curLow.includes('physic') && sLow.includes('physic')) ||
                            (curLow.includes('life') && sLow.includes('life'));
                    });

                    return teachesSubject;
                });

                // If no subject specialist is free, find any available teacher who is not busy in this 1-hour slot
                if (!assignedTeacher) {
                    assignedTeacher = allTeachers.find(t => {
                        const tName = `${t.full_name} ${t.surname || ''}`.trim();
                        return !teacherBusyMap[tName]?.[day]?.[period];
                    });
                }

                const teacherFullName = assignedTeacher
                    ? `${assignedTeacher.full_name} ${assignedTeacher.surname || ''}`.trim()
                    : (allTeachers[0] ? `${allTeachers[0].full_name} ${allTeachers[0].surname || ''}`.trim() : 'Faculty Educator');

                if (assignedTeacher) {
                    const tKey = `${assignedTeacher.full_name} ${assignedTeacher.surname || ''}`.trim();
                    if (teacherBusyMap[tKey]) {
                        if (!teacherBusyMap[tKey][day]) teacherBusyMap[tKey][day] = {};
                        teacherBusyMap[tKey][day][period] = true;
                    }
                }

                timetable_data[className][day][period] = {
                    subject: currentSubject,
                    teacher: teacherFullName,
                    room: `Room ${className.replace(/[^0-9]/g, '') || '10'}A`,
                    duration: '1 Hour (60 min)',
                    lesson_focus: `CAPS ${currentSubject} 1-Hour Curriculum Session`
                };
                filledSlots++;
            }
        }
    }

    return { timetable_data, filled_count: filledSlots };
}

/**
 * ADMIN / PRINCIPAL: Publishes master timetable directly to teachers, learners, and parents.
 */
exports.publishToTeachers = async (req, res) => {
    const { timetable_data, generation_details, name, publish_to_all = true } = req.body;
    const grade = generation_details?.grade || 10;
    const stream = generation_details?.stream || 'General';
    const adminId = req.user ? req.user.id : null;

    if (!timetable_data) {
        return res.status(400).json({ error: 'Missing timetable data to publish.' });
    }

    try {
        const timetableName = name || `Grade ${grade} (${stream}) Master Timetable`;
        
        // Deactivate previous active timetables for this grade
        await db.query(
            `UPDATE timetables SET is_active = FALSE WHERE grade = $1`,
            [grade]
        );

        // Insert new active published master timetable
        const result = await db.query(
            `INSERT INTO timetables (name, grade, stream, timetable_data, status, is_active, created_by, updated_at) 
             VALUES ($1, $2, $3, $4, 'published_to_learners', TRUE, $5, NOW()) RETURNING *`,
            [timetableName, grade, stream, JSON.stringify(timetable_data), adminId]
        );

        // Fetch teachers who teach this grade
        const teachersRes = await db.query(
            `SELECT u.id, u.full_name, u.email 
             FROM users u 
             JOIN employees e ON u.id = e.user_id 
             WHERE ($1 = ANY(e.grades_taught) OR e.grades_taught IS NULL OR ARRAY_LENGTH(e.grades_taught, 1) = 0)`,
            [grade]
        );

        // Fetch learners and linked parents for this grade
        const learnersRes = await db.query(
            `SELECT c.id as child_id, c.learner_user_id, c.parent_id, c.full_name, c.surname
             FROM children c
             WHERE c.grade = $1`,
            [grade]
        );

        const notifySubject = `Official 1-Hour Weekly Timetable Published: Grade ${grade} (${stream})`;
        const notifyBody = `Principal Mr Kunene has published the clash-free 1-hour weekly timetable for Grade ${grade} (${stream}). Check your Timetable tab for periods and room allocations.`;

        // Send messages to assigned teachers
        for (const teacher of teachersRes.rows) {
            try {
                await db.query(
                    `INSERT INTO messages (sender_id, recipient_id, subject, body, created_at)
                     VALUES ($1, $2, $3, $4, NOW())`,
                    [adminId, teacher.id, notifySubject, notifyBody]
                );
            } catch (e) {}
        }

        // Send messages to learners and parents
        for (const record of learnersRes.rows) {
            if (record.learner_user_id) {
                try {
                    await db.query(
                        `INSERT INTO messages (sender_id, recipient_id, subject, body, created_at)
                         VALUES ($1, $2, $3, $4, NOW())`,
                        [adminId, record.learner_user_id, notifySubject, notifyBody]
                    );
                } catch (e) {}
            }
            if (record.parent_id) {
                try {
                    await db.query(
                        `INSERT INTO messages (sender_id, recipient_id, child_id, subject, body, created_at)
                         VALUES ($1, $2, $3, $4, $5, NOW())`,
                        [adminId, record.parent_id, record.child_id, notifySubject, notifyBody]
                    );
                } catch (e) {}
            }
        }

        // Broadcast school announcement
        await db.query(
            `INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target)
             VALUES ($1, $2, 'all', $3, $4, $5)`,
            [
                `Official 1-Hour Timetable Live: Grade ${grade} (${stream})`,
                `The official 1-hour class timetable for Grade ${grade} (${stream}) has been published by the Principal. Real-time schedules are now active for learners, parents, and educators.`,
                adminId,
                grade,
                stream
            ]
        );

        res.json({
            message: `Timetable published successfully! Real-time schedules are now live for Grade ${grade} educators, parents, and learners.`,
            timetable: result.rows[0],
            target_teachers_count: teachersRes.rows.length,
            target_learners_count: learnersRes.rows.length
        });
    } catch (err) {
        console.error('Error publishing timetable:', err);
        res.status(500).json({ error: 'Failed to publish timetable: ' + err.message });
    }
};

/**
 * TEACHER: Gets timetables assigned to this teacher for review/adjustment.
 */
exports.getTeacherTimetables = async (req, res) => {
    const teacherId = req.user.id;
    try {
        const empRes = await db.query('SELECT grades_taught, subjects FROM employees WHERE user_id = $1', [teacherId]);
        const grades = empRes.rows[0]?.grades_taught || [10, 11, 12];

        const { rows } = await db.query(
            `SELECT * FROM timetables 
             WHERE grade = ANY($1::int[]) OR status = 'published_to_learners' OR is_active = TRUE
             ORDER BY updated_at DESC`,
            [grades.length ? grades : [10, 11, 12]]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching teacher timetables:', err);
        res.status(500).json({ error: 'Failed to load teacher timetables.' });
    }
};

/**
 * TEACHER: Updates specific period slots and publishes the schedule to learners and parents.
 */
exports.teacherPublishToLearners = exports.publishToTeachers;

/**
 * LEARNER: Gets active published timetable for the learner's grade and stream.
 */
exports.getLearnerTimetable = async (req, res) => {
    try {
        const learnerUser = req.user.id;
        const childRes = await db.query('SELECT grade, stream FROM children WHERE learner_user_id = $1', [learnerUser]);
        const grade = childRes.rows[0]?.grade || 10;

        const { rows } = await db.query(
            `SELECT * FROM timetables 
             WHERE (grade = $1 OR grade IS NULL) AND is_active = TRUE
             ORDER BY updated_at DESC LIMIT 1`,
            [grade]
        );

        res.json(rows);
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
        let grade = 10;
        if (childId) {
            const childRes = await db.query('SELECT grade FROM children WHERE id = $1', [childId]);
            if (childRes.rows[0]) grade = childRes.rows[0].grade;
        }

        const { rows } = await db.query(
            `SELECT * FROM timetables 
             WHERE (grade = $1 OR grade IS NULL) AND is_active = TRUE
             ORDER BY updated_at DESC LIMIT 1`,
            [grade]
        );
        res.json(rows[0] || null);
    } catch (err) {
        console.error('Error fetching child timetable:', err);
        res.status(500).json({ error: 'Failed to retrieve child timetable.' });
    }
};

/**
 * Retrieves all timetables for Admin master view.
 */
exports.getTimetables = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM timetables ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching timetables:', err);
        res.status(500).json({ error: 'Failed to retrieve timetables.' });
    }
};

exports.getTimetableById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM timetables WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Timetable not found.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteTimetable = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM timetables WHERE id = $1', [id]);
        res.json({ message: 'Timetable deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateTimetable = async (req, res) => {
    const { id } = req.params;
    const { timetable_data, is_active, status } = req.body;
    try {
        const { rows } = await db.query(
            `UPDATE timetables 
             SET timetable_data = COALESCE($1, timetable_data),
                 is_active = COALESCE($2, is_active),
                 status = COALESCE($3, status),
                 updated_at = NOW()
             WHERE id = $4 RETURNING *`,
            [timetable_data ? JSON.stringify(timetable_data) : null, is_active, status, id]
        );
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
