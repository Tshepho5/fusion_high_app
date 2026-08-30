const db = require('../../../db/db');

/**
 * Calculates Easter Sunday for any given Gregorian year using the Meeus/Jones/Butcher algorithm.
 */
function getEasterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day));
}

function formatDateStr(d) {
    const yr = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
}

function addDays(d, days) {
    const res = new Date(d.getTime());
    res.setUTCDate(res.getUTCDate() + days);
    return res;
}

/**
 * Computes official South African Statutory Public Holidays for any given year
 * adhering to the Public Holidays Act No 36 of 1994 (including Sunday observation rule).
 */
function generateSAPublicHolidays(year) {
    const holidays = [];

    const fixedHolidays = [
        { month: 0, day: 1, name: "New Year's Day", desc: `Official South African Public Holiday celebrating the start of ${year}.` },
        { month: 2, day: 21, name: "Human Rights Day", desc: "Commemoration of Sharpeville and the South African Bill of Rights." },
        { month: 3, day: 27, name: "Freedom Day", desc: "Commemorating South Africa's first democratic elections in 1994." },
        { month: 4, day: 1, name: "Workers' Day", desc: "International Labour Day honoring workers' rights in South Africa." },
        { month: 5, day: 16, name: "Youth Day (Soweto Uprising)", desc: "Commemorating the 1976 Soweto youth uprising and student rights." },
        { month: 7, day: 9, name: "National Women's Day", desc: "Honoring the 1956 women's march against pass laws in Pretoria." },
        { month: 8, day: 24, name: "Heritage Day (National Braai Day)", desc: "Celebration of South Africa's rich cultural diversity and traditions." },
        { month: 11, day: 16, name: "Day of Reconciliation", desc: "Promoting national unity and racial harmony across South Africa." },
        { month: 11, day: 25, name: "Christmas Day", desc: "National Christian and family celebration." },
        { month: 11, day: 26, name: "Day of Goodwill", desc: "Official South African Public Holiday (Boxing Day)." }
    ];

    for (const h of fixedHolidays) {
        const dateObj = new Date(Date.UTC(year, h.month, h.day));
        const isSunday = dateObj.getUTCDay() === 0;

        holidays.push({
            title: h.name,
            event_date: formatDateStr(dateObj),
            event_type: 'Holiday',
            audience: 'all',
            description: h.desc
        });

        // Section 2(1) Public Holidays Act: If a public holiday falls on a Sunday, the following Monday is observed
        if (isSunday) {
            const observedDate = addDays(dateObj, 1);
            holidays.push({
                title: `Public Holiday (${h.name} Observed)`,
                event_date: formatDateStr(observedDate),
                event_type: 'Holiday',
                audience: 'all',
                description: `Statutory observed public holiday under the South African Public Holidays Act (since ${h.name} falls on a Sunday).`
            });
        }
    }

    // Dynamic Easter-Dependent Public Holidays
    const easterSunday = getEasterSunday(year);
    const goodFriday = addDays(easterSunday, -2);
    const familyDay = addDays(easterSunday, 1);

    holidays.push({
        title: "Good Friday",
        event_date: formatDateStr(goodFriday),
        event_type: 'Holiday',
        audience: 'all',
        description: `National Christian & Public Holiday (${year} Easter Weekend).`
    });

    holidays.push({
        title: "Family Day (Easter Monday)",
        event_date: formatDateStr(familyDay),
        event_type: 'Holiday',
        audience: 'all',
        description: `National Public Holiday following Easter Sunday (${year}).`
    });

    return holidays;
}

/**
 * Computes official Department of Basic Education (DBE) and DHET 4-Term Calendar for any year.
 */
