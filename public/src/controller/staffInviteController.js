const db = require('../../../db/db');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const { isControlLocked } = require('./systemController');

/**
 * Public endpoint to verify a staff invitation or approval token.
 */
exports.verifyToken = async (req, res) => {
  try {
    const token = req.query.token || req.query.invite;
    if (!token) {
      return res.status(400).json({ error: 'Token is required.' });
    }

    const inviteRes = await db.query(`
      SELECT * FROM staff_invites 
      WHERE invite_token = $1 OR approval_token = $1
      LIMIT 1;
    `, [token]);

    if (inviteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation or approval record not found. Please contact your school administrator.' });
    }

    const invite = inviteRes.rows[0];

    const schoolRes = await db.query('SELECT name, district, province FROM schools WHERE id = $1', [invite.school_id]);
    const school = schoolRes.rows[0] || { name: 'Geleza SA Partner School' };

    const appLock = await isControlLocked('parent_application');
    const regLock = await isControlLocked('user_registration');

    res.json({
      valid: true,
      invite: {
        id: invite.id,
        email: invite.email,
        full_name: invite.full_name || '',
        surname: invite.surname || '',
        phone: invite.phone || '',
        id_number: invite.id_number || '',
        role_type: invite.role_type || 'teacher',
        sace_number: invite.sace_number || '',
        subjects_offered: invite.subjects_offered || [],
        sports_coached: invite.sports_coached || [],
        assigned_grades: invite.assigned_grades || [10],
        status: invite.status,
        school_id: invite.school_id,
        school_name: school.name,
        school_district: school.district,
        school_province: school.province,
        isAppLocked: Boolean(appLock?.is_locked),
        appLockReason: appLock?.locked_reason || 'Staff applications are currently closed by Executive Administration.',
        isRegLocked: Boolean(regLock?.is_locked),
        regLockReason: regLock?.locked_reason || 'User registration is currently closed by Executive Administration.'
      }
    });
  } catch (err) {
    console.error('Error verifying staff invite token:', err);
    res.status(500).json({ error: 'Failed to verify invitation token.' });
  }
};

/**
 * Public endpoint for invited teachers to submit their official faculty application.
 */
exports.submitTeacherApplication = async (req, res) => {
  try {
    // 1. Verify gatekeeper
    const lockState = await isControlLocked('parent_application');
    if (lockState && lockState.is_locked) {
      return res.status(403).json({
        error: lockState.locked_reason || 'Teacher applications are currently closed by Executive Administration.',
        is_locked: true
      });
    }

    const {
      token, full_name, surname, phone, id_number, sace_number,
      qualifications, subjects_offered = [], sports_coached = [],
      assigned_grades = []
    } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Invitation token is required.' });
    }

    const inviteRes = await db.query('SELECT * FROM staff_invites WHERE invite_token = $1', [token]);
    if (inviteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation token is invalid or expired.' });
    }

    const invite = inviteRes.rows[0];

    if (!full_name || !surname) {
      return res.status(400).json({ error: 'Full name and surname are required.' });
    }

    const cleanId = (id_number || '').toString().replace(/\D/g, '');
    if (cleanId && cleanId.length !== 13) {
      return res.status(400).json({ error: 'National ID number must be 13 digits.' });
    }

    // 2. Update staff_invites with application details and set status to 'applied'
    const updatedRes = await db.query(`
      UPDATE staff_invites
      SET full_name = $1,
          surname = $2,
          phone = $3,
          id_number = $4,
          sace_number = $5,
          qualifications = $6,
          subjects_offered = $7,
          sports_coached = $8,
          assigned_grades = $9,
          status = 'applied',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `, [
      full_name.trim(), surname.trim(), phone ? phone.trim() : null,
      cleanId || null, sace_number ? sace_number.trim() : null,
      qualifications ? qualifications.trim() : null,
      subjects_offered, sports_coached, assigned_grades, invite.id
    ]);

    const updatedInvite = updatedRes.rows[0];

    const schoolRes = await db.query('SELECT name, contact_email, principal_name FROM schools WHERE id = $1', [invite.school_id]);
    const school = schoolRes.rows[0] || { name: 'Geleza SA Partner School' };

    // 3. Send email confirmation to teacher
    emailService.sendTeacherApplicationReceivedNotice({
      colleagueEmail: invite.email,
      colleagueName: `${full_name.trim()} ${surname.trim()}`,
      schoolName: school.name,
      roleType: invite.role_type
    }).catch(e => console.warn('Could not send teacher application received notice:', e.message));

    // 4. Send notification email to principal
    const baseUrl = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || process.env.FRONTEND_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    emailService.sendTeacherApplicationPrincipalNotice({
      principalEmail: school.contact_email || 'admin@gelezasa.co.za',
      principalName: school.principal_name || 'Principal',
      colleagueName: `${full_name.trim()} ${surname.trim()}`,
      schoolName: school.name,
      roleType: invite.role_type,
      saceNumber: sace_number,
      reviewUrl: `${baseUrl}/dashboard/admin`
    }).catch(e => console.warn('Could not send principal notice:', e.message));

    res.json({
      success: true,
      message: 'Application submitted successfully! Your submission is now pending review by the School Principal.',
      status: 'applied'
    });
  } catch (err) {
    console.error('Error submitting teacher application:', err);
    res.status(500).json({ error: 'Failed to submit educator application.' });
  }
};

