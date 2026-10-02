const db = require('../../../db/db');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const { rejectNameDigits } = require('../services/lettersOnly');
const { resolveSchoolId } = require('../services/schoolScope');

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

/**
 * Lists all active system testers (Exclusive to Master Admin).
 */
exports.getTestingUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.surname, 
        u.phone, 
        u.is_tester,
        u.temp_password_note, 
        u.created_at,
        r.name AS role_name,
        r.id AS role_id,
        s.id AS school_id,
        s.name AS school_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE u.is_tester = TRUE
      ORDER BY u.created_at DESC;
    `;
    const result = await db.query(query);
    res.json({
      success: true,
      testers: result.rows
    });
  } catch (err) {
    console.error('Error retrieving testing users:', err.message);
    res.status(500).json({ error: 'Failed to retrieve testing users.' });
  }
};

/**
 * Creates or assigns a user as an official system tester and dispatches credentials email.
 */
exports.createTestingUser = async (req, res) => {
  try {
    const {
      email,
      full_name,
      surname,
      role = 'teacher',
      password,
      phone,
      send_email = true
    } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required for the tester.' });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Tester full name is required.' });
    }
    if (rejectNameDigits(res, full_name, surname)) return;
    const school_id = resolveSchoolId(req);

    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = full_name.trim();
    const cleanSurname = (surname || '').trim() || 'Tester';
    const tempPassword = (password && password.trim().length >= 6)
      ? password.trim()
      : `Test@${Math.floor(1000 + Math.random() * 9000)}`;

    const passHash = await bcrypt.hash(tempPassword, 10);

    // Resolve role ID
    const roleQuery = await db.query('SELECT id, name FROM roles WHERE LOWER(name) = LOWER($1)', [role]);
    const roleId = roleQuery.rows.length > 0 ? roleQuery.rows[0].id : 2;
    const resolvedRoleName = roleQuery.rows.length > 0 ? roleQuery.rows[0].name : role;

    // Check if user already exists
    const existing = await db.query('SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    let testerId;

    if (existing.rows.length > 0) {
      testerId = existing.rows[0].id;
      await db.query(`
        UPDATE users
        SET role_id = $1,
            school_id = $2,
            password_hash = $3,
            is_tester = TRUE,
            temp_password_note = $4,
            full_name = $5,
            surname = $6,
            phone = COALESCE($7, phone)
        WHERE id = $8;
      `, [roleId, school_id, passHash, tempPassword, cleanFirstName, cleanSurname, phone || null, testerId]);
    } else {
      const insertRes = await db.query(`
        INSERT INTO users (
          email, password_hash, role_id, school_id, is_superadmin,
          full_name, surname, phone, is_tester, temp_password_note, country
        )
        VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7, TRUE, $8, 'South Africa')
        RETURNING id;
      `, [cleanEmail, passHash, roleId, school_id, cleanFirstName, cleanSurname, phone || null, tempPassword]);
      testerId = insertRes.rows[0].id;
    }

    // Role-specific complementary setup
    if (resolvedRoleName === 'teacher') {
      await db.query(`
        INSERT INTO employees (user_id, full_name, surname, department_id, school_id, phone, email)
        VALUES ($1, $2, $3, 1, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          surname = EXCLUDED.surname,
          school_id = EXCLUDED.school_id;
      `, [testerId, cleanFirstName, cleanSurname, school_id, phone || '071 000 0000', cleanEmail]);
    }

    // Fetch school name for email
    const schoolRes = await db.query('SELECT name FROM schools WHERE id = $1', [school_id]);
    const targetSchoolName = schoolRes.rows.length > 0 ? schoolRes.rows[0].name : 'Geleza SA Partner School';

    // Dispatch credentials invitation email if requested
    if (send_email) {
      emailService.sendTesterInvitationEmail({
        testerEmail: cleanEmail,
        testerName: `${cleanFirstName} ${cleanSurname}`,
        roleName: resolvedRoleName,
        temporaryPassword: tempPassword,
        schoolName: targetSchoolName,
        loginUrl: `${req.protocol}://${req.get('host')}/login`,
        invitedByName: 'Dr. T. Makola (Geleza SA Executive)'
      }).catch(err => {
        console.warn('[EMAIL NOTICE] Could not send tester email:', err.message);
      });
    }

    res.status(201).json({
      success: true,
      message: `Testing user "${cleanFirstName} ${cleanSurname}" created and assigned role "${resolvedRoleName}". An invitation email with login credentials has been dispatched.`,
      tester: {
        id: testerId,
        email: cleanEmail,
        full_name: cleanFirstName,
        surname: cleanSurname,
        role_name: resolvedRoleName,
        school_id,
        school_name: targetSchoolName,
        temp_password: tempPassword,
        created_at: new Date()
      }
    });
  } catch (err) {
    console.error('Error creating testing user:', err.message);
    res.status(500).json({ error: 'Failed to create testing user. Please verify input and try again.' });
  }
};

