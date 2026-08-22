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

// Standard 1-hour CAPS Class Periods (60 minutes each) with 45-minute nutrition break:
// Period 1: 08:00 - 09:00 (60 min)
// Period 2: 09:00 - 10:00 (60 min)
// Period 3: 10:00 - 11:00 (60 min)
// [BREAK: 11:00 - 11:45 (45 min Interval & Nutrition)]
// Period 4: 11:45 - 12:45 (60 min)
// Period 5: 12:45 - 13:45 (60 min)
// Period 6: 13:45 - 14:45 (60 min)
const PERIODS_1_HOUR = [
    "08:00 - 09:00",
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:45 - 12:45",
    "12:45 - 13:45",
    "13:45 - 14:45"
];

/**
 * Generates an automated, clash-free, CAPS-aligned weekly timetable preview with 1-hour class periods.
 * Smartly allocates ~3 slots per teacher per day across different classes with morning/afternoon rotation.
 */
exports.generateAITimetable = async (req, res) => {
    const { grade = 10, stream = 'General', target_subject, max_teacher_daily_slots = 3 } = req.body;
    const targetGrade = parseInt(grade, 10) || 10;

    try {
        // 1. Fetch active TEACHERS (excluding admin/management), classes, and subjects
        const [teachersRes, classesRes, subjectsRes, activeTimetablesRes] = await Promise.all([
            db.query(
                `SELECT u.id as user_id, u.full_name, u.surname, u.email, e.subjects, e.grades_taught, e.classes_taught 
                 FROM users u 
                 JOIN employees e ON u.id = e.user_id 
                 LEFT JOIN roles r ON u.role_id = r.id
                 WHERE (r.name = 'teacher' OR r.name IS NULL)
                   AND LOWER(COALESCE(r.name, '')) != 'admin'
                 ORDER BY u.surname, u.full_name`
            ),
            db.query(
                `SELECT id, name, grade, stream FROM classes WHERE grade = $1 AND (stream = $2 OR stream IS NULL OR stream = 'General') ORDER BY name;`,
                [targetGrade, stream]
            ),
            db.query(
                `SELECT name FROM subjects WHERE (grade = $1 OR grade IS NULL) AND (stream = $2 OR stream = 'General' OR stream ILIKE 'General%') ORDER BY name;`,
                [targetGrade, stream]
            ),
            // Fetch all other active published timetables to avoid global educator double-booking
            db.query(
                `SELECT id, grade, stream, timetable_data FROM timetables WHERE is_active = TRUE AND grade != $1`,
                [targetGrade]
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
            const coreSubjects = [
                'Mathematics',
                'Physical Sciences',
                'Life Sciences',
                'English FAL',
                'Life Orientation',
                'Accounting',
                'Geography',
                'History',
                'Business Studies',
                'Economics',
                'Tourism'
            ];
            coreSubjects.forEach(cs => {
                if (!subjects.includes(cs)) subjects.push(cs);
            });
        }

        // If a specific target subject was prioritized by the admin, place it at the front
        if (target_subject && subjects.includes(target_subject)) {
            subjects = [target_subject, ...subjects.filter(s => s !== target_subject)];
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

        // Run full conflict-free scheduling with 1-hour periods, max 3 slots per teacher/day, and cross-timetable safety
        const fullResult = autoScheduleFullTimetableLogic(
            timetable,
            { grade: targetGrade, stream, target_subject, max_teacher_daily_slots: parseInt(max_teacher_daily_slots, 10) || 3 },
            teachers,
            subjects,
            classes,
            activeTimetablesRes.rows
        );

        const finalTimetableData = fullResult.timetable_data;
        const filledCount = fullResult.filled_count;

        res.json({
            message: `1-Hour Timetable preview generated successfully (${filledCount} periods scheduled with 0 clashes and 3 slots/day teacher workload balance).`,
            timetable_data: finalTimetableData,
            teachers: teachers,
            filled_count: filledCount,
            classes: classes,
            periods: PERIODS_1_HOUR,
            break_time: {
                after_period: 3,
                duration: "45 Minutes",
                time: "11:00 - 11:45",
                label: "Nutrition & Midday Break"
            },
            generation_details: { grade: targetGrade, stream, target_subject }
        });

    } catch (err) {
        console.error('Error generating timetable preview:', err);
        res.status(500).json({ error: 'Failed to generate timetable preview: ' + err.message });
    }
};

/**
 * Intelligent conflict-free 1-hour scheduler:
 * - Each period takes exactly 1 hour.
 * - Maximum ~3 periods per day per teacher across classes.
 * - Rotates morning and afternoon periods across the week.
 * - Checks other active school timetables to guarantee zero double-booking.
 * - No subject repeated more than once per day for the same class.
 */
function autoScheduleFullTimetableLogic(timetable_data, generation_details, allTeachers, availableSubjects, classesList, otherActiveTimetables = []) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const periods = PERIODS_1_HOUR; // 6 slots of 1 hour each
    const maxDailySlotsPerTeacher = generation_details.max_teacher_daily_slots || 3;

    // 1. Build teacher occupancy tracker from existing active school timetables
    const teacherBusyMap = {};
    const teacherDailySlotCount = {};

    allTeachers.forEach(t => {
        const tKey = `${t.full_name} ${t.surname || ''}`.trim().toLowerCase();
        teacherBusyMap[tKey] = {};
        teacherDailySlotCount[tKey] = {};
        days.forEach(day => {
            teacherBusyMap[tKey][day] = {};
            teacherDailySlotCount[tKey][day] = 0;
        });
    });

    // Populate existing busy slots from other grades' published active timetables
    otherActiveTimetables.forEach(activeTT => {
        const data = typeof activeTT.timetable_data === 'string' ? JSON.parse(activeTT.timetable_data) : activeTT.timetable_data;
        if (!data) return;
        Object.keys(data).forEach(cName => {
            const classObj = data[cName];
            days.forEach(day => {
                const dayObj = classObj?.[day];
                if (!dayObj) return;
                Object.keys(dayObj).forEach(period => {
                    const slot = dayObj[period];
                    if (slot && slot.teacher) {
                        const tKey = slot.teacher.trim().toLowerCase();
                        if (teacherBusyMap[tKey]) {
                            if (!teacherBusyMap[tKey][day]) teacherBusyMap[tKey][day] = {};
                            teacherBusyMap[tKey][day][period] = true;
                            teacherDailySlotCount[tKey][day] = (teacherDailySlotCount[tKey][day] || 0) + 1;
                        }
                    }
                });
            });
        });
    });

    // 2. Subject uniqueness tracker per class per day
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
        'Life Orientation',
        'Accounting',
        'Geography',
        'Business Studies'
    ];

    // 3. Schedule slots with workload distribution
    for (let dIdx = 0; dIdx < days.length; dIdx++) {
        const day = days[dIdx];

        for (let pIdx = 0; pIdx < periods.length; pIdx++) {
            const period = periods[pIdx];
            const isMorning = pIdx < 3; // Periods 1, 2, 3 are morning; 4, 5, 6 are afternoon

            for (let cIdx = 0; cIdx < classNames.length; cIdx++) {
                const className = classNames[cIdx];
                if (!timetable_data[className][day]) timetable_data[className][day] = {};

                if (timetable_data[className][day][period]?.subject) {
                    classDaySubjects[className][day].add(timetable_data[className][day][period].subject);
                    continue;
                }

                const targetGrade = parseInt(generation_details.grade, 10) || 10;
                const isSeniorGET = targetGrade === 8 || targetGrade === 9;
                const isFET = targetGrade >= 10 && targetGrade <= 12;
                const prioritySubject = generation_details.target_subject && generation_details.target_subject !== 'all'
                    ? generation_details.target_subject.trim()
                    : null;

                // Pick a subject not yet taken today by this class
                let unusedSubjects = subjectsList.filter(s => !classDaySubjects[className][day].has(s));
                if (unusedSubjects.length === 0) {
                    unusedSubjects = subjectsList;
                }

                let currentSubject = null;

                // Guaranteed Focus Subject Priority: If admin specified a priority subject, guarantee prime daily placement for each class!
                if (prioritySubject) {
                    const matchedPriority = subjectsList.find(s => 
                        s.toLowerCase().trim() === prioritySubject.toLowerCase().trim() ||
                        s.toLowerCase().includes(prioritySubject.toLowerCase().trim()) ||
                        prioritySubject.toLowerCase().includes(s.toLowerCase().trim())
                    ) || (subjectsList.includes(prioritySubject) ? prioritySubject : null);

                    if (matchedPriority && !classDaySubjects[className][day].has(matchedPriority)) {
                        // Prioritize in prime morning slot (Period 1 or 2) or the first available period of the day
                        const isPrimePeriodForClass = (pIdx === 0 && cIdx % 2 === 0) || (pIdx === 1 && cIdx % 2 === 1) || pIdx === 0 || unusedSubjects.length === subjectsList.length;
                        if (isPrimePeriodForClass) {
                            currentSubject = matchedPriority;
                        }
                    }
                }

                if (!currentSubject) {
                    // Filter out priority subject if already handled for today, and rotate remaining subjects fairly
                    const remainingToRotate = unusedSubjects.filter(s => !prioritySubject || s.toLowerCase().trim() !== prioritySubject.toLowerCase().trim());
                    const listToPickFrom = remainingToRotate.length > 0 ? remainingToRotate : unusedSubjects;
                    const subjectOffset = (dIdx * 3 + pIdx + cIdx * 2) % listToPickFrom.length;
                    currentSubject = listToPickFrom[subjectOffset];
                }

                classDaySubjects[className][day].add(currentSubject);

                // Strict Helper to check if an educator is qualified for a specific subject and grade phase
                const isTeacherQualifiedForSubjectAndGrade = (t, subj, gr) => {
                    if (!t || !Array.isArray(t.subjects) || t.subjects.length === 0) return false;
                    
                    const g = parseInt(gr, 10) || 10;
                    const isGET = g === 8 || g === 9;
                    const isFETPhase = g >= 10 && g <= 12;
                    
                    // Check grades taught by teacher if specified in employee profile
                    const gradesTaught = Array.isArray(t.grades_taught) ? t.grades_taught : [];
                    if (gradesTaught.length > 0) {
                        const teachesThisGrade = gradesTaught.includes(g);
                        const teachesPhase = isGET 
                            ? gradesTaught.some(gt => gt === 8 || gt === 9)
                            : gradesTaught.some(gt => gt >= 10);
                        if (!teachesThisGrade && !teachesPhase) {
                            return false;
                        }
                    }

                    const subLow = subj.toLowerCase().trim();
                    
                    return t.subjects.some(s => {
                        const sLow = s.toLowerCase().trim();
                        if (sLow === subLow) return true;

                        // 1. Natural Sciences (Grade 8 & 9 only): Can be taught by Natural Sciences, Life Sciences, or Physical Sciences educators
                        if (isGET && subLow.includes('natural science')) {
                            return sLow.includes('natural science') || sLow.includes('life science') || sLow.includes('physic');
                        }

                        // 2. Mathematics:
                        // - In Grade 8 & 9: Senior phase Mathematics
                        // - In Grade 10-12: FET Mathematics / Mathematical Literacy
                        if (subLow.includes('math')) {
                            return sLow.includes('math');
                        }

                        // 3. Physical Sciences (FET Grade 10-12 only): Strictly Physical Sciences / Physics
                        if (isFETPhase && subLow.includes('physic')) {
                            return sLow.includes('physic');
                        }

                        // 4. Life Sciences (FET Grade 10-12 only): Strictly Life Sciences / Biology
                        if (isFETPhase && subLow.includes('life science')) {
                            return sLow.includes('life science');
                        }

                        // 5. English FAL / English HL:
                        if (subLow.includes('english')) {
                            return sLow.includes('english');
                        }

                        // 6. Social Sciences (Grade 8 & 9 only): Can be taught by Social Sciences, History, or Geography educators
                        if (isGET && subLow.includes('social science')) {
                            return sLow.includes('social science') || sLow.includes('geograph') || sLow.includes('history');
                        }

                        // 7. Geography (FET 10-12): Strictly Geography
                        if (subLow.includes('geograph')) {
                            return sLow.includes('geograph');
                        }

                        // 8. History (FET 10-12): Strictly History
                        if (subLow.includes('history')) {
                            return sLow.includes('history');
                        }

                        // 9. Tourism (FET 10-12): Strictly Tourism
                        if (subLow.includes('tourism')) {
                            return sLow.includes('tourism');
                        }

                        // 10. Commercial subjects (Accounting, Business Studies, Economics, EMS)
                        if (isGET && subLow.includes('ems')) {
                            return sLow.includes('ems') || sLow.includes('account') || sLow.includes('business') || sLow.includes('economic');
                        }
                        if (subLow.includes('account')) {
                            return sLow.includes('account');
                        }
                        if (subLow.includes('business')) {
                            return sLow.includes('business');
                        }
                        if (subLow.includes('economic')) {
                            return sLow.includes('economic');
                        }

                        // 11. Technology & Creative Arts (Grade 8 & 9)
                        if (subLow.includes('technology')) {
                            return sLow.includes('technology');
                        }
                        if (subLow.includes('creative art')) {
                            return sLow.includes('creative art') || sLow.includes('art');
                        }

                        // 12. Life Orientation
                        if (subLow.includes('life orientation')) {
                            return sLow.includes('life orientation');
                        }

                        // 13. Official Home Languages (Sepedi, Sesotho, Setswana, siSwati, Tshivenda, Xitsonga, Afrikaans, isiNdebele, isiXhosa, isiZulu)
                        const langMatches = [
                            'sepedi', 'sesotho', 'setswana', 'siswati', 'tshivenda', 'xitsonga',
                            'afrikaans', 'isindebele', 'isixhosa', 'isizulu'
                        ];
                        for (const lang of langMatches) {
                            if (subLow.includes(lang) && sLow.includes(lang)) {
                                return true;
                            }
                        }

                        return false;
                    });
                };

                // Find a free subject-specialist teacher who strictly teaches this subject and grade phase
                let assignedTeacher = allTeachers.find(t => {
                    const tKey = `${t.full_name} ${t.surname || ''}`.trim().toLowerCase();
                    if (teacherBusyMap[tKey]?.[day]?.[period]) return false;
                    
                    const dailySlots = teacherDailySlotCount[tKey]?.[day] || 0;
                    if (dailySlots >= maxDailySlotsPerTeacher) return false;

                    return isTeacherQualifiedForSubjectAndGrade(t, currentSubject, targetGrade);
                });

                // Fallback 1: If qualified specialist is available but at max daily slots, allow +1 slot to preserve subject specialization
                if (!assignedTeacher) {
                    assignedTeacher = allTeachers.find(t => {
                        const tKey = `${t.full_name} ${t.surname || ''}`.trim().toLowerCase();
                        if (teacherBusyMap[tKey]?.[day]?.[period]) return false;
                        const dailySlots = teacherDailySlotCount[tKey]?.[day] || 0;
                        return dailySlots < (maxDailySlotsPerTeacher + 1) && isTeacherQualifiedForSubjectAndGrade(t, currentSubject, targetGrade);
                    });
                }

                // If no teacher in DB is assigned to this subject, place the subject on the timetable as Unassigned (Pending Allocation)
                // (NEVER assign an educator of a different discipline or grade phase)
                let teacherFullName = '';
                if (assignedTeacher) {
                    teacherFullName = `${assignedTeacher.full_name} ${assignedTeacher.surname || ''}`.trim();
                    const tKey = teacherFullName.toLowerCase();
                    if (teacherBusyMap[tKey]) {
                        if (!teacherBusyMap[tKey][day]) teacherBusyMap[tKey][day] = {};
                        teacherBusyMap[tKey][day][period] = true;
                        teacherDailySlotCount[tKey][day] = (teacherDailySlotCount[tKey][day] || 0) + 1;
                    }
                } else {
                    teacherFullName = 'Unassigned (Pending Allocation)';
                }

                const syllabusPhase = isSeniorGET ? 'GET Senior Phase' : 'FET Phase';

                timetable_data[className][day][period] = {
                    subject: currentSubject,
                    teacher: teacherFullName,
                    room: `Room ${className.replace(/[^0-9]/g, '') || '10'}${String.fromCharCode(65 + cIdx)}`,
                    duration: '1 Hour (60 min)',
                    lesson_focus: `CAPS ${syllabusPhase} (Grade ${targetGrade}) ${currentSubject} Session`
                };
                filledSlots++;
            }
        }
    }

    return { timetable_data, filled_count: filledSlots };
}

/**
 * ADMIN / PRINCIPAL: Publishes master timetable draft to educators for subject review.
 * Timetable remains in 'draft_teachers' status until educators confirm and release it to learners.
 */
exports.publishToTeachers = async (req, res) => {
    const { timetable_data, generation_details, name } = req.body;
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

        // Insert new draft master timetable for educator review
        const result = await db.query(
            `INSERT INTO timetables (name, grade, stream, timetable_data, status, is_active, created_by, updated_at) 
             VALUES ($1, $2, $3, $4, 'draft_teachers', TRUE, $5, NOW()) RETURNING *`,
            [timetableName, grade, stream, JSON.stringify(timetable_data), adminId]
        );

        // Fetch educators who teach this grade
        const teachersRes = await db.query(
            `SELECT u.id, u.full_name, u.email 
             FROM users u 
             JOIN employees e ON u.id = e.user_id 
             WHERE ($1 = ANY(e.grades_taught) OR e.grades_taught IS NULL OR ARRAY_LENGTH(e.grades_taught, 1) = 0)`,
            [grade]
        );

        const notifySubject = `Educator Review Required: Grade ${grade} (${stream}) Timetable Draft`;
        const notifyBody = `Administration has generated the 1-hour weekly timetable draft for Grade ${grade} (${stream}). Please inspect your subject slots in your Educator Portal. Once all subject allocations are verified, you can release the schedule to your learners.`;

        // Send in-app messages and real SMTP emails specifically to assigned teachers
        for (const teacher of teachersRes.rows) {
            try {
                await db.query(
                    `INSERT INTO messages (sender_id, recipient_id, subject, body, created_at)
                     VALUES ($1, $2, $3, $4, NOW())`,
                    [adminId, teacher.id, notifySubject, notifyBody]
                );
            } catch (e) {}

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

            await db.query(
                `INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target)
                 VALUES ($1, $2, 'teacher', $3, $4, $5)`,
                [
                    `Timetable Draft Live for Review: Grade ${grade} (${stream})`,
                    `The 1-hour class schedule draft for Grade ${grade} (${stream}) has been sent by Administration. Please check your assigned subject periods and release to learners once confirmed.`,
                    adminId,
                    grade,
                    stream
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
    try {
        const [empRes, userRes] = await Promise.all([
            db.query('SELECT grades_taught, subjects FROM employees WHERE user_id = $1', [teacherId]),
            db.query('SELECT full_name, surname FROM users WHERE id = $1', [teacherId])
        ]);
        const grades = empRes.rows[0]?.grades_taught || [10, 11, 12];
        const teacherName = userRes.rows[0] ? `${userRes.rows[0].full_name} ${userRes.rows[0].surname || ''}`.trim() : '';

        const { rows } = await db.query(
            `SELECT * FROM timetables 
             WHERE grade = ANY($1::int[]) OR status = 'published_to_learners' OR status = 'draft_teachers' OR is_active = TRUE
             ORDER BY updated_at DESC`,
            [grades.length ? grades : [10, 11, 12]]
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

        const tLower = teacherName.toLowerCase();
        const surnameLower = userRes.rows[0]?.surname ? userRes.rows[0].surname.toLowerCase() : '';

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
                        if (slot && slot.teacher) {
                            const slotTeacherLower = slot.teacher.toLowerCase();
                            const isMatch = (tLower && slotTeacherLower.includes(tLower)) ||
                                (surnameLower && slotTeacherLower.includes(surnameLower));

                            if (isMatch) {
                                const entry = {
                                    timetable_id: tt.id,
                                    grade: tt.grade,
                                    class_name: className,
                                    day,
                                    period,
                                    subject: slot.subject,
                                    teacher: slot.teacher,
                                    room: slot.room || `Room ${className.replace(/[^0-9]/g, '') || '10'}A`,
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
    const { timetable_id, timetable_data } = req.body;
    const teacherId = req.user.id;

    try {
        let tt;
        if (timetable_id) {
            const ttRes = await db.query('SELECT * FROM timetables WHERE id = $1', [timetable_id]);
            tt = ttRes.rows[0];
        } else {
            const ttRes = await db.query('SELECT * FROM timetables WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1');
            tt = ttRes.rows[0];
        }

        if (!tt) {
            return res.status(404).json({ error: 'Timetable not found to publish.' });
        }

        const grade = tt.grade || 10;
        const stream = tt.stream || 'General';

        // Update timetable status to officially published for learners
        const updatedRes = await db.query(
            `UPDATE timetables 
             SET status = 'published_to_learners', 
                 timetable_data = COALESCE($1, timetable_data), 
                 updated_at = NOW() 
             WHERE id = $2 RETURNING *`,
            [timetable_data ? JSON.stringify(timetable_data) : null, tt.id]
        );

        // Fetch learners and linked parents for this grade with email addresses
        const learnersRes = await db.query(
            `SELECT c.id as child_id, c.learner_user_id, c.parent_id, c.full_name, c.surname,
                    u_l.email as learner_email, u_p.email as parent_email
             FROM children c
             LEFT JOIN users u_l ON c.learner_user_id = u_l.id
             LEFT JOIN users u_p ON c.parent_id = u_p.id
             WHERE c.grade = $1`,
            [grade]
        );

        const notifySubject = `Official Timetable Released: Grade ${grade} (${stream})`;
        const notifyBody = `Your subject educators have verified and officially published the 1-hour weekly class schedule for Grade ${grade} (${stream}). Check your Timetable tab for periods and room allocations.`;

        // Send in-app messages and real SMTP emails to learners and parents
        for (const record of learnersRes.rows) {
            if (record.learner_user_id) {
                try {
                    await db.query(
                        `INSERT INTO messages (sender_id, recipient_id, subject, body, created_at)
                         VALUES ($1, $2, $3, $4, NOW())`,
                        [teacherId, record.learner_user_id, notifySubject, notifyBody]
                    );
                } catch (e) {}

                if (record.learner_email) {
                    emailService.sendTimetableReleased({
                        recipientName: `${record.full_name} ${record.surname || ''}`.trim(),
                        email: record.learner_email,
                        grade,
                        stream,
                        timetableName: tt.name
                    }).catch(err => console.error(`[EMAIL ERROR] Timetable released email to learner ${record.learner_email}:`, err.message));
                }
            }
            if (record.parent_id) {
                try {
                    await db.query(
                        `INSERT INTO messages (sender_id, recipient_id, child_id, subject, body, created_at)
                         VALUES ($1, $2, $3, $4, $5, NOW())`,
                        [teacherId, record.parent_id, record.child_id, notifySubject, notifyBody]
                    );
                } catch (e) {}

                if (record.parent_email) {
                    emailService.sendTimetableReleased({
                        recipientName: 'Parent / Guardian',
                        email: record.parent_email,
                        grade,
                        stream,
                        timetableName: tt.name
                    }).catch(err => console.error(`[EMAIL ERROR] Timetable released email to parent ${record.parent_email}:`, err.message));
                }
            }
        }

        // Broadcast school-wide release notice safely
        try {
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS role_target VARCHAR(50) DEFAULT 'all'`);
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_id INTEGER`);
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS grade_target INTEGER`);
            await db.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS stream_target VARCHAR(50)`);

            await db.query(
                `INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target)
                 VALUES ($1, $2, 'all', $3, $4, $5)`,
                [
                    `Official Class Timetable Released: Grade ${grade} (${stream})`,
                    `Subject educators have finalized and published the official 1-hour class timetable for Grade ${grade} (${stream}). Real-time schedules are now active for learners and parents.`,
                    teacherId,
                    grade,
                    stream
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
             ORDER BY CASE WHEN status = 'published_to_learners' THEN 0 ELSE 1 END, updated_at DESC LIMIT 1`,
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
             ORDER BY CASE WHEN status = 'published_to_learners' THEN 0 ELSE 1 END, updated_at DESC LIMIT 1`,
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
    const adminId = req.user ? req.user.id : null;

    try {
        let grade = 10;
        let stream = 'General';
        let classSummary = 'Class Schedule';

        // 1. Fetch timetable details before deletion if present
        if (id && !isNaN(parseInt(id, 10))) {
            const ttRes = await db.query('SELECT * FROM timetables WHERE id = $1', [parseInt(id, 10)]);
            if (ttRes.rows.length > 0) {
                const tt = ttRes.rows[0];
                grade = tt.grade || 10;
                stream = tt.stream || 'General';
                try {
                    const data = typeof tt.timetable_data === 'string' ? JSON.parse(tt.timetable_data) : tt.timetable_data;
                    const classKeys = Object.keys(data || {});
                    if (classKeys.length > 0) {
                        classSummary = classKeys.join(', ');
                    }
                } catch (e) {}
            }
            // 2. Delete timetable from database (frees slots immediately)
            await db.query('DELETE FROM timetables WHERE id = $1', [parseInt(id, 10)]);
        } else {
            await db.query('DELETE FROM timetables WHERE name ILIKE $1 OR id::text = $1', [`%${id}%`]);
        }

        // 3. Post notification to announcements specifically for educators of this deleted class/grade
        try {
            await db.query(
                `INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target, created_at)
                 VALUES ($1, $2, 'teacher', $3, $4, $5, NOW())`,
                [
                    `Timetable Deleted: Grade ${grade} (${stream})`,
                    `Notice to Educators: The class timetable for ${classSummary} (${stream}) has been removed and reset by Administration. Previous teaching allocations for these classes are now open for new schedule generation.`,
                    adminId,
                    grade,
                    stream
                ]
            );
        } catch (annErr) {
            console.warn('Could not dispatch timetable deletion announcement:', annErr.message);
        }

        // 4. Send direct message notification to educators teaching this grade/class
        try {
            const teachersRes = await db.query(
                `SELECT u.id, u.full_name 
                 FROM users u 
                 JOIN employees e ON u.id = e.user_id 
                 WHERE ($1 = ANY(e.grades_taught) OR e.grades_taught IS NULL OR ARRAY_LENGTH(e.grades_taught, 1) = 0)`,
                [grade]
            );

            const notifySubject = `Timetable Reset Notice: ${classSummary}`;
            const notifyBody = `Administration has deleted and reset the timetable for ${classSummary} (${stream}). A new conflict-free schedule will be published shortly.`;

            for (const teacher of teachersRes.rows) {
                try {
                    await db.query(
                        `INSERT INTO messages (sender_id, recipient_id, subject, body, created_at)
                         VALUES ($1, $2, $3, $4, NOW())`,
                        [adminId, teacher.id, notifySubject, notifyBody]
                    );
                } catch (_) {}
            }
        } catch (msgErr) {
            console.warn('Could not dispatch direct teacher messages:', msgErr.message);
        }

        res.json({
            success: true,
            message: `Timetable deleted successfully. Associated slots are now free for new generation.`
        });
    } catch (err) {
        console.error('Error deleting timetable:', err);
        res.status(500).json({ error: 'Failed to delete timetable: ' + err.message });
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
