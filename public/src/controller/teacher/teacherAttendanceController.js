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

            // Automated Attendance Alert Message & Email to Parent if Absent or Late
            if (status === 'absent' || status === 'late') {
                try {
                    const childInfoRes = await client.query(
                        `SELECT c.full_name, c.surname, c.parent_id, u.email as parent_email, u.full_name as parent_name 
                         FROM children c 
                         LEFT JOIN users u ON c.parent_id = u.id 
                         WHERE c.id = $1`,
                        [childId]
                    );
                    if (childInfoRes.rows[0] && childInfoRes.rows[0].parent_id) {
                        const childInfo = childInfoRes.rows[0];
                        const learnerFullName = `${childInfo.full_name} ${childInfo.surname}`;
                        const statusText = status.toUpperCase();

                        // In-app portal message
                        await client.query(
                            `INSERT INTO messages (sender_id, recipient_id, child_id, subject, body, read_at, created_at)
                             VALUES ($1, $2, $3, $4, $5, NULL, NOW())`,
                            [
                                teacherId,
                                childInfo.parent_id,
                                childId,
                                `Attendance Alert: ${statusText} in ${subject}`,
                                `Dear Parent, your child ${learnerFullName} was marked ${statusText} for ${subject} on ${attendanceDate}. Please verify with the subject teacher.`
                            ]
                        );

                        // Direct Email Notification to Parent
                        if (childInfo.parent_email) {
                            const emailContent = `
                              <p style="font-size:15px; color:#ffffff; margin-top:0;">Dear <strong>${childInfo.parent_name || 'Parent'}</strong>,</p>
                              <p style="color:#cbd5e1; font-size:14px; line-height:1.6;">
                                This is an official automated attendance notification regarding your enrolled learner:
                              </p>
                              <div style="background:#0f172a; border:1px solid #334155; border-left:4px solid ${status === 'absent' ? '#f43f5e' : '#f59e0b'}; border-radius:10px; padding:16px 20px; margin:18px 0;">
                                <p style="margin:0; color:${status === 'absent' ? '#fb7185' : '#fbbf24'}; font-size:14px; font-weight:800; text-transform:uppercase;">
                                  ATTENDANCE STATUS: ${statusText}
                                </p>
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:8px; font-size:13px; color:#cbd5e1;">
                                  <tr><td style="padding:3px 0; color:#94a3b8; width:120px;">Learner:</td><td style="color:#ffffff; font-weight:700;">${learnerFullName}</td></tr>
                                  <tr><td style="padding:3px 0; color:#94a3b8;">Subject / Class:</td><td style="color:#38bdf8; font-weight:700;">${subject}</td></tr>
                                  <tr><td style="padding:3px 0; color:#94a3b8;">Date Recorded:</td><td style="color:#ffffff; font-weight:700;">${attendanceDate}</td></tr>
                                </table>
                              </div>
                              <p style="font-size:13px; color:#94a3b8; line-height:1.5;">
                                Please log in to your Parent Portal to review classroom records or message the educator directly.
                              </p>
                            `;
                            emailService.send(
                                childInfo.parent_email,
                                `[Attendance Notice] ${learnerFullName} marked ${statusText} on ${attendanceDate}`,
                                emailContent
                            ).catch(err => console.warn('[ATTENDANCE EMAIL ERROR]:', err.message));
                        }
                    }
                } catch (attAlertErr) {
                    console.warn('Attendance parent alert notice skipped:', attAlertErr.message);
                }
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Attendance register submitted successfully.' });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('Error submitting attendance:', err);
        res.status(500).json({ error: 'Failed to submit attendance register: ' + err.message });
    } finally {
        if (client) client.release();
    }
};
