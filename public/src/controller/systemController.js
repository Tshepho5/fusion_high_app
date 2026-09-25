const db = require('../../../db/db');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');

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
 * Toggles or updates a portal lock (Exclusive to Master Admin 202247878@myturf.ul.ac.za).
 */
exports.updatePortalLock = async (req, res) => {
  const { id } = req.params;
  const { is_locked, locked_reason } = req.body;

  try {
    const lockedBool = Boolean(is_locked);
    const userEmail = req.user?.email || '202247878@myturf.ul.ac.za';

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
      message: `Portal control "${result.rows[0].name}" has been ${lockedBool ? 'LOCKED (Turned OFF)' : 'UNLOCKED (Turned ON)'}.`,
      control: result.rows[0]
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
      school_id = 1,
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
    const res = await db.query('SELECT is_locked, locked_reason FROM system_portal_controls WHERE id = $1', [controlId]);
    if (res.rows.length > 0) {
      return res.rows[0];
    }
  } catch (err) {
    console.warn(`Could not check lock state for ${controlId}:`, err.message);
  }
  return { is_locked: false, locked_reason: '' };
};