/**
 * Public endpoint for approved teachers to set their password and complete account registration.
 */
exports.registerTeacherAccount = async (req, res) => {
  try {
    // 1. Verify gatekeeper
    const lockState = await isControlLocked('user_registration');
    if (lockState && lockState.is_locked) {
      return res.status(403).json({
        error: lockState.locked_reason || 'User registration is currently closed by Executive Administration.',
        is_locked: true
      });
    }

    const { token, password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Approval token is required.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Find invite by approval_token or invite_token with status 'approved'
    const inviteRes = await db.query(`
      SELECT * FROM staff_invites 
      WHERE (approval_token = $1 OR invite_token = $1)
      LIMIT 1;
    `, [token]);

    if (inviteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired registration token.' });
    }

    const invite = inviteRes.rows[0];

    if (invite.status !== 'approved') {
      return res.status(400).json({
        error: `Your application is currently "${invite.status}". You can only complete registration once approved by the School Principal.`
      });
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);

    // 2. Create or Update user in users table (role_id = 4 for teacher)
    const userRes = await db.query(`
      INSERT INTO users (
        email, password_hash, role_id, school_id, is_superadmin,
        full_name, surname, id_number, phone, country
      )
      VALUES ($1, $2, 4, $3, FALSE, $4, $5, $6, $7, 'South Africa')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = 4,
        school_id = EXCLUDED.school_id,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname,
        id_number = COALESCE(EXCLUDED.id_number, users.id_number),
        phone = COALESCE(EXCLUDED.phone, users.phone)
      RETURNING id, email, full_name, surname, role_id, school_id;
    `, [
      invite.email.toLowerCase().trim(),
      passwordHash,
      invite.school_id,
      invite.full_name,
      invite.surname,
      invite.id_number,
      invite.phone
    ]);

    const user = userRes.rows[0];

    // 3. Create or update employee record
    await db.query(`
      INSERT INTO employees (user_id, full_name, surname, department_id, school_id, phone, email)
      VALUES ($1, $2, $3, 1, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone;
    `, [
      user.id, invite.full_name, invite.surname,
      invite.school_id, invite.phone, invite.email
    ]);

    // 4. Mark staff_invites status as registered
    await db.query(`
      UPDATE staff_invites 
      SET status = 'registered',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [invite.id]);

    res.json({
      success: true,
      message: 'Account successfully created and registered! You can now log into Geleza SA with your credentials.',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        surname: user.surname,
        role: 'teacher',
        school_id: user.school_id
      }
    });
  } catch (err) {
    console.error('Error registering teacher account:', err);
    res.status(500).json({ error: 'Failed to finalize teacher registration.' });
  }
};
