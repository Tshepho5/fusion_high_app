const db = require('../../../../db/db');
const emailService = require('../../services/emailService');

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
            LEFT JOIN attendance a ON c.id = a.child_id AND a.attendance_date = $2::DATE
            WHERE (c.class_id::text = $1 OR c.grade::text = $3)
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
 * Submits attendance register for a class.
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

            await client.query(
                `INSERT INTO attendance (child_id, subject_name, attendance_date, status, recorded_by_teacher_id)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (child_id, attendance_date, subject_name) 
                 DO UPDATE SET status = EXCLUDED.status, recorded_by_teacher_id = EXCLUDED.recorded_by_teacher_id, created_at = NOW()`,
                [childId, subject, attendanceDate, status, teacherId]
            );

            // Automated Attendance Alert Message & Email to Parent for Present, Late, and Absent
            try {
                const childInfoRes = await client.query(
                    `SELECT c.full_name, c.surname, c.learner_number, c.parent_id, u.email as parent_email, u.full_name as parent_name 
                     FROM children c 
                     LEFT JOIN users u ON c.parent_id = u.id 
                     WHERE c.id = $1`,
                    [childId]
                );
                if (childInfoRes.rows[0] && childInfoRes.rows[0].parent_id) {
                    const childInfo = childInfoRes.rows[0];
                    const learnerFullName = `${childInfo.full_name} ${childInfo.surname}`;
                    const statusText = status.toUpperCase();
                    const scanTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    let statusColor = '#10b981'; // Green for present
                    let statusTitle = `✅ Present & Verified`;
                    if (status === 'late') {
                        statusColor = '#f59e0b';
                        statusTitle = `⏰ Marked Late`;
                    } else if (status === 'absent') {
                        statusColor = '#f43f5e';
                        statusTitle = `⚠️ Marked Absent`;
                    }

                    // In-app portal message
                    await client.query(
                        `INSERT INTO messages (sender_id, recipient_id, child_id, subject, body, content, read_at, created_at)
                         VALUES ($1, $2, $3, $4, $5, $5, NULL, NOW())`,
                        [
                            teacherId || 1,
                            childInfo.parent_id,
                            childId,
                            `Attendance Notice: ${learnerFullName} marked ${statusText}`,
                            `Dear Parent, ${learnerFullName} was marked ${statusText} for ${subject} on ${attendanceDate} at ${scanTimeStr}.`
                        ]
                    );

                    // Direct Email Notification to Parent
                    if (childInfo.parent_email) {
                        const emailHtml = `
                          <p style="font-size:15px; color:#ffffff; margin-top:0;">Dear <strong>${childInfo.parent_name || 'Parent/Guardian'}</strong>,</p>
                          <p style="color:#cbd5e1; font-size:14px; line-height:1.6;">
                            This is an official automated attendance notification regarding your enrolled learner at Fusion High School:
                          </p>
                          <div style="background:#0f172a; border:1px solid #334155; border-left:4px solid ${statusColor}; border-radius:10px; padding:16px 20px; margin:18px 0;">
                            <p style="margin:0; color:${statusColor}; font-size:15px; font-weight:800; text-transform:uppercase;">
                              ${statusTitle}
                            </p>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:10px; font-size:13px; color:#cbd5e1;">
                              <tr><td style="padding:4px 0; color:#94a3b8; width:130px;">Learner:</td><td style="color:#ffffff; font-weight:700;">${learnerFullName} (${childInfo.learner_number || 'N/A'})</td></tr>
                              <tr><td style="padding:4px 0; color:#94a3b8;">Subject / Period:</td><td style="color:#38bdf8; font-weight:700;">${subject}</td></tr>
                              <tr><td style="padding:4px 0; color:#94a3b8;">Date Recorded:</td><td style="color:#ffffff; font-weight:700;">${attendanceDate}</td></tr>
                              <tr><td style="padding:4px 0; color:#94a3b8;">Logged Time:</td><td style="color:#ffffff; font-weight:700;">${scanTimeStr}</td></tr>
                            </table>
                          </div>
                          <p style="font-size:13px; color:#94a3b8; line-height:1.5;">
                            You can log in to your Parent Portal at any time to review real-time academic records, timetable updates, and communicate with subject teachers.
                          </p>
                        `;
                        emailService.send(
                            childInfo.parent_email,
                            `[Attendance Notice] ${learnerFullName} marked ${statusText} on ${attendanceDate}`,
                            emailHtml
                        ).catch(e => console.warn('[ATTENDANCE EMAIL NOTICE]:', e.message));
                    }
                }
            } catch (notifyErr) {
                console.warn('[ATTENDANCE NOTIFICATION ERROR]:', notifyErr.message);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Successfully registered attendance for ${attendanceData.length} learners.` });
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

        if (classId) {
            const cleanedGrade = classId.toString().replace(/[^0-9]/g, '');
            whereClauses.push(`(c.class_id::text = $${pIndex} OR c.grade::text = $${pIndex + 1})`);
            params.push(classId.toString(), cleanedGrade || '0');
            pIndex += 2;
        }

        if (date) {
            whereClauses.push(`a.attendance_date = $${pIndex}::DATE`);
            params.push(date);
            pIndex++;
        } else if (startDate && endDate) {
            whereClauses.push(`a.attendance_date BETWEEN $${pIndex}::DATE AND $${pIndex + 1}::DATE`);
            params.push(startDate, endDate);
            pIndex += 2;
        }

        if (status && status !== 'all') {
            whereClauses.push(`LOWER(a.status) = LOWER($${pIndex})`);
            params.push(status);
            pIndex++;
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const query = `
            SELECT 
                a.id as record_id,
                a.child_id,
                a.subject_name,
                a.attendance_date,
                a.status,
                a.created_at as recorded_at,
                c.full_name as learner_name,
                c.surname as learner_surname,
                c.learner_number,
                c.grade,
                c.class_id,
                t.full_name as teacher_name,
                t.surname as teacher_surname,
                u.email as parent_email,
                u.full_name as parent_name
            FROM attendance a
            JOIN children c ON a.child_id = c.id
            LEFT JOIN users t ON a.recorded_by_teacher_id = t.id
            LEFT JOIN users u ON c.parent_id = u.id
            ${whereSql}
            ORDER BY a.attendance_date DESC, a.created_at DESC, c.surname ASC
            LIMIT 300;
        `;

        const { rows } = await db.query(query, params);

        const totalRecords = rows.length;
        const presentCount = rows.filter(r => r.status.toLowerCase() === 'present').length;
        const lateCount = rows.filter(r => r.status.toLowerCase() === 'late').length;
        const absentCount = rows.filter(r => r.status.toLowerCase() === 'absent').length;
        const rate = totalRecords > 0 ? Math.round(((presentCount + lateCount) / totalRecords) * 100) : 100;

        res.json({
            success: true,
            records: rows,
            stats: {
                total: totalRecords,
                present: presentCount,
                late: lateCount,
                absent: absentCount,
                rate
            }
        });
    } catch (err) {
        console.error('Error fetching attendance history:', err);
        res.status(500).json({ success: false, error: 'Failed to retrieve attendance history: ' + err.message });
    }
};
