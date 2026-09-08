const db = require('../../../db/db');
const NotificationService = require('../services/notificationService');

/**
 * Get all Extracurricular Activities / Sports Teams
 */
exports.getActivities = async (req, res) => {
  try {
    const { category } = req.query;
    const userId = req.user ? req.user.id : null;
    let query = `
      SELECT 
        a.*,
        u.full_name AS coach_name, u.surname AS coach_surname, u.email AS coach_email,
        CASE WHEN $1::text IS NOT NULL AND a.coach_user_id::text = $1::text THEN TRUE ELSE FALSE END AS is_my_coached_sport,
        (SELECT COUNT(*) FROM extracurricular_members m WHERE m.activity_id::text = a.id::text) AS member_count,
        (SELECT COUNT(*) FROM extracurricular_events e WHERE e.activity_id::text = a.id::text AND e.event_date >= CURRENT_DATE) AS upcoming_events_count
      FROM extracurricular_activities a
      LEFT JOIN users u ON a.coach_user_id::text = u.id::text
      WHERE a.is_active = TRUE
    `;
    const params = [userId ? String(userId) : null];
    if (category && category !== 'All' && category !== 'all') {
      params.push(`%${category}%`);
      query += ` AND (a.category ILIKE $${params.length} OR a.category = $${params.length})`;
    }
    query += ` ORDER BY a.name ASC;`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: 'Failed to retrieve sports & extracurricular activities.' });
  }
};

/**
 * Get Activity Details: Squad Roster and Event Fixtures
 */
exports.getActivityDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const actRes = await db.query(`
      SELECT a.*, u.full_name AS coach_name, u.surname AS coach_surname, u.email AS coach_email
      FROM extracurricular_activities a
      LEFT JOIN users u ON a.coach_user_id::text = u.id::text
      WHERE a.id::text = $1::text;
    `, [String(id)]);

    if (actRes.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    // Squad members
    const membersRes = await db.query(`
      SELECT m.id, m.role, m.jersey_number, m.joined_at,
             c.id AS child_id, c.full_name AS learner_name, c.surname AS learner_surname, c.grade, c.learner_number
      FROM extracurricular_members m
      JOIN children c ON m.child_id::text = c.id::text
      WHERE m.activity_id::text = $1::text
      ORDER BY m.role = 'Captain' DESC, m.role = 'Vice-Captain' DESC, c.surname ASC;
    `, [String(id)]);

    // Events / Fixtures
    const eventsRes = await db.query(`
      SELECT * FROM extracurricular_events
      WHERE activity_id::text = $1::text
      ORDER BY event_date DESC, start_time DESC;
    `, [String(id)]);

    res.json({
      activity: actRes.rows[0],
      members: membersRes.rows,
      events: eventsRes.rows
    });
  } catch (err) {
    console.error('Error fetching activity details:', err);
    res.status(500).json({ error: 'Failed to retrieve activity details.' });
  }
};

/**
 * Create New Club or Sport (Admin / Teacher)
 */
