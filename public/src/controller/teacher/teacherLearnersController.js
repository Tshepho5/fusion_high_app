const db = require('../../../../db/db');
const NotificationService = require('../../services/notificationService');

/**
 * Gets a consolidated list of all learners a teacher is responsible for in their school.
 */
exports.getMyLearners = async (req, res) => {
    try {
        const teacherId = req.user ? req.user.id : null;
        const schoolId = req.user?.school_id || 1;

        const query = `
            SELECT DISTINCT ON (c.id)
                c.id,
                c.full_name as learner_name,
                c.surname as learner_surname,
                c.full_name,
                c.surname,
                c.learner_number,
                c.grade,
                COALESCE(cl.name, CONCAT(c.grade, 'A')) as class_name,
                c.stream,
                'None recorded' as medical_notes,
                NULL as profile_picture,
                COALESCE(CONCAT(u.full_name, ' ', u.surname), 'Guardian Not Linked') as guardian_name,
                COALESCE(u.phone, u.email, 'N/A') as guardian_phone,
                COALESCE(ROUND(AVG(p.grade)), 0) as performance_avg,
                COALESCE(ROUND((COUNT(CASE WHEN att.status IN ('present', 'late') THEN 1 END) * 100.0) / NULLIF(COUNT(att.id), 0)), 100) as attendance_pct,
                (SELECT COUNT(*) FROM behavior_incidents b WHERE b.child_id = c.id) as behaviour_count,
                c.subjects
            FROM children c
            LEFT JOIN classes cl ON c.class_id = cl.id
            LEFT JOIN users u ON c.parent_id = u.id
            LEFT JOIN progress p ON p.child_id = c.id
            LEFT JOIN attendance att ON att.child_id = c.id
            WHERE c.school_id = $1
            GROUP BY c.id, cl.name, u.full_name, u.surname, u.phone, u.email
            ORDER BY c.id, c.grade, c.surname, c.full_name;
        `;

        const { rows } = await db.query(query, [schoolId]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching my learners:', err);
        res.status(500).json({ error: 'Failed to retrieve learners list.' });
    }
};

/**
 * Gets class roster filtered by class name, grade, and subject within the teacher's school.
 */
exports.getClassList = async (req, res) => {
    const classParam = (req.query.class || req.query.class_id || req.query.className || '').toString().trim();
    const gradeParam = req.query.grade || (classParam ? classParam.replace(/[^0-9]/g, '') : null);
    const subjectParam = (req.query.subject || '').toString().trim();
    const schoolId = req.user?.school_id || 1;

    try {
        const params = [subjectParam, schoolId];
        let conditions = [`c.school_id = $2`];

        if (classParam) {
            params.push(classParam);
            const pIdx = params.length;
            conditions.push(`(cl.name ILIKE $${pIdx} OR cl.id::text = $${pIdx} OR CONCAT(c.grade, 'A') ILIKE $${pIdx} OR CONCAT('Grade ', c.grade, 'A') ILIKE $${pIdx})`);
        }

        if (gradeParam && parseInt(gradeParam, 10)) {
            params.push(parseInt(gradeParam, 10));
            const pIdx = params.length;
            conditions.push(`c.grade = $${pIdx}`);
        }

        let whereClause = `WHERE ` + conditions.join(' AND ');

        const query = `
            SELECT c.id, 
                   c.full_name as learner_name, 
                   c.surname as learner_surname, 
                   c.full_name,
                   c.surname,
                   c.learner_number, 
                   c.grade,
                   c.stream,
                   c.subjects,
                   COALESCE(cl.name, CONCAT(c.grade, 'A')) as class_name,
                   (SELECT p.grade FROM progress p WHERE p.child_id = c.id AND ($1 = '' OR LOWER(p.subject) = LOWER($1)) ORDER BY p.id DESC LIMIT 1) as current_mark
            FROM children c
            LEFT JOIN classes cl ON c.class_id = cl.id
            ${whereClause}
            ORDER BY c.grade ASC, c.surname ASC, c.full_name ASC
        `;

        let result = await db.query(query, params);

        // Fallback: If no match with strict filters, fetch by grade or all children
        if (result.rows.length === 0 && gradeParam && parseInt(gradeParam, 10)) {
            result = await db.query(`
                SELECT c.id, 
                       c.full_name as learner_name, 
                       c.surname as learner_surname, 
                       c.full_name,
                       c.surname,
                       c.learner_number, 
                       c.grade,
                       c.stream,
                       c.subjects,
                       COALESCE(cl.name, CONCAT(c.grade, 'A')) as class_name,
                       NULL as current_mark
                FROM children c
                LEFT JOIN classes cl ON c.class_id = cl.id
                WHERE c.grade = $1
                ORDER BY c.grade ASC, c.surname ASC, c.full_name ASC
            `, [parseInt(gradeParam, 10)]);
        }

        if (result.rows.length === 0) {
            result = await db.query(`
                SELECT c.id, 
                       c.full_name as learner_name, 
                       c.surname as learner_surname, 
                       c.full_name,
                       c.surname,
                       c.learner_number, 
                       c.grade,
                       c.stream,
                       c.subjects,
                       COALESCE(cl.name, CONCAT(c.grade, 'A')) as class_name,
                       NULL as current_mark
                FROM children c
                LEFT JOIN classes cl ON c.class_id = cl.id
                ORDER BY c.grade ASC, c.surname ASC, c.full_name ASC
            `);
        }

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching class list:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Saves marks recorded via class mark sheet.
 */
exports.saveClassMarks = async (req, res) => {
    let subject = (req.body.subject || 'General').trim();
    const classParam = (req.body.class || req.body.class_id || '').toString().trim();
    const grade = req.body.grade || (classParam ? parseInt(classParam.replace(/[^0-9]/g, ''), 10) : 10) || 10;
    const term = req.body.term || 'Term 3 2026';
    const assessmentTitle = (req.body.assessment_name || req.body.assessmentName || '').trim() || 'Class Assessment';
    const total_mark = req.body.total_mark || req.body.totalMarks || 100;
    let marks = req.body.marks || [];
    const teacherId = req.user ? req.user.id : null;

    // Normalize subject names for consistency across tables
    const subLow = subject.toLowerCase();
    if (subLow === 'maths' || subLow === 'math' || subLow.includes('mathematics')) subject = 'Mathematics';
    else if (subLow.includes('physic') || subLow === 'physics') subject = 'Physical Sciences';
    else if (subLow.includes('life sc') || subLow === 'biology') subject = 'Life Sciences';
    else if (subLow.includes('english')) subject = 'English FAL';
    else if (subLow.includes('orient')) subject = 'Life Orientation';

    if (!Array.isArray(marks) && typeof marks === 'object' && marks !== null) {
        marks = Object.entries(marks).map(([child_id, val]) => ({
            child_id,
            grade: typeof val === 'object' ? (val.grade || val.mark || val.score) : val
        }));
    }

    if (!Array.isArray(marks) || marks.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing marks records.' });
    }

    const maxMark = parseFloat(total_mark) || 100;

    try {
        let employeeId = null;
        if (teacherId) {
            try {
                const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [teacherId]);
                if (empRes.rows[0]) employeeId = empRes.rows[0].id;
            } catch (e) {}
        }

        let savedCount = 0;

        for (const m of marks) {
            const rawId = m.child_id || m.learner_id || m.id;
            const scoreCandidate = m.grade !== undefined ? m.grade : (m.mark !== undefined ? m.mark : (m.mark_obtained !== undefined ? m.mark_obtained : m.score));
            const rawScore = parseFloat(scoreCandidate);

            if (rawId && !isNaN(rawScore)) {
                // Resolve canonical child record
                const idStr = rawId.toString().trim();
                let childRes = await db.query(
                    `SELECT id, learner_user_id, parent_id, grade, full_name, surname, learner_number 
                     FROM children 
                     WHERE id::text = $1 OR learner_user_id::text = $1 OR learner_number = $1 
                     LIMIT 1`,
                    [idStr]
                );

                let childId = null;
                let learnerUserId = null;
                let parentId = null;
                let learnerFullName = 'Learner';
                let childGrade = grade;

                if (childRes.rows.length > 0) {
                    const row = childRes.rows[0];
                    childId = row.id;
                    learnerUserId = row.learner_user_id;
                    parentId = row.parent_id;
                    learnerFullName = `${row.full_name || ''} ${row.surname || ''}`.trim();
                    childGrade = row.grade || grade;
                } else if (!isNaN(parseInt(idStr, 10))) {
                    childId = parseInt(idStr, 10);
                }

                if (!childId) continue;

                // Calculate percentage score (0 - 100)
                let pctScore = rawScore;
                if (maxMark !== 100 && maxMark > 0) {
                    pctScore = Math.round((rawScore / maxMark) * 100);
                }
                pctScore = Math.min(100, Math.max(0, pctScore));

                const remarkNote = `${assessmentTitle} (${rawScore}/${maxMark})`;

                // Insert into progress table
                await db.query(
                    `INSERT INTO progress (child_id, subject, term, grade, notes, employee_id, date)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    [childId, subject, term || 'Term 3 2026', pctScore, remarkNote, employeeId]
                );
                savedCount++;

                // Notify learner and parent
                const notifySubject = `New Assessment Mark: ${subject} (${pctScore}%)`;
                const notifyBody = `Your educator recorded a score of ${pctScore}% (${rawScore}/${maxMark}) on ${assessmentTitle} in ${subject}.`;

                if (learnerUserId) {
                    try {
                        await db.query(
                            `INSERT INTO messages (sender_id, recipient_id, subject, body, read_at, created_at)
                             VALUES ($1, $2, $3, $4, NULL, NOW())`,
                            [teacherId || 1, learnerUserId, notifySubject, notifyBody]
                        );
                    } catch (e) {}
                }

                if (parentId) {
                    try {
                        await db.query(
                            `INSERT INTO messages (sender_id, recipient_id, child_id, subject, body, read_at, created_at)
                             VALUES ($1, $2, $3, $4, $5, NULL, NOW())`,
                            [teacherId || 1, parentId, childId, notifySubject, `Your child ${learnerFullName} scored ${pctScore}% (${rawScore}/${maxMark}) on ${assessmentTitle} in ${subject}.`]
                        );
                    } catch (e) {}
                }
            }
        }

        // Create official announcement so learners and parents can check the notice in the announcements feed
        const markAnnouncementTitle = `Assessment Marks Published: ${subject} - ${assessmentTitle}`;
        const markAnnouncementContent = `Marks for ${assessmentTitle} in ${subject} (Grade ${grade}) have been finalized and recorded by your educator. Learners and parents can check their subject marks, percentage mastery, and academic progress in their portal.`;

        try {
            await db.query(`
                INSERT INTO announcements (title, content, role_target, author_id, grade_target, subject_target, created_at)
                VALUES ($1, $2, 'learner', $3, $4, $5, NOW())
            `, [markAnnouncementTitle, markAnnouncementContent, teacherId || 1, grade, subject]);
        } catch (annErr) {
            console.warn('[MARKS ANNOUNCEMENT NOTICE]', annErr.message);
        }

        // Dispatch targeted in-app notification and email update to learners and parents
        NotificationService.sendTargeted({
            targetRole: 'learner',
            grade: grade,
            subject: subject,
            includeParents: true,
            authorId: teacherId || 1,
            title: markAnnouncementTitle,
            message: markAnnouncementContent,
            fullContent: markAnnouncementContent,
            type: 'marks',
            targetTab: 'academics',
            sendToMessages: false, // Individual messages were already created per-learner above
            sendEmail: true,
            metadata: {
                subject: subject,
                grade: grade,
                assessment_name: assessmentTitle
            }
        }).catch(err => console.error('[MARKS NOTIFICATION DISPATCH ERROR]', err));

        res.json({
            success: true,
            message: `Successfully saved marks for ${savedCount} learners, published announcement, and notified recipients!`,
            saved_count: savedCount
        });
    } catch (err) {
        console.error('Error saving class marks:', err);
        res.status(500).json({ success: false, error: 'Failed to save marks: ' + err.message });
    }
};

/**
 * Gets historical academic progress records for a specific learner.
 */
exports.getClassRoster = exports.getClassList;

exports.recordMark = async (req, res) => {
    const { childId, subject, mark, notes, term = 'Term 1', assessmentTitle } = req.body;

    if (!childId || !subject || mark === undefined) {
        return res.status(400).json({ error: 'Child ID, subject, and mark are required.' });
    }

    try {
        await db.query(
            `INSERT INTO progress (child_id, subject, term, grade, notes) VALUES ($1, $2, $3, $4, $5)`,
            [childId, subject, term, parseInt(mark, 10), notes || assessmentTitle || 'Recorded mark']
        );

        // Fetch child details for parent/learner notification
        const childRes = await db.query(`
            SELECT c.id, c.learner_user_id, c.parent_id, c.full_name, c.surname, c.grade
            FROM children c WHERE c.id = $1 LIMIT 1
        `, [childId]);

        if (childRes.rows.length > 0) {
            const child = childRes.rows[0];
            const targetIds = [child.learner_user_id, child.parent_id].filter(Boolean);
            const noticeTitle = `New Mark Recorded: ${subject} (${mark}%)`;
            const noticeMsg = `A new mark of ${mark}% for ${notes || assessmentTitle || 'Class Assessment'} in ${subject} has been recorded for ${child.full_name || 'student'}.`;

            NotificationService.sendToUsers({
                userIds: targetIds,
                title: noticeTitle,
                message: noticeMsg,
                type: 'marks',
                targetTab: 'academics',
                authorId: req.user?.id || 1,
                sendToMessages: true,
                sendEmail: true
            }).catch(err => console.error('[RECORD MARK NOTIFICATION ERROR]', err));
        }

        res.json({ message: 'Mark recorded successfully and notification sent.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getLearnerProgress = async (req, res) => {
    try {
        const { childId } = req.params;
        const result = await db.query(
            `SELECT p.id, p.subject, p.term, p.grade, p.notes, COALESCE(p.date, NOW()) as created_at
             FROM progress p
             WHERE p.child_id = $1
             ORDER BY p.id DESC`,
            [childId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching learner progress:', err);
        res.status(500).json({ error: 'Failed to retrieve learner progress.' });
    }
};
