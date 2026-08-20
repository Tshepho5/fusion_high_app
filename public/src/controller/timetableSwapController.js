const db = require('../../../db/db');

/**
 * Creates a timetable slot swap request between two teachers.
 */
exports.createSwapRequest = async (req, res) => {
    const requesterId = req.user.id;
    const {
        timetable_id,
        class_name,
        requester_day,
        requester_period,
        requester_subject,
        target_teacher_id,
        target_teacher_name,
        target_day,
        target_period,
        target_subject,
        reason
    } = req.body;

    if (!timetable_id || !class_name || !requester_day || !requester_period || !target_day || !target_period) {
        return res.status(400).json({ error: 'Missing required slot swap parameters.' });
    }

    try {
        let finalTargetTeacherId = target_teacher_id;

        // If target_teacher_id wasn't passed directly, resolve via teacher name
        if (!finalTargetTeacherId && target_teacher_name) {
            const teacherRes = await db.query(
                `SELECT u.id FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE (LOWER(u.full_name || ' ' || u.surname) ILIKE LOWER($1) OR LOWER(u.full_name) ILIKE LOWER($1))
                   AND r.name = 'teacher' LIMIT 1`,
                [`%${target_teacher_name.trim()}%`]
            );
            if (teacherRes.rows.length > 0) {
                finalTargetTeacherId = teacherRes.rows[0].id;
            }
        }

        const requesterRes = await db.query('SELECT full_name, surname FROM users WHERE id = $1', [requesterId]);
        const requesterName = `${requesterRes.rows[0]?.full_name || ''} ${requesterRes.rows[0]?.surname || ''}`.trim() || 'Colleague Teacher';

        const result = await db.query(
            `INSERT INTO timetable_swap_requests 
             (timetable_id, class_name, requester_teacher_id, requester_day, requester_period, requester_subject,
              target_teacher_id, target_day, target_period, target_subject, reason, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
             RETURNING *`,
            [
                timetable_id,
                class_name,
                requesterId,
                requester_day,
                requester_period,
                requester_subject || 'Subject Period',
                finalTargetTeacherId || null,
                target_day,
                target_period,
                target_subject || 'Subject Period',
                reason || 'Requested schedule adjustment'
            ]
        );

        // Notify target teacher in messages if resolved
        if (finalTargetTeacherId) {
            const notifySubject = `Timetable Slot Swap Request for ${class_name}`;
            const notifyBody = `${requesterName} has requested to exchange periods with you for ${class_name}.\n\n` +
                               `Proposed Swap:\n` +
                               `• Their Slot: ${requester_day} (${requester_period}) - ${requester_subject || 'Period'}\n` +
                               `• Your Slot: ${target_day} (${target_period}) - ${target_subject || 'Period'}\n` +
                               (reason ? `• Reason: ${reason}\n\n` : '\n') +
                               `Please visit your Class Timetable workspace to Accept or Decline this request.`;

            await db.query(
                `INSERT INTO messages (sender_id, recipient_id, subject, body, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [requesterId, finalTargetTeacherId, notifySubject, notifyBody]
            );
        }

        res.json({
            message: 'Slot swap request dispatched to educator successfully.',
            swap_request: result.rows[0]
        });
    } catch (err) {
        console.error('Error creating timetable swap request:', err);
        res.status(500).json({ error: 'Failed to create swap request: ' + err.message });
    }
};

/**
 * Fetches all incoming and outgoing swap requests for the logged in teacher.
 */
exports.getSwapRequests = async (req, res) => {
    const teacherId = req.user.id;
    try {
        const query = `
            SELECT sr.*, 
                   req.full_name as requester_name, req.surname as requester_surname, req.email as requester_email,
                   tar.full_name as target_name, tar.surname as target_surname, tar.email as target_email,
                   tt.name as timetable_name
            FROM timetable_swap_requests sr
            JOIN users req ON sr.requester_teacher_id = req.id
            LEFT JOIN users tar ON sr.target_teacher_id = tar.id
            JOIN timetables tt ON sr.timetable_id = tt.id
            WHERE sr.requester_teacher_id = $1 OR sr.target_teacher_id = $1
            ORDER BY sr.created_at DESC;
        `;
        const { rows } = await db.query(query, [teacherId]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching swap requests:', err);
        res.status(500).json({ error: 'Failed to retrieve swap requests.' });
    }
};

/**
 * Responds to a slot swap request (accept or decline).
 * If accepted, automatically swaps the period slots in PostgreSQL JSON timetable_data.
 */
exports.respondToSwapRequest = async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'accepted' or 'declined'
    const teacherId = req.user.id;

    if (!['accepted', 'declined'].includes(action)) {
        return res.status(400).json({ error: 'Action must be "accepted" or "declined".' });
    }

    try {
        const swapRes = await db.query(
            `SELECT sr.*, u.full_name as target_user_name, u.surname as target_user_surname 
             FROM timetable_swap_requests sr 
             JOIN users u ON sr.target_teacher_id = u.id 
             WHERE sr.id = $1 AND (sr.target_teacher_id = $2 OR sr.requester_teacher_id = $2)`,
            [id, teacherId]
        );

        if (swapRes.rows.length === 0) {
            return res.status(404).json({ error: 'Swap request not found or unauthorized.' });
        }

        const swap = swapRes.rows[0];

        if (action === 'declined') {
            await db.query('UPDATE timetable_swap_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['declined', id]);

            // Notify requester of decline
            const notifySubject = `Slot Swap Request Declined (${swap.class_name})`;
            const notifyBody = `Your timetable slot swap request for ${swap.class_name} (${swap.requester_day} ${swap.requester_period}) was declined by your colleague.`;
            await db.query(
                `INSERT INTO messages (sender_id, recipient_id, subject, body, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [teacherId, swap.requester_teacher_id, notifySubject, notifyBody]
            );

            return res.json({ message: 'Swap request declined.' });
        }

        // If ACCEPTED: Perform atomic timetable slots swap in PostgreSQL
        const ttRes = await db.query('SELECT * FROM timetables WHERE id = $1', [swap.timetable_id]);
        if (ttRes.rows.length === 0) {
            return res.status(404).json({ error: 'Referenced timetable not found.' });
        }

        let ttData = typeof ttRes.rows[0].timetable_data === 'string'
            ? JSON.parse(ttRes.rows[0].timetable_data)
            : ttRes.rows[0].timetable_data;

        const cls = swap.class_name;
        const rDay = swap.requester_day;
        const rPeriod = swap.requester_period;
        const tDay = swap.target_day;
        const tPeriod = swap.target_period;

        if (ttData[cls]) {
            const slot1 = ttData[cls]?.[rDay]?.[rPeriod] || { subject: swap.requester_subject, teacher: 'Teacher' };
            const slot2 = ttData[cls]?.[tDay]?.[tPeriod] || { subject: swap.target_subject, teacher: 'Teacher' };

            // Exchange slots
            if (!ttData[cls][rDay]) ttData[cls][rDay] = {};
            if (!ttData[cls][tDay]) ttData[cls][tDay] = {};

            ttData[cls][rDay][rPeriod] = slot2;
            ttData[cls][tDay][tPeriod] = slot1;

            await db.query(
                'UPDATE timetables SET timetable_data = $1, updated_at = NOW() WHERE id = $2',
                [JSON.stringify(ttData), swap.timetable_id]
            );
        }

        await db.query('UPDATE timetable_swap_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['accepted', id]);

        // Notify requester of acceptance
        const notifySubject = `Slot Swap Accepted & Applied (${swap.class_name})`;
        const notifyBody = `Great news! Your timetable slot swap request for ${swap.class_name} has been accepted.\n\n` +
                           `Your schedule has been updated:\n` +
                           `• You are now teaching on ${tDay} (${tPeriod}) - ${swap.requester_subject}.\n` +
                           `The active timetable data has been automatically updated in the database.`;

        await db.query(
            `INSERT INTO messages (sender_id, recipient_id, subject, body, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [teacherId, swap.requester_teacher_id, notifySubject, notifyBody]
        );

        res.json({
            message: 'Swap request accepted! Timetable slots have been successfully exchanged and saved.',
            updated_timetable_data: ttData
        });
    } catch (err) {
        console.error('Error responding to swap request:', err);
        res.status(500).json({ error: 'Failed to process swap response: ' + err.message });
    }
};