/**
 * Updates role assignment of an existing tester.
 */
exports.updateTesterRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'New role parameter is required.' });
    }

    const roleQuery = await db.query('SELECT id, name FROM roles WHERE LOWER(name) = LOWER($1)', [role]);
    if (roleQuery.rows.length === 0) {
      return res.status(400).json({ error: `Invalid role "${role}".` });
    }

    const roleId = roleQuery.rows[0].id;
    const roleName = roleQuery.rows[0].name;

    const updateRes = await db.query(`
      UPDATE users
      SET role_id = $1
      WHERE id = $2 AND is_tester = TRUE
      RETURNING id, email, full_name, surname, role_id;
    `, [roleId, id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tester account not found.' });
    }

    res.json({
      success: true,
      message: `Tester role successfully updated to "${roleName}".`,
      user: { ...updateRes.rows[0], role_name: roleName }
    });
  } catch (err) {
    console.error('Error updating tester role:', err.message);
    res.status(500).json({ error: 'Failed to update tester role.' });
  }
};

/**
 * Resends temporary credentials to a tester.
 */
exports.resendTesterCredentials = async (req, res) => {
  try {
    const { id } = req.params;

    const userRes = await db.query(`
      SELECT u.id, u.email, u.full_name, u.surname, u.temp_password_note, r.name as role_name, s.name as school_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE u.id = $1 AND u.is_tester = TRUE;
    `, [id]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tester account not found.' });
    }

    const tester = userRes.rows[0];
    const tempPassword = tester.temp_password_note || `Test@${Math.floor(1000 + Math.random() * 9000)}`;
    const passHash = await bcrypt.hash(tempPassword, 10);

    await db.query('UPDATE users SET password_hash = $1, temp_password_note = $2 WHERE id = $3', [passHash, tempPassword, id]);

    await emailService.sendTesterInvitationEmail({
      testerEmail: tester.email,
      testerName: `${tester.full_name} ${tester.surname}`,
      roleName: tester.role_name,
      temporaryPassword: tempPassword,
      schoolName: tester.school_name || 'Geleza SA',
      loginUrl: `${req.protocol}://${req.get('host')}/login`,
      invitedByName: 'Dr. T. Makola (Geleza SA Executive)'
    });

    res.json({
      success: true,
      message: `Credentials re-dispatched to ${tester.email}. Temporary password: ${tempPassword}`
    });
  } catch (err) {
    console.error('Error resending tester credentials:', err.message);
    res.status(500).json({ error: 'Failed to resend credentials.' });
  }
};

/**
 * Revokes testing access or deletes tester account.
 */
exports.deleteTestingUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      UPDATE users
      SET is_tester = FALSE
      WHERE id = $1
      RETURNING id, email, full_name, surname;
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tester account not found.' });
    }

    res.json({
      success: true,
      message: `Testing privileges revoked for ${result.rows[0].email}.`
    });
  } catch (err) {
    console.error('Error deleting testing user:', err.message);
    res.status(500).json({ error: 'Failed to revoke testing user access.' });
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

