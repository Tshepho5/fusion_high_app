const db = require('../../../../db/db');
const emailService = require('../../services/emailService');
const NotificationService = require('../../services/notificationService');

/**
 * Gets attendance roster for a class on a specific date.
 */
exports.getAttendanceRoster = async (req, res) => {
    const classId = req.query.class_id || req.query.classId || req.query.class || req.query.grade;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    if (!classId) {
        return res.status(400).json({ error: 'Class or grade parameter is required.' });
    }

    const cleanedGrade = classId.toString().replace(/[^0-9]/g, '');

    try {
        const query = `
            SELECT 
                c.id, 
                c.full_name, 
                c.surname, 
                c.learner_number, 
                c.grade,
                c.parent_id,
                COALESCE(a.status, 'present') as status
            FROM children c
            LEFT JOIN classes cl ON c.class_id = cl.id
            LEFT JOIN attendance a ON c.id = a.child_id AND a.attendance_date = $2::DATE
            WHERE (cl.name ILIKE $1 OR c.class_id::text = $1 OR c.grade::text = $3)
            ORDER BY c.surname, c.full_name
        `;
        const { rows } = await db.query(query, [classId, date, cleanedGrade || '0']);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching attendance roster:', err);
        res.status(500).json({ error: 'Failed to retrieve attendance roster: ' + err.message });
    }
};

/**
 * Submits attendance register for a class and dispatches real-time email notices to parents.
 */
