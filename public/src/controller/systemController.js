const db = require('../../../db/db');

/**
 * Returns all portal access locks (Public endpoint so UI knows whether registration is locked/unlocked).
 */
exports.getPortalLocks = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, description, is_locked, locked_reason, unlocked_at, locked_at, updated_by_email, updated_at
      FROM system_portal_controls
      ORDER BY id ASC;
    `);

    const controls = {};
    result.rows.forEach(row => {
      controls[row.id] = row;
    });

    res.json({
      success: true,
      controls
    });
  } catch (err) {
    console.error('Error fetching portal locks:', err.message);
    // Return safe fallback where login is ALWAYS open, and registration state defaults to unlocked
    res.json({
      success: true,
      controls: {
        school_registration: { is_locked: false, locked_reason: 'Locked by Geleza SA Executives' },
        user_registration: { is_locked: false, locked_reason: 'Registration is currently closed' },
        parent_application: { is_locked: false, locked_reason: 'Parent applications are closed' }
      }
    });
  }
};

/**
 * Toggles or updates a portal lock (Geleza SA Executives / Admins only).
 */
exports.updatePortalLock = async (req, res) => {
  const { id } = req.params;
  const { is_locked, locked_reason } = req.body;

  try {
    const lockedBool = Boolean(is_locked);
    const userEmail = req.user?.email || 'executive@gelezasa.co.za';

    const result = await db.query(`
      UPDATE system_portal_controls
      SET is_locked = $1,
          locked_reason = COALESCE($2, locked_reason),
          locked_at = CASE WHEN $1 = TRUE THEN CURRENT_TIMESTAMP ELSE locked_at END,
          unlocked_at = CASE WHEN $1 = FALSE THEN CURRENT_TIMESTAMP ELSE unlocked_at END,
          updated_by_email = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `, [lockedBool, locked_reason, userEmail, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Portal control "${id}" not found.` });
    }

    res.json({
      success: true,
      message: `Portal control "${result.rows[0].name}" has been ${lockedBool ? 'LOCKED' : 'UNLOCKED'}.`,
      control: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating portal lock:', err.message);
    res.status(500).json({ error: 'Failed to update portal access control lock.' });
  }
};

/**
 * Helper to check lock state from other controllers
 */
exports.isControlLocked = async (controlId) => {
  try {
    const res = await db.query('SELECT is_locked, locked_reason FROM system_portal_controls WHERE id = $1', [controlId]);
    if (res.rows.length > 0) {
      return res.rows[0];
    }
  } catch (err) {
    console.warn(`Could not check lock state for ${controlId}:`, err.message);
  }
  return { is_locked: false, locked_reason: '' };
};
