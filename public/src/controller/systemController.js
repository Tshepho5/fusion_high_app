const db = require('../../../db/db');
const testerProvisioning = require('../services/testerProvisioning');

let portalSchemaReady = false;

function formatIntakeWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
}

function describePortalControl(row) {
  const opens = row.opens_at ? new Date(row.opens_at) : null;
  const closes = row.closes_at ? new Date(row.closes_at) : null;
  const now = new Date();
  let closure = 'open';
  if (row.is_locked) closure = 'switch';
  else if (opens && !Number.isNaN(opens.getTime()) && now < opens) closure = 'before_window';
  else if (closes && !Number.isNaN(closes.getTime()) && now > closes) closure = 'after_window';

  let publicReason = '';
  if (closure === 'switch') publicReason = row.locked_reason || 'This intake is closed.';
  if (closure === 'before_window') publicReason = `This intake opens on ${formatIntakeWhen(opens)}.`;
  if (closure === 'after_window') publicReason = `This intake closed on ${formatIntakeWhen(closes)}.`;

  return {
    ...row,
    switch_locked: Boolean(row.is_locked),
    effectively_closed: closure !== 'open',
    closure,
    public_reason: publicReason
  };
}

async function ensurePortalControls() {
  if (portalSchemaReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS system_portal_controls (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description TEXT,
      is_locked BOOLEAN NOT NULL DEFAULT FALSE,
      locked_reason TEXT DEFAULT 'Locked by Geleza SA Executive Board',
      unlocked_at TIMESTAMP,
      locked_at TIMESTAMP,
      updated_by_email VARCHAR(255),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.query(`ALTER TABLE system_portal_controls ADD COLUMN IF NOT EXISTS opens_at TIMESTAMP`);
  await db.query(`ALTER TABLE system_portal_controls ADD COLUMN IF NOT EXISTS closes_at TIMESTAMP`);
  await db.query(`
    INSERT INTO system_portal_controls (id, name, description, is_locked, locked_reason)
    VALUES
      ('school_registration', 'Principal school registration', 'The period when a principal may submit a school into Geleza SA.', FALSE, 'School registration is closed.'),
      ('parent_application', 'New family applications', 'Scenario 1: a parent and learner who are both new to the school.', FALSE, 'New family applications are closed.'),
      ('sibling_enrollment', 'Sibling enrollment', 'Scenario 2: a parent already on the system enrolls a learner who is not yet enrolled.', FALSE, 'Sibling enrollment is closed.'),
      ('parent_registration', 'Parent registration', 'Scenario 3: a new parent registers and links a learner who is already enrolled.', FALSE, 'Parent registration is closed.'),
      ('learner_registration', 'Learner registration', 'A learner creates their own portal account.', FALSE, 'Learner registration is closed.'),
      ('teacher_registration', 'Teacher registration', 'An invited educator submits an application and finishes registration.', FALSE, 'Teacher registration is closed.'),
      ('user_registration', 'General user registration', 'Older combined gate. A closed switch also closes parent, learner, and teacher registration.', FALSE, 'Registration is closed.')
    ON CONFLICT (id) DO NOTHING;
  `);
  portalSchemaReady = true;
}

/**
 * Returns all portal access locks (Public endpoint so UI knows whether registration is locked/unlocked).
 */
exports.getPortalLocks = async (req, res) => {
  try {
    await ensurePortalControls();
    const result = await db.query(`
      SELECT id, name, description, is_locked, locked_reason, opens_at, closes_at, unlocked_at, locked_at, updated_by_email, updated_at
      FROM system_portal_controls
      ORDER BY id ASC;
    `);

    const controls = {};
    result.rows.forEach(row => {
      controls[row.id] = describePortalControl(row);
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
 * Toggles or updates a portal lock (Exclusive to Master Admin 202247878@myturf.ul.ac.za).
 */
exports.updatePortalLock = async (req, res) => {
  const { id } = req.params;
  const { is_locked, locked_reason, opens_at, closes_at } = req.body;

  try {
    await ensurePortalControls();
    const current = await db.query('SELECT * FROM system_portal_controls WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: `Portal control "${id}" not found.` });
    }
    const existing = current.rows[0];
    const lockedBool = is_locked === undefined ? Boolean(existing.is_locked) : Boolean(is_locked);
    const nextReason = locked_reason === undefined ? existing.locked_reason : locked_reason;
    const nextOpens = opens_at === undefined ? existing.opens_at : (opens_at ? new Date(opens_at) : null);
    const nextCloses = closes_at === undefined ? existing.closes_at : (closes_at ? new Date(closes_at) : null);
    if (nextOpens && Number.isNaN(new Date(nextOpens).getTime())) {
      return res.status(400).json({ error: 'The opening date is not valid.' });
    }
    if (nextCloses && Number.isNaN(new Date(nextCloses).getTime())) {
      return res.status(400).json({ error: 'The closing date is not valid.' });
    }
    if (nextOpens && nextCloses && new Date(nextOpens) > new Date(nextCloses)) {
      return res.status(400).json({ error: 'The opening time must be before the closing time.' });
    }
    const userEmail = req.user?.email || '';

    const result = await db.query(`
      UPDATE system_portal_controls
      SET is_locked = $1,
          locked_reason = COALESCE($2, locked_reason),
          opens_at = $3,
          closes_at = $4,
          locked_at = CASE WHEN $1 = TRUE THEN CURRENT_TIMESTAMP ELSE locked_at END,
          unlocked_at = CASE WHEN $1 = FALSE THEN CURRENT_TIMESTAMP ELSE unlocked_at END,
          updated_by_email = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *;
    `, [lockedBool, nextReason, nextOpens, nextCloses, userEmail, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Portal control "${id}" not found.` });
    }

    const described = describePortalControl(result.rows[0]);
    res.json({
      success: true,
      message: described.effectively_closed
        ? `${described.name} is closed.`
        : `${described.name} is open.`,
      control: described
    });
  } catch (err) {
    console.error('Error updating portal lock:', err.message);
    res.status(500).json({ error: 'Failed to update portal access control lock.' });
  }
};

function sendTesterResult(res, status, payload) {
  res.status(status).json({ success: true, ...payload });
}

function sendTesterError(res, err, fallback) {
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status >= 500) console.error(fallback, err.message);
  res.status(status).json({ error: status >= 500 ? fallback : err.message });
}

/**
 * Lists tester invitations and live programme counts (Exclusive to Master Admin).
 */
exports.getTestingUsers = async (req, res) => {
  try {
    const programme = await testerProvisioning.listProgramme();
    sendTesterResult(res, 200, programme);
  } catch (err) {
    sendTesterError(res, err, 'Failed to retrieve testing users.');
  }
};

exports.getTesterProgramme = exports.getTestingUsers;

/**
 * Saves a parent, teacher, or learner invitation in the test school.
 * Email is sent only when send_email is true, and only marked sent after the provider accepts it.
 */
exports.createTestingUser = async (req, res) => {
  try {
    const result = await testerProvisioning.createInvitation(req.body || {}, req);
    sendTesterResult(res, 201, result);
  } catch (err) {
    sendTesterError(res, err, 'Failed to create the tester invitation.');
  }
};

exports.updateTesterRole = async (req, res) => {
  try {
    const result = await testerProvisioning.updateInvitationRole(req.params.id, req.body && req.body.role);
    sendTesterResult(res, 200, result);
  } catch (err) {
    sendTesterError(res, err, 'Failed to update tester role.');
  }
};

exports.resendTesterCredentials = async (req, res) => {
  try {
    const result = await testerProvisioning.resendInvitation(req.params.id, req);
    sendTesterResult(res, 200, result);
  } catch (err) {
    sendTesterError(res, err, 'Failed to resend the tester invitation.');
  }
};

exports.deleteTestingUser = async (req, res) => {
  try {
    const result = await testerProvisioning.revokeInvitation(req.params.id);
    sendTesterResult(res, 200, result);
  } catch (err) {
    sendTesterError(res, err, 'Failed to revoke testing user access.');
  }
};

exports.deleteLegacyTester = async (req, res) => {
  try {
    const result = await testerProvisioning.revokeLegacyTester(req.params.id);
    sendTesterResult(res, 200, result);
  } catch (err) {
    sendTesterError(res, err, 'Failed to revoke testing user access.');
  }
};

exports.verifyTesterInvite = async (req, res) => {
  try {
    const result = await testerProvisioning.verifyInvitation(req.query.token);
    res.json(result);
  } catch (err) {
    sendTesterError(res, err, 'The invitation could not be checked.');
  }
};

exports.acceptTesterInvite = async (req, res) => {
  try {
    const body = req.body || {};
    const result = await testerProvisioning.acceptInvitation({
      token: body.token,
      password: body.password,
      confirm: body.confirm_password || body.confirm
    });
    res.json(result);
  } catch (err) {
    sendTesterError(res, err, 'The tester account could not be activated.');
  }
};

exports.createTesterReport = async (req, res) => {
  try {
    const result = await testerProvisioning.createReport(req.user && req.user.id, req.body || {});
    sendTesterResult(res, 201, result);
  } catch (err) {
    sendTesterError(res, err, 'The testing report could not be saved.');
  }
};

exports.listMyTesterReports = async (req, res) => {
  try {
    const reports = await testerProvisioning.listOwnReports(req.user && req.user.id);
    sendTesterResult(res, 200, { reports });
  } catch (err) {
    sendTesterError(res, err, 'Testing reports could not be loaded.');
  }
};

exports.listTesterReports = async (req, res) => {
  try {
    const reports = await testerProvisioning.listReports(req.query || {});
    sendTesterResult(res, 200, { reports });
  } catch (err) {
    sendTesterError(res, err, 'Testing reports could not be loaded.');
  }
};

exports.updateTesterReport = async (req, res) => {
  try {
    const report = await testerProvisioning.updateReport(req.params.id, req.body || {}, req.user && req.user.id);
    sendTesterResult(res, 200, { report, message: `Report ${report.reference_code} is now ${report.status}.` });
  } catch (err) {
    sendTesterError(res, err, 'The testing report could not be updated.');
  }
};

/**
 * Helper to check lock state from other controllers
 */
exports.isControlLocked = async (controlId) => {
  try {
    await ensurePortalControls();
    const res = await db.query(
      'SELECT id, name, is_locked, locked_reason, opens_at, closes_at FROM system_portal_controls WHERE id = $1',
      [controlId]
    );
    if (res.rows.length > 0) {
      const described = describePortalControl(res.rows[0]);
      return {
        is_locked: described.effectively_closed,
        locked_reason: described.public_reason,
        closure: described.closure,
        opens_at: described.opens_at,
        closes_at: described.closes_at
      };
    }
  } catch (err) {
    console.warn(`Could not check lock state for ${controlId}:`, err.message);
  }
  return { is_locked: false, locked_reason: '' };
};