function generateDBETermCalendar(year) {
    // Specific official published dates for 2025 & 2026, and dynamic algorithm for upcoming years
    if (year === 2026) {
        return [
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
    } else if (year === 2025) {
        return [
            { title: "DBE Term 1 Starts (Schools Reopen)", event_date: "2025-01-15", event_type: "Academic", audience: "all", description: "Official start of Term 1 2025." },
            { title: "DBE Term 1 Ends (Autumn Vacation)", event_date: "2025-03-28", event_type: "Holiday", audience: "all", description: "School closes for Autumn break." },
            { title: "DBE Term 2 Starts", event_date: "2025-04-08", event_type: "Academic", audience: "all", description: "Term 2 commences." },
            { title: "DBE Term 2 Ends (Winter Vacation)", event_date: "2025-06-27", event_type: "Holiday", audience: "all", description: "School closes for Winter break." },
            { title: "DBE Term 3 Starts", event_date: "2025-07-22", event_type: "Academic", audience: "all", description: "Term 3 commences." },
            { title: "DBE Term 3 Ends (Spring Break)", event_date: "2025-10-03", event_type: "Holiday", audience: "all", description: "School closes for Spring vacation." },
            { title: "DBE Term 4 Starts", event_date: "2025-10-14", event_type: "Academic", audience: "all", description: "Term 4 final promotional term." },
            { title: "Grade 12 NSC Final Examinations Commence", event_date: "2025-10-20", event_type: "Exam", audience: "all", description: "National Senior Certificate final exams." },
            { title: "Grade 12 NSC Final Examinations Conclude", event_date: "2025-11-28", event_type: "Exam", audience: "all", description: "NSC exams conclude." },
            { title: "DBE Term 4 Ends (Academic Year Closes)", event_date: "2025-12-10", event_type: "Holiday", audience: "all", description: "Closure of academic year." }
        ];
    }

    // Dynamic standard formula for future academic years (2027, 2028, etc.)
    return [
        { title: `DBE Term 1 Starts (${year} Schools Reopen)`, event_date: `${year}-01-13`, event_type: "Academic", audience: "all", description: `Department of Basic Education Term 1 ${year} commences.` },
        { title: `DBE Term 1 Ends (Autumn Vacation Begins)`, event_date: `${year}-03-26`, event_type: "Holiday", audience: "all", description: `School closes for Autumn vacation.` },
        { title: `DBE Term 2 Starts (Winter Term Opens)`, event_date: `${year}-04-07`, event_type: "Academic", audience: "all", description: `Term 2 ${year} commences.` },
        { title: `DBE Term 2 Ends (Winter Vacation Begins)`, event_date: `${year}-06-25`, event_type: "Holiday", audience: "all", description: `School closes for Winter vacation.` },
        { title: `DBE Term 3 Starts (Spring Academic Term)`, event_date: `${year}-07-20`, event_type: "Academic", audience: "all", description: `Term 3 ${year} commences.` },
        { title: `DBE Term 3 Ends (Spring Break)`, event_date: `${year}-10-01`, event_type: "Holiday", audience: "all", description: `School closes for Spring vacation.` },
        { title: `DBE Term 4 Starts (Final Promotional Term)`, event_date: `${year}-10-12`, event_type: "Academic", audience: "all", description: `Final term of ${year} commences.` },
        { title: `Grade 12 NSC Final Examinations Commence`, event_date: `${year}-10-18`, event_type: "Exam", audience: "all", description: `National Senior Certificate (NSC) Grade 12 final examinations.` },
        { title: `Grade 12 NSC Final Examinations Conclude`, event_date: `${year}-11-26`, event_type: "Exam", audience: "all", description: `Completion of Grade 12 NSC examinations.` },
        { title: `DBE Term 4 Ends (Academic Year Closes)`, event_date: `${year}-12-08`, event_type: "Holiday", audience: "all", description: `Official closure of the ${year} academic year.` }
    ];
}

/**
 * Ensures standard South African Public Holidays and DBE Terms exist in the database for a given year.
 */
async function syncSouthAfricanSchoolCalendarForYear(year) {
    try {
        await db.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE`);
        await db.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS is_inter_school BOOLEAN DEFAULT FALSE`);
        await db.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS school_id INT`);

        const publicHolidays = generateSAPublicHolidays(year);
        const dbeTerms = generateDBETermCalendar(year);
        const combined = [...publicHolidays, ...dbeTerms];

        for (const item of combined) {
            const check = await db.query(
                'SELECT id FROM events WHERE event_date = $1 AND title = $2 AND (is_global = TRUE OR school_id IS NULL) LIMIT 1',
                [item.event_date, item.title]
            );
            if (check.rows.length === 0) {
                await db.query(
                    `INSERT INTO events (title, description, event_date, event_type, audience, location, start_time, end_time, is_global, school_id)
                     VALUES ($1, $2, $3, $4, $5, 'Republic of South Africa', '08:00', '16:00', TRUE, NULL)
                     ON CONFLICT DO NOTHING`,
                    [item.title, item.description, item.event_date, item.event_type, item.audience]
                );
            }
        }
    } catch (err) {
        console.warn(`[CALENDAR MULTI-YEAR SYNC] Notice syncing South African calendar for ${year}:`, err.message);
    }
}

/**
 * Synchronizes the current year and adjacent upcoming years on server boot.
 */
async function syncAllActiveYears() {
    const currentYear = new Date().getFullYear();
    const yearsToSync = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
    for (const yr of yearsToSync) {
        await syncSouthAfricanSchoolCalendarForYear(yr);
    }
}

// Initial Sync across years on startup
syncAllActiveYears();

/**
 * Retrieves school and class events for the user's role, enrolled grades, and active school.
 */
exports.getEvents = async (req, res) => {
    const userRole = req.user.role;
    const userId = req.user.id;
    const requestedYear = parseInt(req.query.year || new Date().getFullYear(), 10);

    // Auto-sync calendar for requested year if not yet synced
    if (!isNaN(requestedYear) && requestedYear >= 2020 && requestedYear <= 2040) {
        syncSouthAfricanSchoolCalendarForYear(requestedYear);
    }

    try {
        let query = '';
        let params = [];

        if (userRole === 'learner') {
            const childRes = await db.query('SELECT grade, stream, school_id FROM children WHERE learner_user_id::text = $1::text', [userId]);
            const grade = childRes.rows[0]?.grade || 10;
            const stream = childRes.rows[0]?.stream || 'General';
            const schoolId = childRes.rows[0]?.school_id || req.user.school_id || 1;

            query = `
                SELECT e.*, u.full_name as creator_name, u.surname as creator_surname, 
                       COALESCE(r.name, u.role_id::text, 'admin') as creator_role
                FROM events e
                LEFT JOIN users u ON e.created_by::text = u.id::text
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                WHERE (e.school_id = $3 OR e.is_global = TRUE OR (e.school_id IS NULL AND e.is_inter_school = FALSE))
                  AND (e.audience = 'all' OR e.audience = 'learners' OR e.audience IS NULL)
                  AND (e.grade_target IS NULL OR e.grade_target::text = $1::text)
                  AND (e.stream_target IS NULL OR e.stream_target = $2 OR e.stream_target = 'General')
                ORDER BY e.event_date ASC, e.start_time ASC;
            `;
            params = [grade.toString(), stream, schoolId];
        } else if (userRole === 'parent') {
            const childrenRes = await db.query('SELECT grade, stream, school_id FROM children WHERE parent_id::text = $1::text', [userId]);
            const grades = childrenRes.rows.map(c => c.grade);
            const schoolId = childrenRes.rows[0]?.school_id || req.user.school_id || 1;

            query = `
                SELECT e.*, u.full_name as creator_name, u.surname as creator_surname, 
                       COALESCE(r.name, u.role_id::text, 'admin') as creator_role
                FROM events e
                LEFT JOIN users u ON e.created_by::text = u.id::text
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                WHERE (e.school_id = $2 OR e.is_global = TRUE OR (e.school_id IS NULL AND e.is_inter_school = FALSE))
                  AND (e.audience = 'all' OR e.audience = 'parents' OR e.audience IS NULL)
                  AND (e.grade_target IS NULL OR e.grade_target::text = ANY($1::text[]))
                ORDER BY e.event_date ASC, e.start_time ASC;
            `;
            params = [grades.length > 0 ? grades.map(String) : ['8', '9', '10', '11', '12'], schoolId];
        } else {
            // Teacher / Admin: view general calendar + school-specific events
            const schoolId = req.user.school_id || req.headers['x-school-id'] || req.query.school_id || 1;
            query = `
                SELECT e.*, u.full_name as creator_name, u.surname as creator_surname, 
                       COALESCE(r.name, u.role_id::text, 'admin') as creator_role
                FROM events e
                LEFT JOIN users u ON e.created_by::text = u.id::text
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                WHERE (e.school_id = $1 OR e.is_global = TRUE OR (e.school_id IS NULL AND e.is_inter_school = FALSE))
                ORDER BY e.event_date ASC, e.start_time ASC;
            `;
            params = [schoolId];
        }

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ error: 'Failed to retrieve calendar events: ' + err.message });
    }
};

/**
 * Creates a new calendar event strictly for the creator's school (Admin / Teacher).
 */
exports.createEvent = async (req, res) => {
    const creatorId = req.user.id;
    const userSchoolId = req.user.school_id || req.headers['x-school-id'] || req.query.school_id || 1;
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
        stream_target,
        is_inter_school = false
    } = req.body;

    if (!title || !event_date) {
        return res.status(400).json({ error: 'Event title and date are required.' });
    }

    try {
        const result = await db.query(
            `INSERT INTO events 
             (title, description, event_date, start_time, end_time, location, event_type, audience, grade_target, stream_target, created_by, school_id, is_global, is_inter_school)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, FALSE, $13)
             RETURNING *`,
            [
                title,
                description || '',
                event_date,
                start_time || null,
                end_time || null,
                location || 'School Campus',
                event_type,
                audience,
                grade_target ? parseInt(grade_target, 10) : null,
                stream_target || null,
                creatorId,
                userSchoolId,
                Boolean(is_inter_school)
            ]
        );

        res.json({
            message: 'Event published to your school calendar successfully.',
            event: result.rows[0]
        });
    } catch (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ error: 'Failed to create calendar event: ' + err.message });
    }
};

/**
 * Updates / Edits a calendar event.
 * If the event is school-specific, updates it for this school.
 * If the event is a general/national event, creates a school-specific override so other schools are untouched.
 */
exports.updateEvent = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = (req.user.role || '').toLowerCase();
    const userSchoolId = req.user.school_id || req.headers['x-school-id'] || 1;
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
        stream_target,
        is_inter_school = false
    } = req.body;

    if (!title || !event_date) {
        return res.status(400).json({ error: 'Event title and date are required.' });
    }

    try {
        // 1. Fetch existing event
        const existingRes = await db.query('SELECT * FROM events WHERE id = $1', [id]);
        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        const existing = existingRes.rows[0];

        // 2. Check tenant permissions: If it belongs to another school, block modification
        if (existing.school_id && existing.school_id !== userSchoolId && !req.user.is_superadmin) {
            return res.status(403).json({ error: 'You do not have permission to edit events from another school.' });
        }

        // 3. If it's a general national calendar event (is_global), create a school-specific customized entry
        if (existing.is_global || existing.school_id === null) {
            const overrideRes = await db.query(
                `INSERT INTO events 
                 (title, description, event_date, start_time, end_time, location, event_type, audience, grade_target, stream_target, created_by, school_id, is_global, is_inter_school)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, FALSE, $13)
                 RETURNING *`,
                [
                    title,
                    description || existing.description || '',
                    event_date,
                    start_time || existing.start_time || null,
                    end_time || existing.end_time || null,
                    location || existing.location || 'School Campus',
                    event_type,
                    audience,
                    grade_target ? parseInt(grade_target, 10) : existing.grade_target,
                    stream_target || existing.stream_target,
                    userId,
                    userSchoolId,
                    Boolean(is_inter_school)
                ]
            );

            return res.json({
                message: 'Customized event saved specifically for your school calendar (general calendar remains untouched for other schools).',
                event: overrideRes.rows[0]
            });
        }

        // 4. If it's already this school's custom event, update it directly
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
                is_inter_school = $11,
                updated_at = NOW()
            WHERE id = $12 AND (school_id = $13 OR school_id IS NULL)
        `;
        const params = [
            title,
            description || '',
            event_date,
            start_time || null,
            end_time || null,
            location || 'School Campus',
            event_type,
            audience,
            grade_target ? parseInt(grade_target, 10) : null,
            stream_target || null,
            Boolean(is_inter_school),
            id,
            userSchoolId
        ];

        // If not admin, verify user is creator or educator in this school
        if (userRole !== 'admin' && userRole !== 'teacher') {
            updateQuery += ' AND created_by = $14';
            params.push(userId);
        }

        updateQuery += ' RETURNING *;';

        const result = await db.query(updateQuery, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Event not found or unauthorized to update for your school.' });
        }

        res.json({
            message: 'Event updated successfully for your school calendar.',
            event: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating event:', err);
        res.status(500).json({ error: 'Failed to update calendar event: ' + err.message });
    }
};