exports.submitAttendance = async (req, res) => {
    const teacherId = req.user ? req.user.id : null;
    const classId = req.body.class_id || req.body.classId || req.body.class || req.body.class_name || req.body.grade || '10A';
    const attendanceDate = req.body.attendance_date || req.body.date || new Date().toISOString().split('T')[0];
    let attendanceData = req.body.records || req.body.roster || req.body.attendanceData || req.body.attendance || [];
    const subject = req.body.subject_name || req.body.subject || 'General Registration';

    // Normalize dictionary map { child_id: status } to array of records
    if (!Array.isArray(attendanceData) && typeof attendanceData === 'object' && attendanceData !== null) {
        attendanceData = Object.entries(attendanceData).map(([child_id, status]) => ({
            child_id,
            status: typeof status === 'string' ? status : (status.status || 'present')
        }));
    }

    if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing required attendance records data.' });
    }

    let client;
    const emailDispatchTasks = [];

    try {
        client = await db.pool.connect();
        await client.query('BEGIN');

        for (const record of attendanceData) {
            let childId = record.child_id || record.learner_id || record.id;
            const status = (record.status || 'present').toLowerCase();

            // If childId is missing or non-numeric, resolve by learner_number
            if (!childId && record.learner_number) {
                const childLookup = await client.query('SELECT id FROM children WHERE learner_number = $1 LIMIT 1', [record.learner_number]);
                if (childLookup.rows.length > 0) {
                    childId = childLookup.rows[0].id;
                }
            }

            if (!childId) continue;

            const existingAtt = await client.query(
                `SELECT id FROM attendance WHERE child_id = $1 AND attendance_date = $2::DATE AND (subject_name = $3 OR subject_name IS NULL) LIMIT 1`,
                [childId, attendanceDate, subject]
            );

            if (existingAtt.rows.length > 0) {
                await client.query(
                    `UPDATE attendance SET status = $1, subject_name = $2, recorded_by_teacher_id = $3, created_at = NOW() WHERE id = $4`,
                    [status, subject, teacherId, existingAtt.rows[0].id]
                );
            } else {
                await client.query(
                    `INSERT INTO attendance (child_id, subject_name, attendance_date, status, recorded_by_teacher_id)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [childId, subject, attendanceDate, status, teacherId]
                );
            }
        }

        await client.query('COMMIT');
        client.release();
        client = null;

        // Dispatch parent notifications and emails after successful attendance commit
        for (const record of attendanceData) {
            let childId = record.child_id || record.learner_id || record.id;
            const status = (record.status || 'present').toLowerCase();
            if (!childId) continue;

            try {
                const childInfoRes = await db.query(
                    `SELECT c.id, c.full_name, c.surname, c.learner_number, 
                            COALESCE(c.parent_id, pc.parent_id, c.secondary_parent_id) as parent_id,
                            COALESCE(u.email, pu.email, su.email, app.primary_parent_email, app.secondary_parent_email) as parent_email,
                            COALESCE(
                                NULLIF(TRIM(u.full_name), ''),
                                NULLIF(TRIM(pu.full_name), ''),
                                NULLIF(TRIM(su.full_name), ''),
                                NULLIF(TRIM(CONCAT(app.primary_parent_name, ' ', COALESCE(app.primary_parent_surname, ''))), ''),
                                'Parent / Guardian'
                            ) as parent_name
                     FROM children c 
                     LEFT JOIN users u ON c.parent_id = u.id 
                     LEFT JOIN parent_children pc ON pc.child_id = c.id
                     LEFT JOIN users pu ON pc.parent_id = pu.id
                     LEFT JOIN users su ON c.secondary_parent_id = su.id
                     LEFT JOIN applications app ON (c.application_number = app.application_number OR c.learner_number = app.provisional_learner_number)
                     WHERE c.id = $1
                     LIMIT 1`,
                    [childId]
                );

                if (childInfoRes.rows.length > 0) {
                    const childInfo = childInfoRes.rows[0];
                    const learnerFullName = `${childInfo.full_name || ''} ${childInfo.surname || ''}`.trim() || 'Learner';
                    const statusText = status.toUpperCase();
                    const scanTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    // 1. In-App Notification (If parent account exists in users table)
                    if (childInfo.parent_id) {
                        const validUser = await db.query('SELECT id FROM users WHERE id = $1', [childInfo.parent_id]);
                        if (validUser.rows.length > 0) {
                            await NotificationService.sendToUsers({
                                userIds: [childInfo.parent_id],
                                title: `Attendance: ${learnerFullName} marked ${statusText}`,
                                message: `${learnerFullName} was marked ${statusText} for ${subject} on ${attendanceDate} at ${scanTimeStr}.`,
                                type: 'attendance',
                                targetTab: 'calendar',
                                metadata: { child_id: childId, status, date: attendanceDate, subject }
                            }).catch(e => console.warn('[NOTIFICATION SERVICE ATTENDANCE NOTICE]:', e.message));

                            await db.query(
                                `INSERT INTO messages (sender_id, recipient_id, child_id, subject, body, content, read_at, created_at)
                                 VALUES ($1, $2, $3, $4, $5, $5, NULL, NOW())`,
                                [
                                    teacherId || 1,
                                    childInfo.parent_id,
                                    childId,
                                    `Attendance Notice: ${learnerFullName} marked ${statusText}`,
                                    `Dear Parent, ${learnerFullName} was marked ${statusText} for ${subject} on ${attendanceDate} at ${scanTimeStr}.`
                                ]
                            ).catch(e => console.warn('[MESSAGES INSERT ERROR]:', e.message));
                        }
                    }

                    // 2. Direct Styled HTML Email Notification to Parent
                    if (childInfo.parent_email) {
                        const template = emailService.templates.attendanceNotification({
                            parentName: childInfo.parent_name || 'Parent / Guardian',
                            learnerName: learnerFullName,
                            learnerId: childInfo.learner_number || String(childInfo.id),
                            status: statusText,
                            date: attendanceDate,
                            subjectName: subject,
                            scanTime: scanTimeStr
                        });

                        emailDispatchTasks.push(
                            emailService.send(childInfo.parent_email, template.subject, template.body)
                                .then(res => {
                                    if (res && res.success) {
                                        console.log(`[ATTENDANCE EMAIL SENT] Successfully delivered to ${childInfo.parent_email}`);
                                    } else {
                                        console.warn(`[ATTENDANCE EMAIL WARNING] Delivery response to ${childInfo.parent_email}:`, res);
                                    }
                                    return res;
                                })
                                .catch(err => {
                                    console.error(`[ATTENDANCE EMAIL FAILED] Error sending to ${childInfo.parent_email}:`, err.message);
                                    return { success: false, error: err.message };
                                })
                        );
                    } else {
                        console.log(`[ATTENDANCE EMAIL SKIP] No parent email on file for child ID ${childId} (${learnerFullName})`);
                    }
                }
            } catch (notifyErr) {
                console.warn('[ATTENDANCE NOTIFICATION ERROR]:', notifyErr.message);
            }
        }

        // Dispatch & wait for all queued attendance emails concurrently
        let sentCount = 0;
        if (emailDispatchTasks.length > 0) {
            const results = await Promise.allSettled(emailDispatchTasks);
            sentCount = results.filter(r => r.status === 'fulfilled' && r.value && r.value.success).length;
            console.log(`[ATTENDANCE EMAIL BATCH] Completed dispatch: ${sentCount}/${emailDispatchTasks.length} emails delivered.`);
        }

        res.json({
            success: true,
            message: `Successfully registered attendance for ${attendanceData.length} learners. Dispatched ${sentCount} parent email notifications.`,
            emails_sent: sentCount
        });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('Error submitting attendance:', err);
        res.status(500).json({ success: false, error: 'Database transaction error: ' + err.message });
    } finally {
        if (client) client.release();
    }
};

/**
 * Gets historical attendance records with aggregated statistics for teachers.
 */
exports.getAttendanceHistory = async (req, res) => {
    const classId = req.query.class_id || req.query.classId || req.query.class;
    const date = req.query.date;
    const startDate = req.query.startDate || req.query.start_date;
    const endDate = req.query.endDate || req.query.end_date;
    const status = req.query.status;

    try {
        let whereClauses = [];
        let params = [];
        let pIndex = 1;

        if (classId && classId !== 'all') {
            const cleanedGrade = classId.toString().replace(/[^0-9]/g, '');
            whereClauses.push(`(c.class_id::text = $${pIndex} OR c.grade::text = $${pIndex + 1})`);
            params.push(classId, cleanedGrade || '0');
            pIndex += 2;
        }

        if (date) {
            whereClauses.push(`a.attendance_date = $${pIndex}::DATE`);
            params.push(date);
            pIndex += 1;
        } else if (startDate && endDate) {
            whereClauses.push(`a.attendance_date BETWEEN $${pIndex}::DATE AND $${pIndex + 1}::DATE`);
            params.push(startDate, endDate);
            pIndex += 2;
        }

        if (status && status !== 'all') {
            whereClauses.push(`a.status = $${pIndex}`);
            params.push(status.toLowerCase());
            pIndex += 1;
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const query = `
            SELECT 
                a.id,
                a.child_id,
                c.full_name as learner_name,
                c.surname as learner_surname,
                c.learner_number,
                c.grade,
                COALESCE(c.class_id::text, '10A') as class_name,
                a.subject_name,
                a.attendance_date,
                a.status,
                a.created_at,
                u.full_name as recorded_by_teacher,
                COALESCE(pu.email, su.email, app.primary_parent_email, app.secondary_parent_email) as parent_email
            FROM attendance a
            JOIN children c ON a.child_id = c.id
            LEFT JOIN users u ON a.recorded_by_teacher_id = u.id
            LEFT JOIN users pu ON c.parent_id = pu.id
            LEFT JOIN users su ON c.secondary_parent_id = su.id
            LEFT JOIN applications app ON (c.application_number = app.application_number OR c.learner_number = app.provisional_learner_number)
            ${whereSql}
            ORDER BY a.attendance_date DESC, c.surname, c.full_name
            LIMIT 200
        `;

        const { rows } = await db.query(query, params);

        // Calculate summary stats
        const total = rows.length;
        const present = rows.filter(r => r.status === 'present').length;
        const late = rows.filter(r => r.status === 'late').length;
        const absent = rows.filter(r => r.status === 'absent').length;
        const presentRate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

        res.json({
            records: rows,
            stats: {
                total,
                present,
                late,
                absent,
                presentRate: `${presentRate}%`
            }
        });
    } catch (err) {
        console.error('Error fetching attendance history:', err);
        res.status(500).json({ error: 'Failed to retrieve attendance history: ' + err.message });
    }
};
