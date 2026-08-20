const db = require('../../../db/db');
const NotificationService = require('../services/notificationService');

/**
 * Get all Extracurricular Activities / Sports Teams
 */
exports.getActivities = async (req, res) => {
  try {
    const { category } = req.query;
    let query = `
      SELECT 
        a.*,
        u.full_name AS coach_name, u.surname AS coach_surname,
        (SELECT COUNT(*) FROM extracurricular_members m WHERE m.activity_id = a.id) AS member_count,
        (SELECT COUNT(*) FROM extracurricular_events e WHERE e.activity_id = a.id AND e.event_date >= CURRENT_DATE) AS upcoming_events_count
      FROM extracurricular_activities a
      LEFT JOIN users u ON a.coach_user_id = u.id
      WHERE a.is_active = TRUE
    `;
    const params = [];
    if (category && category !== 'All') {
      params.push(category);
      query += ` AND a.category = $${params.length}`;
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
      LEFT JOIN users u ON a.coach_user_id = u.id
      WHERE a.id = $1;
    `, [id]);

    if (actRes.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    // Squad members
    const membersRes = await db.query(`
      SELECT m.id, m.role, m.jersey_number, m.joined_at,
             c.id AS child_id, c.full_name AS learner_name, c.surname AS learner_surname, c.grade, c.learner_number
      FROM extracurricular_members m
      JOIN children c ON m.child_id = c.id
      WHERE m.activity_id = $1
      ORDER BY m.role = 'Captain' DESC, m.role = 'Vice-Captain' DESC, c.surname ASC;
    `, [id]);

    // Events / Fixtures
    const eventsRes = await db.query(`
      SELECT * FROM extracurricular_events
      WHERE activity_id = $1
      ORDER BY event_date DESC, start_time DESC;
    `, [id]);

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
    const { name, category = 'Sports', season = 'Annual', venue = 'School Grounds', practice_schedule, description } = req.body;
    const coachId = req.user.id;

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
 * Add / Join Member to Activity
 */
exports.joinActivity = async (req, res) => {
  try {
    const { activity_id, child_id, role = 'Player', jersey_number } = req.body;

    let targetChildId = child_id;
    // If learner is requesting for themselves
    if (req.user.role === 'learner') {
      const chRes = await db.query('SELECT id FROM children WHERE learner_user_id = $1', [req.user.id]);
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
 * Create Match Fixture / Performance Event
 */
exports.createEvent = async (req, res) => {
  try {
    const { activity_id, title, event_type = 'Match', opponent_school, venue = 'Home Ground', event_date, start_time, notes } = req.body;

    if (!activity_id || !title || !event_date || !start_time) {
      return res.status(400).json({ error: 'Activity ID, event title, date, and start time are required.' });
    }

    const result = await db.query(`
      INSERT INTO extracurricular_events (activity_id, title, event_type, opponent_school, venue, event_date, start_time, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [activity_id, title, event_type, opponent_school || '', venue, event_date, start_time, notes || '']);

    // Notify all squad members
    const membersRes = await db.query(`
      SELECT c.learner_user_id, c.parent_id 
      FROM extracurricular_members m
      JOIN children c ON m.child_id = c.id
      WHERE m.activity_id = $1;
    `, [activity_id]);

    const userIds = [];
    membersRes.rows.forEach(m => {
      if (m.learner_user_id) userIds.push(m.learner_user_id);
      if (m.parent_id) userIds.push(m.parent_id);
    });

    if (userIds.length > 0) {
      NotificationService.sendToUsers({
        userIds,
        title: `⚽ New Fixture: ${title}`,
        message: `${event_type} scheduled on ${new Date(event_date).toLocaleDateString()} at ${start_time} (Venue: ${venue})${opponent_school ? ` vs ${opponent_school}` : ''}.`,
        type: 'sports',
        targetTab: 'sports'
      }).catch(e => console.error('Extracurricular event notification error:', e));
    }

    res.status(201).json({
      success: true,
      message: 'Event fixture created and squad notified.',
      event: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating extracurricular event:', err);
    res.status(500).json({ error: 'Failed to create event fixture.' });
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
      SET result_score = $1, notes = COALESCE($2, notes)
      WHERE id = $3
      RETURNING *;
    `, [result_score, notes, id]);

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

    const childRes = await db.query('SELECT id, full_name, surname FROM children WHERE learner_user_id = $1', [userId]);
    if (childRes.rows.length === 0) {
      return res.status(404).json({ error: 'Learner profile not found.' });
    }

    const childId = childRes.rows[0].id;

    const query = `
      SELECT 
        a.id, a.name, a.category, a.season, a.venue, a.practice_schedule, a.description,
        m.role, m.jersey_number, m.joined_at,
        (SELECT COUNT(*) FROM extracurricular_events e WHERE e.activity_id = a.id AND e.event_date >= CURRENT_DATE) AS upcoming_events_count
      FROM extracurricular_members m
      JOIN extracurricular_activities a ON m.activity_id = a.id
      WHERE m.child_id = $1 AND a.is_active = TRUE
      ORDER BY a.name ASC;
    `;

    const { rows } = await db.query(query, [childId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching learner activities:', err);
    res.status(500).json({ error: 'Failed to retrieve activities.' });
  }
};
