const db = require('../../../db/db');
const NotificationService = require('../services/notificationService');
const { resolveSchoolId } = require('../services/schoolScope');

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
        target_day,
        target_period,
        target_subject,
        reason
    } = req.body;

    if (!timetable_id || !class_name || !requester_day || !requester_period || !target_day || !target_period || !target_teacher_id) {
        return res.status(400).json({ error: 'Choose the timetable, class, periods, and the other teacher.' });
    }
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ error: 'Choose a school before opening a timetable.' });

    try {
        const timetableRes = await db.query('SELECT id FROM timetables WHERE id = $1 AND school_id = $2', [timetable_id, schoolId]);
        if (timetableRes.rows.length === 0) {
            return res.status(404).json({ error: 'Timetable not found for this school.' });
        }
        const targetRes = await db.query(
            `SELECT u.id FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE u.id = $1 AND u.school_id = $2 AND r.name = 'teacher'`,
            [target_teacher_id, schoolId]
        );
        if (targetRes.rows.length === 0) {
            return res.status(404).json({ error: 'That teacher is not in this school.' });
        }
        const finalTargetTeacherId = targetRes.rows[0].id;

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

        // Notify target teacher via Notification Icon
        if (finalTargetTeacherId) {
            const notifySubject = `Timetable Slot Swap Request for ${class_name}`;
            const notifyBody = `${requesterName} requested to swap: ${requester_day} (${requester_period}) for ${target_day} (${target_period}).`;

            await NotificationService.sendToUsers([finalTargetTeacherId], {
                title: notifySubject,
                message: notifyBody,
                type: 'timetable',
                category: 'timetable',
                actionUrl: '/dashboard/teacher?tab=timetable'
            }).catch(e => console.warn('Swap request notification error:', e.message));
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
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ error: 'Choose a school before opening a timetable.' });
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
            WHERE (sr.requester_teacher_id = $1 OR sr.target_teacher_id = $1)
              AND tt.school_id = $2
              AND req.school_id = $2
            ORDER BY sr.created_at DESC;
        `;
        const { rows } = await db.query(query, [teacherId, schoolId]);
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
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ error: 'Choose a school before opening a timetable.' });
        const swapRes = await db.query(
            `SELECT sr.*, tt.school_id
             FROM timetable_swap_requests sr
             JOIN timetables tt ON tt.id = sr.timetable_id
             JOIN users requester ON requester.id = sr.requester_teacher_id
             JOIN users target ON target.id = sr.target_teacher_id
             WHERE sr.id = $1
               AND sr.target_teacher_id = $2
               AND tt.school_id = $3
               AND requester.school_id = $3
               AND target.school_id = $3`,
            [id, teacherId, schoolId]
        );

        if (swapRes.rows.length === 0) {
            return res.status(404).json({ error: 'Swap request not found or unauthorized.' });
        }

        const swap = swapRes.rows[0];

        if (action === 'declined') {
            await db.query('UPDATE timetable_swap_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['declined', id]);

            // Notify requester of decline via Notification Icon
            const notifySubject = `Slot Swap Request Declined (${swap.class_name})`;
            const notifyBody = `Your timetable slot swap request for ${swap.class_name} (${swap.requester_day} ${swap.requester_period}) was declined by your colleague.`;
            await NotificationService.sendToUsers([swap.requester_teacher_id], {
                title: notifySubject,
                message: notifyBody,
                type: 'timetable',
                category: 'timetable',
                actionUrl: '/dashboard/teacher?tab=timetable'
            }).catch(e => console.warn('Swap decline notification error:', e.message));

            return res.json({ message: 'Swap request declined.' });
        }

        // If ACCEPTED: Perform atomic timetable slots swap in PostgreSQL
        const ttRes = await db.query('SELECT * FROM timetables WHERE id = $1 AND school_id = $2', [swap.timetable_id, schoolId]);
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

        if (!ttData[cls] || !ttData[cls][rDay] || !ttData[cls][rDay][rPeriod] || !ttData[cls][tDay] || !ttData[cls][tDay][tPeriod]) {
            return res.status(400).json({ error: 'Both timetable slots must already exist before they can be swapped.' });
        }
        const slot1 = ttData[cls][rDay][rPeriod];
        const slot2 = ttData[cls][tDay][tPeriod];
        ttData[cls][rDay][rPeriod] = slot2;
        ttData[cls][tDay][tPeriod] = slot1;

        await db.query(
            'UPDATE timetables SET timetable_data = $1, updated_at = NOW() WHERE id = $2 AND school_id = $3',
            [JSON.stringify(ttData), swap.timetable_id, schoolId]
        );

        await db.query('UPDATE timetable_swap_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['accepted', id]);

        // Notify requester of acceptance via Notification Icon
        const notifySubject = `Slot Swap Accepted & Applied (${swap.class_name})`;
        const notifyBody = `Your timetable slot swap request for ${swap.class_name} has been accepted and updated in the active schedule.`;

        await NotificationService.sendToUsers([swap.requester_teacher_id], {
            title: notifySubject,
            message: notifyBody,
            type: 'timetable',
            category: 'timetable',
            actionUrl: '/dashboard/teacher?tab=timetable'
        }).catch(e => console.warn('Swap accept notification error:', e.message));

        res.json({
            message: 'Swap request accepted! Timetable slots have been successfully exchanged and saved.',
            updated_timetable_data: ttData
        });
    } catch (err) {
        console.error('Error responding to swap request:', err);
        res.status(500).json({ error: 'Failed to process swap response: ' + err.message });
    }
};
