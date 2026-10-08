const db = require('../../../db/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');
const NotificationService = require('../services/notificationService');
const { isControlLocked } = require('./systemController');
const { rejectNameDigits } = require('../services/lettersOnly');
const { attachSessionCookie } = require('./authController');

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

    const appLock = await isControlLocked('teacher_registration');
    const regLock = await isControlLocked('teacher_registration');

    res.json({
      success: true,
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
        assigned_classes: invite.assigned_classes || [],
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
    const lockState = await isControlLocked('teacher_registration');
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
    if (rejectNameDigits(res, full_name, surname)) return;

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
/**
 * Public endpoint for teachers to accept their invitation, confirm assigned subjects/classes,
 * set their account password, and immediately activate their Educator account.
 */
exports.confirmTeacherInvite = async (req, res) => {
  try {
    const lockState = await isControlLocked('teacher_registration');
    if (lockState && lockState.is_locked) {
      return res.status(403).json({
        error: lockState.locked_reason || 'Teacher registration is currently closed by Executive Administration.',
        is_locked: true
      });
    }

    const {
      token, password, confirmPassword,
      full_name, surname, phone, id_number, sace_number,
      confirmed_subjects, confirmed_grades, confirmed_classes
    } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Invitation token is required.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Find invite by invite_token or approval_token
    const inviteRes = await db.query(`
      SELECT * FROM staff_invites 
      WHERE (invite_token = $1 OR approval_token = $1)
      LIMIT 1;
    `, [token]);

    if (inviteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invitation token.' });
    }

    const invite = inviteRes.rows[0];

    const finalFullName = (full_name || invite.full_name || '').trim();
    const finalSurname = (surname || invite.surname || '').trim();
    const finalPhone = (phone || invite.phone || '').trim();
    const finalIdNumber = (id_number || invite.id_number || '').trim();
    const finalSaceNumber = (sace_number || invite.sace_number || '').trim();

    if (!finalFullName || !finalSurname) {
      return res.status(400).json({ error: 'First name and surname are required.' });
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);

    // Resolve confirmed allocations (fallback to invite allocations)
    const activeSubjects = Array.isArray(confirmed_subjects) && confirmed_subjects.length > 0
      ? confirmed_subjects
      : (invite.subjects_offered || []);

    const activeGrades = Array.isArray(confirmed_grades) && confirmed_grades.length > 0
      ? confirmed_grades.map(Number)
      : (invite.assigned_grades || [10]);

    const activeClasses = Array.isArray(confirmed_classes) && confirmed_classes.length > 0
      ? confirmed_classes
      : (invite.assigned_classes || []);

    // Check if invite is already approved by the principal
    const isPreApproved = invite.status === 'approved';

    if (!isPreApproved) {
      // Step: Teacher confirms workload & registers credentials -> Status becomes 'applied' pending Principal Approval
      await db.query(`
        UPDATE staff_invites 
        SET status = 'applied',
            full_name = $1,
            surname = $2,
            phone = $3,
            id_number = $4,
            sace_number = COALESCE($5, sace_number),
            qualifications = COALESCE($6, qualifications),
            confirmed_subjects = $7,
            confirmed_grades = $8,
            confirmed_classes = $9,
            subjects_offered = $7,
            assigned_grades = $8,
            assigned_classes = $9,
            password_hash = $10,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $11;
      `, [
        finalFullName, finalSurname, finalPhone || null, finalIdNumber || null,
        finalSaceNumber || null, (req.body.qualifications || invite.qualifications || null),
        activeSubjects, activeGrades, activeClasses,
        passwordHash, invite.id
      ]);

      const schoolRes = await db.query('SELECT name, contact_email, principal_name FROM schools WHERE id = $1', [invite.school_id]);
      const school = schoolRes.rows[0] || { name: 'Geleza SA Partner School' };
      const baseUrl = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || process.env.FRONTEND_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

      // Notify Principal by email & in-app notification
      try {
        emailService.sendTeacherApplicationPrincipalNotice({
          principalEmail: school.contact_email || 'admin@gelezasa.co.za',
          principalName: school.principal_name || 'Principal',
          colleagueName: `${finalFullName} ${finalSurname}`,
          schoolName: school.name,
          subjects: activeSubjects,
          grades: activeGrades,
          classes: activeClasses,
          saceNumber: finalSaceNumber,
          reviewUrl: `${baseUrl}/dashboard/admin?tab=employees`
        }).catch(e => console.warn('Could not send principal notice:', e.message));

        emailService.sendTeacherApplicationReceivedNotice({
          colleagueEmail: invite.email,
          colleagueName: `${finalFullName} ${finalSurname}`,
          schoolName: school.name,
          subjects: activeSubjects,
          classes: activeClasses
        }).catch(e => console.warn('Could not send teacher application received notice:', e.message));

        if (invite.invited_by) {
          NotificationService.sendToUsers([invite.invited_by], {
            title: 'Teacher Confirmed Workload & Registered',
            message: `${finalFullName} ${finalSurname} has confirmed their assigned subjects (${activeSubjects.join(', ')}) and registered. Please review and approve their account.`,
            type: 'announcement',
            category: 'staff',
            actionUrl: '/dashboard/admin?tab=employees'
          }).catch(() => {});
        }
      } catch (err) {}

      return res.json({
        success: true,
        status: 'applied',
        requiresApproval: true,
        message: 'Registration and workload confirmed successfully! Your registration is now pending review and approval by the School Principal.'
      });
    }

    // IF ALREADY APPROVED: Immediately activate user account in users & employees
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
      finalFullName,
      finalSurname,
      finalIdNumber || null,
      finalPhone || null
    ]);

    const user = userRes.rows[0];

    // 2. Create or update employee record with assigned subjects, grades, and classes!
    await db.query(`
      INSERT INTO employees (
        user_id, full_name, surname, department_id, school_id, phone, email,
        subjects, grades_taught, classes_taught
      )
      VALUES ($1, $2, $3, 2, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        subjects = EXCLUDED.subjects,
        grades_taught = EXCLUDED.grades_taught,
        classes_taught = EXCLUDED.classes_taught;
    `, [
      user.id, finalFullName, finalSurname,
      invite.school_id, finalPhone || null, invite.email,
      activeSubjects, activeGrades, activeClasses
    ]);

    // 3. Populate teacher_assignments table for each subject, grade, and class
    for (const subj of activeSubjects) {
      for (const grade of activeGrades) {
        const matchingClasses = activeClasses.filter(c => {
          const g = parseInt(String(c).replace(/\D/g, ''), 10);
          return isNaN(g) || g === grade;
        });
        const classesToAssign = matchingClasses.length > 0 ? matchingClasses : [`${grade}A`];
        for (const clsName of classesToAssign) {
          const classLookup = await db.query(
            'SELECT id FROM classes WHERE name = $1 AND school_id = $2 LIMIT 1',
            [clsName, invite.school_id]
          ).catch(() => ({ rows: [] }));
          const classId = classLookup.rows[0]?.id || null;

          await db.query(`
            INSERT INTO teacher_assignments (teacher_id, subject_name, grade_level, class_name, class_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (teacher_id, subject_name, grade_level, class_name) 
            DO UPDATE SET class_id = EXCLUDED.class_id;
          `, [user.id, subj, grade, clsName, classId]).catch(e => console.warn('Teacher assignment insert note:', e.message));
        }
      }
    }

    // 4. Update classes table homeroom or assigned teacher if unassigned
    if (activeClasses.length > 0) {
      await db.query(`
        UPDATE classes 
        SET assigned_teacher_id = $1 
        WHERE name = ANY($2) AND school_id = $3 AND assigned_teacher_id IS NULL;
      `, [user.id, activeClasses, invite.school_id]).catch(() => {});
    }

    // 5. Mark staff_invites status as accepted
    await db.query(`
      UPDATE staff_invites 
      SET status = 'accepted',
          full_name = $1,
          surname = $2,
          phone = $3,
          sace_number = COALESCE($4, sace_number),
          subjects_offered = $5,
          assigned_grades = $6,
          assigned_classes = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8;
    `, [
      finalFullName, finalSurname, finalPhone || null, finalSaceNumber || null,
      activeSubjects, activeGrades, activeClasses, invite.id
    ]);

    // 6. Notify principal via in-app Notification Icon
    if (invite.invited_by) {
      NotificationService.sendToUsers([invite.invited_by], {
        title: 'Educator Confirmed Subject Allocations',
        message: `${finalFullName} ${finalSurname} has confirmed their invitation and activated their Educator account for ${activeSubjects.join(', ')}.`,
        type: 'announcement',
        category: 'staff',
        actionUrl: '/dashboard/admin?tab=employees'
      }).catch(e => console.warn('Principal notification error:', e.message));
    }

    // 7. Generate JWT session token for instant login
    const signingSecret = process.env.JWT_SECRET || 'fusion_high_secret_signing_key_2026';
    const sessionId = require('crypto').randomBytes(16).toString('hex');
    const tokenPayload = {
      id: user.id,
      role: 'teacher',
      email: user.email,
      full_name: user.full_name,
      school_id: user.school_id,
      sid: sessionId
    };
    const authToken = jwt.sign(tokenPayload, signingSecret, { expiresIn: '7d' });
    if (typeof attachSessionCookie === 'function') {
      attachSessionCookie(res, authToken);
    }

    res.json({
      success: true,
      message: 'Account successfully activated! Your assigned subjects and classes have been confirmed.',
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        surname: user.surname,
        role: 'teacher',
        school_id: user.school_id,
        subjects: activeSubjects,
        grades_taught: activeGrades,
        classes_taught: activeClasses
      }
    });
  } catch (err) {
    console.error('Error confirming teacher invite:', err);
    res.status(500).json({ error: 'Failed to confirm invitation and activate teacher account: ' + err.message });
  }
};

exports.registerTeacherAccount = exports.confirmTeacherInvite;