exports.createActivity = async (req, res) => {
  try {
    const { name, category = 'Sports', season = 'Annual', venue = 'School Grounds', practice_schedule, description, coach_user_id } = req.body;
    const coachId = coach_user_id || req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Activity name is required.' });
    }

    const result = await db.query(`
      INSERT INTO extracurricular_activities (name, category, coach_user_id, season, venue, practice_schedule, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [name, category, coachId, season, venue, practice_schedule, description || '']);

    res.status(201).json({
      success: true,
      message: `${name} squad created successfully.`,
      activity: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({ error: 'Failed to create activity: ' + err.message });
  }
};

/**
 * Assign / Volunteer as Coach for an Activity (Teacher / Admin)
 */
exports.assignCoach = async (req, res) => {
  try {
    const { id } = req.params;
    const { coach_user_id } = req.body;

    let targetCoachId = coach_user_id;
    if (coach_user_id === undefined && (req.user.role === 'teacher' || req.user.role_id === 4)) {
      targetCoachId = req.user.id;
    }

    const result = await db.query(`
      UPDATE extracurricular_activities
      SET coach_user_id = $1
      WHERE id::text = $2::text
      RETURNING *;
    `, [targetCoachId || null, String(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    res.json({
      success: true,
      message: targetCoachId ? 'Coach assigned successfully.' : 'Coach role unassigned.',
      activity: result.rows[0]
    });
  } catch (err) {
    console.error('Error assigning coach:', err);
    res.status(500).json({ error: 'Failed to assign coach: ' + err.message });
  }
};

/**
 * List Available Teachers to Assign as Coaches
 */
exports.getAvailableCoaches = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.full_name, u.surname, u.email
      FROM users u
      LEFT JOIN roles r ON (u.role_id = r.id OR u.role_id::text = r.name)
      WHERE LOWER(r.name) = 'teacher' OR u.role_id = 4
      ORDER BY u.surname ASC, u.full_name ASC;
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching coaches:', err);
    res.status(500).json({ error: 'Failed to fetch available coaches.' });
  }
};

/**
 * Add / Join Member to Activity
 */
exports.joinActivity = async (req, res) => {
  try {
    const { activity_id, child_id, role = 'Player', jersey_number } = req.body;

    let targetChildId = child_id;
    if (req.user.role === 'learner') {
      const chRes = await db.query('SELECT id FROM children WHERE learner_user_id::text = $1::text OR id::text = $1::text LIMIT 1', [String(req.user.id)]);
      if (chRes.rows.length === 0) return res.status(404).json({ error: 'Learner profile not found.' });
      targetChildId = chRes.rows[0].id;
    }

    if (!activity_id || !targetChildId) {
      return res.status(400).json({ error: 'Activity ID and Child ID are required.' });
    }

    const result = await db.query(`
      INSERT INTO extracurricular_members (activity_id, child_id, role, jersey_number)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (activity_id, child_id) DO UPDATE SET role = EXCLUDED.role, jersey_number = EXCLUDED.jersey_number
      RETURNING *;
    `, [activity_id, targetChildId, role, jersey_number || null]);

    res.status(201).json({
      success: true,
      message: 'Learner joined activity squad successfully.',
      member: result.rows[0]
    });
  } catch (err) {
    console.error('Error joining activity:', err);
    res.status(500).json({ error: 'Failed to join activity: ' + err.message });
  }
};

/**
 * Create Match Fixture / Performance Event (Saved as Draft for Coach confirmation)
 */
exports.createEvent = async (req, res) => {
  try {
    const { activity_id, title, event_type = 'Match', opponent_school, venue = 'Home Ground', event_date, start_time, notes, bus_transport_info, required_kit } = req.body;

    if (!activity_id || !title || !event_date || !start_time) {
      return res.status(400).json({ error: 'Activity ID, event title, date, and start time are required.' });
    }

    const coachId = req.user.id;

    const result = await db.query(`
      INSERT INTO extracurricular_events (activity_id, title, event_type, opponent_school, venue, event_date, start_time, notes, bus_transport_info, required_kit, status, is_confirmed, created_by_coach_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Draft', FALSE, $11)
      RETURNING *;
    `, [activity_id, title, event_type, opponent_school || '', venue, event_date, start_time, notes || '', bus_transport_info || '', required_kit || '', coachId]);

    res.status(201).json({
      success: true,
      message: 'Event fixture arranged and saved as Draft. You can now review and confirm the schedule.',
      event: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating extracurricular event:', err);
    res.status(500).json({ error: 'Failed to create event fixture: ' + err.message });
  }
};

/**
 * Confirm Event Schedule (Sports Coach)
 */
exports.confirmEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      UPDATE extracurricular_events
      SET status = 'Confirmed', is_confirmed = TRUE
      WHERE id::text = $1::text
      RETURNING *;
    `, [String(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event fixture not found.' });
    }

    res.json({
      success: true,
      message: 'Event schedule confirmed successfully. You can now publish to school notifications.',
      event: result.rows[0]
    });
  } catch (err) {
    console.error('Error confirming event:', err);
    res.status(500).json({ error: 'Failed to confirm event schedule.' });
  }
};

/**
 * Publish Event to School & Parent Notifications
 */
exports.publishEventNotifications = async (req, res) => {
  try {
    const { id } = req.params;

    const evRes = await db.query(`
      SELECT e.*, a.name AS activity_name, a.category AS activity_category
      FROM extracurricular_events e
      JOIN extracurricular_activities a ON e.activity_id::text = a.id::text
      WHERE e.id::text = $1::text;
    `, [String(id)]);

    if (evRes.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const event = evRes.rows[0];

    // Mark event as published & confirmed
    const updatedRes = await db.query(`
      UPDATE extracurricular_events
      SET status = 'Published', is_published = TRUE, published_at = NOW(), is_confirmed = TRUE
      WHERE id::text = $1::text
      RETURNING *;
    `, [String(id)]);

    // Fetch parents and squad members
    const membersRes = await db.query(`
      SELECT c.learner_user_id, c.parent_id, c.secondary_parent_id,
             c.full_name AS learner_name, c.surname AS learner_surname
      FROM extracurricular_members m
      JOIN children c ON m.child_id::text = c.id::text
      WHERE m.activity_id::text = $1::text;
    `, [String(event.activity_id)]);

    const parentUserIds = new Set();
    const squadLearnerIds = new Set();

    membersRes.rows.forEach(m => {
      if (m.parent_id) parentUserIds.add(m.parent_id);
      if (m.secondary_parent_id) parentUserIds.add(m.secondary_parent_id);
      if (m.learner_user_id) squadLearnerIds.add(m.learner_user_id);
    });

    const formattedDate = new Date(event.event_date).toLocaleDateString('en-ZA', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });

    // 1. Notify Parents of Squad Members
    if (parentUserIds.size > 0) {
      await NotificationService.sendToUsers({
        userIds: Array.from(parentUserIds),
        title: `🏆 Sports Fixture Notice: ${event.activity_name}`,
        message: `Your child has an official ${event.event_type} (${event.title}) scheduled for ${formattedDate} at ${event.start_time}. Venue: ${event.venue}${event.opponent_school ? ` vs ${event.opponent_school}` : ''}. ${event.bus_transport_info ? `Transport: ${event.bus_transport_info}.` : ''} Please ensure sport kit is prepared.`,
        type: 'sports',
        targetTab: 'sports',
        authorId: req.user.id,
        sendEmail: true
      }).catch(e => console.error('Parent sports notification error:', e));
    }

    // 2. Broadcast to School Community (Teachers & Learners)
    await NotificationService.sendBroadcast({
      targetRole: 'all',
      title: `📣 School Sports Notice: ${event.activity_name} vs ${event.opponent_school || 'Opponents'}`,
      message: `${event.event_type} - ${event.title} is confirmed for ${formattedDate} at ${event.start_time} (Venue: ${event.venue}). Come out and support Fusion High!`,
      fullContent: `Official sports fixture scheduled by coach.\nEvent: ${event.title}\nActivity: ${event.activity_name}\nDate: ${formattedDate} at ${event.start_time}\nVenue: ${event.venue}\nOpponent: ${event.opponent_school || 'Open Tournament'}\nNotes: ${event.notes || 'No additional notes'}`,
      type: 'sports',
      targetTab: 'sports',
      authorId: req.user.id,
      sendToMessages: true,
      sendEmail: false
    }).catch(e => console.error('Broadcast sports notification error:', e));

    res.json({
      success: true,
      message: 'Event fixture schedule confirmed and published to school & parents notifications.',
      event: updatedRes.rows[0],
      notified_parents_count: parentUserIds.size,
      notified_squad_count: squadLearnerIds.size
    });
  } catch (err) {
    console.error('Error publishing event notifications:', err);
    res.status(500).json({ error: 'Failed to publish notifications: ' + err.message });
  }
};

/**
 * Add Sports Event Directly to School Calendar
 */
exports.addEventToCalendar = async (req, res) => {
  try {
    const { id } = req.params;

    const evRes = await db.query(`
      SELECT e.*, a.name AS activity_name, a.category AS activity_category
      FROM extracurricular_events e
      JOIN extracurricular_activities a ON e.activity_id::text = a.id::text
      WHERE e.id::text = $1::text;
    `, [String(id)]);

    if (evRes.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const event = evRes.rows[0];
    const userSchoolId = req.user.school_id || 1;

    // If already on calendar, return existing record
    if (event.added_to_calendar && event.calendar_event_id) {
      return res.json({
        success: true,
        message: 'This fixture is already added to the school calendar.',
        event
      });
    }

    // Insert into events table
    const calTitle = `${event.activity_name}: ${event.title}${event.opponent_school ? ` vs ${event.opponent_school}` : ''}`;
    const calDesc = `${event.event_type} fixture organized for ${event.activity_name}. Venue: ${event.venue}. ${event.notes || ''}`.trim();

    const calRes = await db.query(`
      INSERT INTO events 
        (title, description, event_date, start_time, location, event_type, audience, created_by, school_id, is_global, is_inter_school)
      VALUES ($1, $2, $3, $4, $5, 'Sports', 'all', $6, $7, FALSE, $8)
      RETURNING *;
    `, [
      calTitle,
      calDesc,
      event.event_date,
      event.start_time || '15:30',
      event.venue || 'School Sports Ground',
      req.user.id,
      userSchoolId,
      Boolean(event.opponent_school)
    ]);

    const calEvent = calRes.rows[0];

    // Update extracurricular_events
    const updatedEv = await db.query(`
      UPDATE extracurricular_events
      SET added_to_calendar = TRUE, calendar_event_id = $1
      WHERE id::text = $2::text
      RETURNING *;
    `, [calEvent.id, String(id)]);

    res.json({
      success: true,
      message: 'Event added to School Calendar under Sports category successfully.',
      event: updatedEv.rows[0],
      calendar_event: calEvent
    });
  } catch (err) {
    console.error('Error adding event to calendar:', err);
    res.status(500).json({ error: 'Failed to add event to school calendar: ' + err.message });
  }
};

/**
 * Record Event Score / Result
 */
exports.updateEventScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { result_score, notes } = req.body;

    const result = await db.query(`
      UPDATE extracurricular_events 
      SET result_score = $1, notes = COALESCE($2, notes), status = 'Completed'
      WHERE id::text = $3::text
      RETURNING *;
    `, [result_score, notes, String(id)]);

    res.json({
      success: true,
      message: 'Match result score recorded successfully.',
      event: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating event score:', err);
    res.status(500).json({ error: 'Failed to record event score.' });
  }
};

/**
 * Learner: Get activities joined by the logged-in learner
 */
exports.getLearnerActivities = async (req, res) => {
  try {
    const userId = req.user.id;

    const childRes = await db.query('SELECT id, full_name, surname FROM children WHERE learner_user_id::text = $1::text OR id::text = $1::text LIMIT 1', [String(userId)]);
    if (childRes.rows.length === 0) {
      return res.status(404).json({ error: 'Learner profile not found.' });
    }

    const childId = childRes.rows[0].id;

    const query = `
      SELECT 
        a.id, a.name, a.category, a.season, a.venue, a.practice_schedule, a.description,
        m.role, m.jersey_number, m.joined_at,
        (SELECT COUNT(*) FROM extracurricular_events e WHERE e.activity_id::text = a.id::text AND e.event_date >= CURRENT_DATE) AS upcoming_events_count
      FROM extracurricular_members m
      JOIN extracurricular_activities a ON m.activity_id::text = a.id::text
      WHERE m.child_id::text = $1::text AND a.is_active = TRUE
      ORDER BY a.name ASC;
    `;

    const { rows } = await db.query(query, [String(childId)]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching learner activities:', err);
    res.status(500).json({ error: 'Failed to retrieve activities.' });
  }
};