/**
 * Force sync/refresh official DBE / DHET calendar events for a specific year (Admin).
 */
exports.syncOfficialCalendar = async (req, res) => {
    const year = parseInt(req.body.year || new Date().getFullYear(), 10);
    try {
        await syncSouthAfricanSchoolCalendarForYear(year);
        res.json({
            message: `Official South African Public Holidays and DBE Calendar for ${year} synchronized successfully.`
        });
    } catch (err) {
        console.error('Error in manual calendar sync:', err);
        res.status(500).json({ error: 'Failed to sync official calendar: ' + err.message });
    }
};

/**
 * Deletes an event by ID.
 * Custom school events are deleted; general national calendar dates are protected.
 */
exports.deleteEvent = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = (req.user.role || '').toLowerCase();
    const userSchoolId = req.user.school_id || req.headers['x-school-id'] || 1;

    try {
        // 1. Fetch event
        const existingRes = await db.query('SELECT * FROM events WHERE id = $1', [id]);
        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        const existing = existingRes.rows[0];

        // 2. Check if it's a general national public holiday or term
        if (existing.is_global) {
            return res.status(400).json({ 
                error: 'National South African public holidays and official DBE term dates cannot be deleted globally, as they apply across all schools.' 
            });
        }

        // 3. Verify it belongs to this school
        if (existing.school_id && existing.school_id !== userSchoolId && !req.user.is_superadmin) {
            return res.status(403).json({ error: 'You do not have permission to delete events from another school.' });
        }

        let deleteQuery = 'DELETE FROM events WHERE id = $1 AND (school_id = $2 OR school_id IS NULL)';
        const params = [id, userSchoolId];

        if (userRole !== 'admin') {
            deleteQuery += ' AND created_by = $3';
            params.push(userId);
        }

        const result = await db.query(deleteQuery, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Event not found or unauthorized to delete.' });
        }

        res.json({ message: 'Event removed from your school calendar successfully.' });
    } catch (err) {
        console.error('Error deleting event:', err);
        res.status(500).json({ error: 'Failed to delete event.' });
    }
};
