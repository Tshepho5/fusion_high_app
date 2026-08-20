const db = require('../../../db/db');

/**
 * Award Positive Merit Badge to a Learner
 */
exports.awardMerit = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { child_id, category, title, description, points = 10, badge_icon = 'award' } = req.body;

    if (!child_id || !category || !title) {
      return res.status(400).json({ error: 'Child ID, merit category, and title are required.' });
    }

    const childRes = await db.query('SELECT full_name, surname, grade, learner_user_id FROM children WHERE id = $1', [child_id]);
    if (childRes.rows.length === 0) {
      return res.status(404).json({ error: 'Learner record not found.' });
    }

    const child = childRes.rows[0];

    const result = await db.query(`
      INSERT INTO merits (child_id, teacher_user_id, category, points, title, description, badge_icon)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [child_id, teacherId, category, points, title, description || '', badge_icon]);

    // Gather Parent IDs linked to this child
    const parentQuery = await db.query(`
      SELECT DISTINCT parent_id FROM (
        SELECT parent_id FROM children WHERE id = $1 AND parent_id IS NOT NULL
        UNION
        SELECT secondary_parent_id FROM children WHERE id = $1 AND secondary_parent_id IS NOT NULL
        UNION
        SELECT parent_id FROM parent_children WHERE child_id = $1
      ) p;
    `, [child_id]);
    const parentIds = parentQuery.rows.map(r => r.parent_id).filter(Boolean);

    const NotificationService = require('../services/notificationService');

    // Notify Parents
    if (parentIds.length > 0) {
      NotificationService.sendToUsers({
        userIds: parentIds,
        title: `🌟 Commendation for ${child.full_name}`,
        message: `An educator awarded a merit badge (+${points} pts) to ${child.full_name} ${child.surname} for "${title}" (${category}).`,
        type: 'merit',
        targetTab: 'children'
      }).catch(e => console.error('Merit notification error (parent):', e));
    }

    // Notify Learner
    if (child.learner_user_id) {
      NotificationService.sendToUsers({
        userIds: [child.learner_user_id],
        title: `🌟 New Merit Awarded (+${points} Pts)`,
        message: `Congratulations! You received a merit badge for "${title}" in ${category}.`,
        type: 'merit',
        targetTab: 'overview'
      }).catch(e => console.error('Merit notification error (learner):', e));
    }

    res.status(201).json({
      success: true,
      message: `Merit awarded to ${child.full_name} ${child.surname} (+${points} Merit Points)!`,
      merit: result.rows[0]
    });
  } catch (err) {
    console.error('Error awarding merit:', err);
    res.status(500).json({ error: 'Failed to award merit: ' + err.message });
  }
};

/**
 * Record Disciplinary Incident / Demerit for a Learner
 */
exports.recordDisciplinaryIncident = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { child_id, category, severity = 'Minor', description, action_taken, detention_date } = req.body;

    if (!child_id || !category || !description) {
      return res.status(400).json({ error: 'Child ID, incident category, and description are required.' });
    }

    const childRes = await db.query('SELECT full_name, surname, grade, learner_user_id FROM children WHERE id = $1', [child_id]);
    if (childRes.rows.length === 0) {
      return res.status(404).json({ error: 'Learner record not found.' });
    }

    const child = childRes.rows[0];
    const detentionStatus = detention_date ? 'scheduled' : 'none';

    const result = await db.query(`
      INSERT INTO disciplinary_records (child_id, teacher_user_id, category, severity, description, action_taken, detention_date, detention_status, parent_notified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
      RETURNING *;
    `, [child_id, teacherId, category, severity, description, action_taken || '', detention_date || null, detentionStatus]);

    // Gather Parent IDs linked to this child
    const parentQuery = await db.query(`
      SELECT DISTINCT parent_id FROM (
        SELECT parent_id FROM children WHERE id = $1 AND parent_id IS NOT NULL
        UNION
        SELECT secondary_parent_id FROM children WHERE id = $1 AND secondary_parent_id IS NOT NULL
        UNION
        SELECT parent_id FROM parent_children WHERE child_id = $1
      ) p;
    `, [child_id]);
    const parentIds = parentQuery.rows.map(r => r.parent_id).filter(Boolean);

    const NotificationService = require('../services/notificationService');

    // Notify Parents
    if (parentIds.length > 0) {
      NotificationService.sendToUsers({
        userIds: parentIds,
        title: `⚠️ Disciplinary Notice: ${child.full_name}`,
        message: `A ${severity} infraction (${category}) was recorded for ${child.full_name} ${child.surname}. Action: ${action_taken || 'Demerit recorded'}.${detention_date ? ` Detention date: ${detention_date}.` : ''}`,
        type: 'disciplinary',
        targetTab: 'children'
      }).catch(e => console.error('Disciplinary notification error (parent):', e));
    }

    // Notify Learner
    if (child.learner_user_id) {
      NotificationService.sendToUsers({
        userIds: [child.learner_user_id],
        title: `⚠️ Disciplinary Notice Logged`,
        message: `An infraction for ${category} (${severity} severity) has been logged on your conduct profile.`,
        type: 'disciplinary',
        targetTab: 'overview'
      }).catch(e => console.error('Disciplinary notification error (learner):', e));
    }

    res.status(201).json({
      success: true,
      message: `Disciplinary incident recorded for ${child.full_name} ${child.surname}. Parent notified.`,
      record: result.rows[0]
    });
  } catch (err) {
    console.error('Error recording disciplinary incident:', err);
    res.status(500).json({ error: 'Failed to record disciplinary incident: ' + err.message });
  }
};

/**
 * Learner: Get own merits and conduct summary
 */
exports.getLearnerConduct = async (req, res) => {
  try {
    const userId = req.user.id;

    const childRes = await db.query('SELECT id, full_name, surname, grade FROM children WHERE learner_user_id = $1', [userId]);
    if (childRes.rows.length === 0) {
      return res.status(404).json({ error: 'Learner profile not found.' });
    }

    const childId = childRes.rows[0].id;

    const meritsRes = await db.query(`
      SELECT m.*, u.full_name AS teacher_name, u.surname AS teacher_surname 
      FROM merits m 
      LEFT JOIN users u ON m.teacher_user_id = u.id 
      WHERE m.child_id = $1 
      ORDER BY m.created_at DESC;
    `, [childId]);

    const incidentsRes = await db.query(`
      SELECT d.*, u.full_name AS teacher_name, u.surname AS teacher_surname 
      FROM disciplinary_records d 
      LEFT JOIN users u ON d.teacher_user_id = u.id 
      WHERE d.child_id = $1 
      ORDER BY d.created_at DESC;
    `, [childId]);

    const totalMeritPoints = meritsRes.rows.reduce((sum, m) => sum + (Number(m.points) || 0), 0);

    res.json({
      success: true,
      total_merit_points: totalMeritPoints,
      merits_count: meritsRes.rows.length,
      incidents_count: incidentsRes.rows.length,
      merits: meritsRes.rows,
      disciplinary_records: incidentsRes.rows
    });
  } catch (err) {
    console.error('Error fetching learner conduct:', err);
    res.status(500).json({ error: 'Failed to retrieve conduct records.' });
  }
};

/**
 * Parent: Get conduct records for a specific child
 */
exports.getChildConductForParent = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { child_id } = req.params;

    const childRes = await db.query(`
      SELECT id, full_name, surname, grade, learner_number 
      FROM children 
      WHERE id = $1 AND (parent_id = $2 OR secondary_parent_id = $2 OR EXISTS (SELECT 1 FROM parent_children WHERE child_id = $1 AND parent_id = $2))
    `, [child_id, parentId]);

    if (childRes.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized child record access.' });
    }

    const child = childRes.rows[0];

    const meritsRes = await db.query(`
      SELECT m.*, u.full_name AS teacher_name, u.surname AS teacher_surname 
      FROM merits m 
      LEFT JOIN users u ON m.teacher_user_id = u.id 
      WHERE m.child_id = $1 
      ORDER BY m.created_at DESC;
    `, [child_id]);

    const incidentsRes = await db.query(`
      SELECT d.*, u.full_name AS teacher_name, u.surname AS teacher_surname 
      FROM disciplinary_records d 
      LEFT JOIN users u ON d.teacher_user_id = u.id 
      WHERE d.child_id = $1 
      ORDER BY d.created_at DESC;
    `, [child_id]);

    const totalMeritPoints = meritsRes.rows.reduce((sum, m) => sum + (Number(m.points) || 0), 0);

    res.json({
      success: true,
      child,
      total_merit_points: totalMeritPoints,
      merits: meritsRes.rows,
      disciplinary_records: incidentsRes.rows
    });
  } catch (err) {
    console.error('Error fetching child conduct for parent:', err);
    res.status(500).json({ error: 'Failed to retrieve conduct records.' });
  }
};

/**
 * Teacher/Admin: Get all conduct logs entered by the teacher or across the school
 */
exports.getTeacherConductLogs = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const meritsRes = await db.query(`
      SELECT m.*, c.full_name AS learner_name, c.surname AS learner_surname, c.grade AS learner_grade, c.learner_number 
      FROM merits m 
      JOIN children c ON m.child_id = c.id 
      WHERE m.teacher_user_id = $1 
      ORDER BY m.created_at DESC LIMIT 50;
    `, [teacherId]);

    const incidentsRes = await db.query(`
      SELECT d.*, c.full_name AS learner_name, c.surname AS learner_surname, c.grade AS learner_grade, c.learner_number 
      FROM disciplinary_records d 
      JOIN children c ON d.child_id = c.id 
      WHERE d.teacher_user_id = $1 
      ORDER BY d.created_at DESC LIMIT 50;
    `, [teacherId]);

    res.json({
      merits: meritsRes.rows,
      incidents: incidentsRes.rows
    });
  } catch (err) {
    console.error('Error fetching teacher conduct logs:', err);
    res.status(500).json({ error: 'Failed to retrieve teacher conduct logs.' });
  }
};

/**
 * Update detention status (Teacher / Admin)
 */
exports.updateDetentionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { detention_status } = req.body;

    const valid = ['none', 'scheduled', 'served', 'missed'];
    if (!valid.includes(detention_status)) {
      return res.status(400).json({ error: 'Invalid detention status.' });
    }

    await db.query(`UPDATE disciplinary_records SET detention_status = $1 WHERE id = $2`, [detention_status, id]);
    res.json({ success: true, message: `Detention status updated to ${detention_status}.` });
  } catch (err) {
    console.error('Error updating detention status:', err);
    res.status(500).json({ error: 'Failed to update detention status.' });
  }
};
