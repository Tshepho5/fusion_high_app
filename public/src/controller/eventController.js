const db = require('../../../db/db');

/**
 * Retrieves school and class events for the user's role and enrolled grades.
 */
exports.getEvents = async (req, res) => {
    const userRole = req.user.role;
    const userId = req.user.id;

    try {
        let query = '';
        let params = [];

        if (userRole === 'learner') {
            const childRes = await db.query('SELECT grade, stream FROM children WHERE learner_user_id = $1', [userId]);
            const grade = childRes.rows[0]?.grade || 10;
            const stream = childRes.rows[0]?.stream || 'General';

            query = `
                SELECT e.*, u.full_name as creator_name, u.surname as creator_surname, r.name as creator_role
                FROM events e
                LEFT JOIN users u ON e.created_by = u.id
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE (e.audience = 'all' OR e.audience = 'learners')
                  AND (e.grade_target IS NULL OR e.grade_target = $1)
                  AND (e.stream_target IS NULL OR e.stream_target = $2 OR e.stream_target = 'General')
                ORDER BY e.event_date ASC, e.start_time ASC;
            `;
            params = [grade, stream];
        } else if (userRole === 'parent') {
            const childrenRes = await db.query('SELECT grade, stream FROM children WHERE parent_id = $1', [userId]);
            const grades = childrenRes.rows.map(c => c.grade);

            query = `
                SELECT e.*, u.full_name as creator_name, u.surname as creator_surname, r.name as creator_role
                FROM events e
                LEFT JOIN users u ON e.created_by = u.id
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE (e.audience = 'all' OR e.audience = 'parents')
                  AND (e.grade_target IS NULL OR e.grade_target = ANY($1::int[]))
                ORDER BY e.event_date ASC, e.start_time ASC;
            `;
            params = [grades.length > 0 ? grades : [8, 9, 10, 11, 12]];
        } else {
            // Teacher / Admin: view all school and academic events
            query = `
                SELECT e.*, u.full_name as creator_name, u.surname as creator_surname, r.name as creator_role
                FROM events e
                LEFT JOIN users u ON e.created_by = u.id
                LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY e.event_date ASC, e.start_time ASC;
            `;
        }

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ error: 'Failed to retrieve calendar events: ' + err.message });
    }
};

/**
 * Creates a new calendar event (Admin / Teacher).
 */
exports.createEvent = async (req, res) => {
    const creatorId = req.user.id;
    const {
        title,
        description,
        event_date,
        start_time,
        end_time,
        location,
        event_type = 'General',
        audience = 'all',
        grade_target,
        stream_target
    } = req.body;

    if (!title || !event_date) {
        return res.status(400).json({ error: 'Event title and date are required.' });
    }

    try {
        const result = await db.query(
            `INSERT INTO events 
             (title, description, event_date, start_time, end_time, location, event_type, audience, grade_target, stream_target, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                title,
                description || '',
                event_date,
                start_time || null,
                end_time || null,
                location || 'Fusion High School Campus',
                event_type,
                audience,
                grade_target ? parseInt(grade_target, 10) : null,
                stream_target || null,
                creatorId
            ]
        );

        res.json({
            message: 'Event published to school calendar successfully.',
            event: result.rows[0]
        });
    } catch (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ error: 'Failed to create calendar event: ' + err.message });
    }
};

/**
 * Deletes an event by ID.
 */
exports.deleteEvent = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        let deleteQuery = 'DELETE FROM events WHERE id = $1';
        const params = [id];

        if (userRole !== 'admin') {
            deleteQuery += ' AND created_by = $2';
            params.push(userId);
        }

        const result = await db.query(deleteQuery, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Event not found or unauthorized to delete.' });
        }

        res.json({ message: 'Event removed from calendar successfully.' });
    } catch (err) {
        console.error('Error deleting event:', err);
        res.status(500).json({ error: 'Failed to delete event.' });
    }
};
