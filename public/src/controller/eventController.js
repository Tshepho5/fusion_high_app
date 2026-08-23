const db = require('../../../db/db');

// Official South African Public Holidays & DBE 4-Term School Calendar (2026)
const OFFICIAL_SA_HOLIDAYS_AND_TERMS = [
    // --- South African Statutory Public Holidays ---
    { title: "New Year's Day", event_date: "2026-01-01", event_type: "Holiday", audience: "all", description: "National Public Holiday: Celebrating the start of 2026." },
    { title: "Human Rights Day", event_date: "2026-03-21", event_type: "Holiday", audience: "all", description: "Commemoration of Sharpeville and the South African Bill of Rights." },
    { title: "Good Friday", event_date: "2026-04-03", event_type: "Holiday", audience: "all", description: "National Christian & Public Holiday." },
    { title: "Family Day (Easter Monday)", event_date: "2026-04-06", event_type: "Holiday", audience: "all", description: "National Public Holiday following Easter Sunday." },
    { title: "Freedom Day", event_date: "2026-04-27", event_type: "Holiday", audience: "all", description: "Commemoration of South Africa's first democratic elections in 1994." },
    { title: "Workers' Day", event_date: "2026-05-01", event_type: "Holiday", audience: "all", description: "International Labour Day honoring workers' rights in South Africa." },
    { title: "Youth Day (Soweto Uprising)", event_date: "2026-06-16", event_type: "Holiday", audience: "all", description: "Commemorating the 1976 Soweto youth uprising and student rights." },
    { title: "National Women's Day", event_date: "2026-08-09", event_type: "Holiday", audience: "all", description: "Honoring the 1956 women's march against pass laws." },
    { title: "Public Holiday (Women's Day Observed)", event_date: "2026-08-10", event_type: "Holiday", audience: "all", description: "Official observed public holiday under the Public Holidays Act." },
    { title: "Heritage Day (National Braai Day)", event_date: "2026-09-24", event_type: "Holiday", audience: "all", description: "Celebration of South Africa's rich cultural diversity and traditions." },
    { title: "Day of Reconciliation", event_date: "2026-12-16", event_type: "Holiday", audience: "all", description: "Promoting national unity and racial harmony across South Africa." },
    { title: "Christmas Day", event_date: "2026-12-25", event_type: "Holiday", audience: "all", description: "National Christian & Family Celebration." },
    { title: "Day of Goodwill", event_date: "2026-12-26", event_type: "Holiday", audience: "all", description: "National Public Holiday (Boxing Day)." },

    // --- Department of Basic Education (DBE) South African School Calendar (2026) ---
    { title: "DBE Term 1 Starts (Inland & Coastal Schools Reopen)", event_date: "2026-01-14", event_type: "Academic", audience: "all", description: "Official start of Term 1 2026 academic curriculum and learner orientation." },
    { title: "DBE Term 1 Ends (Autumn School Vacation Begins)", event_date: "2026-03-27", event_type: "Holiday", audience: "all", description: "School closes for Autumn vacation (28 March – 7 April 2026)." },
    { title: "DBE Term 2 Starts (Winter Term Opens)", event_date: "2026-04-08", event_type: "Academic", audience: "all", description: "Term 2 commences for all learners and educators." },
    { title: "DBE Term 2 Ends (Winter Vacation Begins)", event_date: "2026-06-26", event_type: "Holiday", audience: "all", description: "School closes for 3-week winter vacation (27 June – 20 July 2026)." },
    { title: "DBE Term 3 Starts (Spring Academic Term)", event_date: "2026-07-21", event_type: "Academic", audience: "all", description: "School reopens for Term 3 CAPS teaching and preparatory assessments." },
    { title: "DBE Term 3 Ends (Spring Break)", event_date: "2026-10-02", event_type: "Holiday", audience: "all", description: "School closes for Spring vacation (3 October – 12 October 2026)." },
    { title: "DBE Term 4 Starts (Final Promotional Term)", event_date: "2026-10-13", event_type: "Academic", audience: "all", description: "Final term of the academic year commences." },
    { title: "Grade 12 NSC Final Examinations Commence", event_date: "2026-10-19", event_type: "Exam", audience: "all", description: "National Senior Certificate (NSC) Grade 12 final examinations kick off nationwide." },
    { title: "Grade 12 NSC Final Examinations Conclude", event_date: "2026-11-27", event_type: "Exam", audience: "all", description: "Completion of all Grade 12 National Senior Certificate papers." },
    { title: "DBE Term 4 Ends (Academic Year Closes)", event_date: "2026-12-09", event_type: "Holiday", audience: "all", description: "Official closure of the 2026 school academic year and start of summer vacation." }
];

/**
 * Ensures standard South African Public Holidays and DBE Terms exist in the database.
 */
async function syncSouthAfricanSchoolCalendar() {
    try {
        for (const item of OFFICIAL_SA_HOLIDAYS_AND_TERMS) {
            const check = await db.query(
                'SELECT id FROM events WHERE event_date = $1 AND title = $2 LIMIT 1',
                [item.event_date, item.title]
            );
            if (check.rows.length === 0) {
                await db.query(
                    `INSERT INTO events (title, description, event_date, event_type, audience, location, start_time, end_time)
                     VALUES ($1, $2, $3, $4, $5, 'Republic of South Africa', '08:00', '16:00')
                     ON CONFLICT DO NOTHING`,
                    [item.title, item.description, item.event_date, item.event_type, item.audience]
                );
            }
        }
    } catch (err) {
        console.warn('[CALENDAR AUTO-SYNC] Notice syncing South African calendar:', err.message);
    }
}

// Sync calendar entries on module load
syncSouthAfricanSchoolCalendar();

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
                WHERE (e.audience = 'all' OR e.audience = 'learners' OR e.audience IS NULL)
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
                WHERE (e.audience = 'all' OR e.audience = 'parents' OR e.audience IS NULL)
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
 * Updates / Edits an existing calendar event (Admin / Teacher).
 */
exports.updateEvent = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = (req.user.role || '').toLowerCase();
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
        let updateQuery = `
            UPDATE events 
            SET title = $1,
                description = $2,
                event_date = $3,
                start_time = $4,
                end_time = $5,
                location = $6,
                event_type = $7,
                audience = $8,
                grade_target = $9,
                stream_target = $10,
                updated_at = NOW()
            WHERE id = $11
        `;
        const params = [
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
            id
        ];

        // If not admin, verify ownership or allow educators to update details
        if (userRole !== 'admin' && userRole !== 'teacher') {
            updateQuery += ' AND created_by = $12';
            params.push(userId);
        }

        updateQuery += ' RETURNING *;';

        const result = await db.query(updateQuery, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Event not found or unauthorized to update.' });
        }

        res.json({
            message: 'Event updated successfully in the school calendar.',
            event: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating event:', err);
        res.status(500).json({ error: 'Failed to update calendar event: ' + err.message });
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
