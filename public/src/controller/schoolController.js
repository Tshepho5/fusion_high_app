const db = require('../../../db/db');
const { resolveSchoolId } = require('../services/schoolScope');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');
const { isControlLocked } = require('./systemController');
const paymentHold = require('../services/paymentHold');
const { ensureSchoolModuleColumns, linkSchoolModules } = require('../services/schoolModules');
const { rejectNameDigits } = require('../services/lettersOnly');

function hideBankNumbers(row) {
  if (!row) return row;
  const copy = { ...row };
  copy.has_bank_account = Boolean(paymentHold.realBank(row));
  delete copy.account_number;
  delete copy.branch_code;
  return copy;
}

async function viewerFromRequest(req) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!bearer || bearer === 'null' || bearer === 'undefined' || !process.env.JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(bearer, process.env.JWT_SECRET);
    const result = await db.query('SELECT id, school_id, is_superadmin FROM users WHERE id = $1', [decoded.id]);
    return result.rows[0] || null;
  } catch (_) {
    return null;
  }
}

async function ensureGradeClasses(schoolId) {
  await db.query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id INTEGER');
  for (let grade = 8; grade <= 12; grade += 1) {
    const name = `Grade ${grade} · School ${schoolId}`;
    await db.query(
      `INSERT INTO classes (name, grade, stream, school_id)
       SELECT $1, $2, 'General', $3
       WHERE NOT EXISTS (
         SELECT 1 FROM classes WHERE school_id = $3 AND grade = $2 AND stream = 'General'
       )`,
      [name, grade, schoolId]
    );
  }
}

/**
 * Returns schools whose principal registration has been approved.
 */
exports.getAllSchools = async (req, res) => {
  try {
    await ensureSchoolModuleColumns();
    const query = `
      SELECT 
        s.id, s.name, s.slug, s.domain, s.emis_number, s.circuit, s.district, s.province,
        s.physical_address, s.contact_email, s.contact_phone, s.principal_name,
        s.logo_url, s.badge_url, s.primary_color, s.secondary_color, s.accent_color,
        s.motto, s.curriculum_type, s.grade_range, s.is_active, s.settings,
        s.offered_languages, s.offered_subjects, s.offered_streams,
        COALESCE(s.teacher_modules, '[]'::jsonb) AS teacher_modules,
        COALESCE(s.learner_modules, '[]'::jsonb) AS learner_modules,
        COALESCE((SELECT COUNT(*)::int FROM children c WHERE c.school_id::text = s.id::text), 0) AS enrolled_learners_count,
        COALESCE((SELECT COUNT(*)::int FROM employees e WHERE e.school_id::text = s.id::text), 0) AS staff_count,
        COALESCE((SELECT COUNT(*)::int FROM classes cl WHERE cl.school_id::text = s.id::text), 0) AS classes_count,
        COALESCE((SELECT COUNT(*)::int FROM users u WHERE u.school_id::text = s.id::text AND u.role_id::text = '2'), 0) AS parents_count
      FROM schools s
      WHERE s.is_active = TRUE
      ORDER BY s.id ASC;
    `;
    const result = await db.query(query);
    return res.json((result.rows || []).map(hideBankNumbers));
  } catch (err) {
    console.error('Error fetching schools:', err.message);
    res.status(500).json({ error: 'The school list could not be loaded.' });
  }
};

/**
 * Returns details & branding for the current active school with real database counts.
 * Resolves by query param `school_id`, header `x-school-id`, or user profile school_id.
 */
exports.getCurrentSchool = async (req, res) => {
  try {
    await ensureSchoolModuleColumns();
    const viewer = await viewerFromRequest(req);
    const requestedSlug = req.query.slug || req.headers['x-school-slug'];
    let requestedId = req.query.school_id || req.headers['x-school-id'];
    if (viewer && !viewer.is_superadmin) requestedId = viewer.school_id;
    else if (viewer && viewer.is_superadmin && !requestedId) requestedId = viewer.school_id;

    let query = `
      SELECT 
        s.id, s.name, s.slug, s.domain, s.emis_number, s.circuit, s.district, s.province,
        s.physical_address, s.contact_email, s.contact_phone, s.principal_name,
        s.logo_url, s.badge_url, s.primary_color, s.secondary_color, s.accent_color,
        s.motto, s.curriculum_type, s.grade_range, s.is_active, s.settings,
        s.offered_languages, s.offered_subjects, s.offered_streams,
        COALESCE(s.teacher_modules, '[]'::jsonb) AS teacher_modules,
        COALESCE(s.learner_modules, '[]'::jsonb) AS learner_modules,
        COALESCE((SELECT COUNT(*)::int FROM children c WHERE c.school_id::text = s.id::text), 0) AS enrolled_learners_count,
        COALESCE((SELECT COUNT(*)::int FROM employees e WHERE e.school_id::text = s.id::text), 0) AS staff_count,
        COALESCE((SELECT COUNT(*)::int FROM classes cl WHERE cl.school_id::text = s.id::text), 0) AS classes_count,
        COALESCE((SELECT COUNT(*)::int FROM users u WHERE u.school_id::text = s.id::text AND u.role_id::text = '2'), 0) AS parents_count
      FROM schools s 
      WHERE s.is_active = TRUE 
    `;
    let params = [];

    if (requestedSlug) {
      query += `AND s.slug = $1 LIMIT 1;`;
      params = [requestedSlug];
    } else {
      const parsedId = parseInt(requestedId, 10);
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return res.status(404).json({ error: 'No school is registered yet. A principal registers the school first.' });
      }
      query += `AND s.id = $1::integer LIMIT 1;`;
      params = [parsedId];
    }

    const result = await db.query(query, params);
    if (result.rows && result.rows.length > 0) {
      return res.json(hideBankNumbers(result.rows[0]));
    }
    return res.status(404).json({ error: 'No school is registered yet. A principal registers the school first.' });
  } catch (err) {
    console.error('Error fetching current school:', err.message);
    res.status(500).json({ error: 'The school record could not be loaded.' });
  }
};

/**
 * Checks if a school offers a specific Home Language, and if not, refers other schools that do.
 */
exports.checkLanguageOffer = async (req, res) => {
  try {
    const schoolId = parseInt(req.query.school_id, 10);
    const requestedLanguage = (req.query.language || '').trim();
    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      return res.status(400).json({ error: 'Choose a school before checking the language.' });
    }

    if (!requestedLanguage) {
      return res.status(400).json({ error: 'Language parameter is required.' });
    }

    const schoolRes = await db.query(
      'SELECT id, name, slug, circuit, district, province, offered_languages, bank_name, account_number, branch_code, account_holder, application_fee, registration_fee FROM schools WHERE id = $1',
      [schoolId]
    );

    if (schoolRes.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }

    const school = schoolRes.rows[0];
    const offeredLangs = school.offered_languages || [];

    const isOffered = offeredLangs.some(l => 
      l.toLowerCase().includes(requestedLanguage.toLowerCase()) || 
      requestedLanguage.toLowerCase().includes(l.toLowerCase())
    );

    if (isOffered) {
      return res.json({
        is_offered: true,
        school_id: school.id,
        school_name: school.name,
        language: requestedLanguage,
        offered_languages: offeredLangs,
        banking_details: paymentHold.realBank(school),
        application_fee: parseFloat(school.application_fee) || 250.00,
        registration_fee: parseFloat(school.registration_fee) || 1500.00,
        payments_waiting: !paymentHold.realBank(school)
      });
    }

    // School does not offer the requested Home Language -> Find referrals!
    const allSchools = await db.query(
      'SELECT id, name, slug, circuit, district, province, offered_languages, bank_name, account_number, branch_code, account_holder FROM schools WHERE is_active = TRUE AND id != $1 ORDER BY name ASC',
      [schoolId]
    );

    const referrals = allSchools.rows.filter(s => {
      const sLangs = s.offered_languages || [];
      return sLangs.some(l => 
        l.toLowerCase().includes(requestedLanguage.toLowerCase()) || 
        requestedLanguage.toLowerCase().includes(l.toLowerCase())
      );
    }).map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      circuit: s.circuit,
      district: s.district,
      province: s.province,
      offered_languages: s.offered_languages
    }));

    return res.json({
      is_offered: false,
      school_id: school.id,
      school_name: school.name,
      language: requestedLanguage,
      offered_languages: offeredLangs,
      message: `The school "${school.name}" does not provide ${requestedLanguage} as an official Home Language.`,
      referrals
    });
  } catch (err) {
    console.error('Error checking language offer:', err);
    res.status(500).json({ error: 'Failed to verify school language offering.' });
  }
};

/**
 * Retrieves a single school by slug with live database counts.
 */
exports.getSchoolBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const query = `
      SELECT 
        s.id, s.name, s.slug, s.domain, s.emis_number, s.circuit, s.district, s.province,
        s.physical_address, s.contact_email, s.contact_phone, s.principal_name,
        s.logo_url, s.badge_url, s.primary_color, s.secondary_color, s.accent_color,
        s.motto, s.curriculum_type, s.grade_range, s.is_active, s.settings,
        COALESCE((SELECT COUNT(*)::int FROM children c WHERE c.school_id::text = s.id::text), 0) AS enrolled_learners_count,
        COALESCE((SELECT COUNT(*)::int FROM employees e WHERE e.school_id::text = s.id::text), 0) AS staff_count,
        COALESCE((SELECT COUNT(*)::int FROM classes cl WHERE cl.school_id::text = s.id::text), 0) AS classes_count,
        COALESCE((SELECT COUNT(*)::int FROM users u WHERE u.school_id::text = s.id::text AND u.role_id::text = '2'), 0) AS parents_count
      FROM schools s 
      WHERE s.slug = $1 AND s.is_active = TRUE;
    `;
    const result = await db.query(query, [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching school by slug:', err.message);
    res.status(500).json({ error: 'Failed to retrieve school details.' });
  }
};

/**
 * Updates a school's branding (Colors, Motto, Principal, Logo, Contact Info).
 */
exports.updateSchoolBranding = async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id || resolveSchoolId(req), 10);
    const {
      primary_color, secondary_color, accent_color, motto,
      logo_url, badge_url, contact_email, contact_phone, principal_name,
      curriculum_type, settings
    } = req.body;

    const query = `
      UPDATE schools
      SET 
        primary_color = COALESCE($1, primary_color),
        secondary_color = COALESCE($2, secondary_color),
        accent_color = COALESCE($3, accent_color),
        motto = COALESCE($4, motto),
        logo_url = COALESCE($5, logo_url),
        badge_url = COALESCE($6, badge_url),
        contact_email = COALESCE($7, contact_email),
        contact_phone = COALESCE($8, contact_phone),
        principal_name = COALESCE($9, principal_name),
        curriculum_type = COALESCE($10, curriculum_type),
        settings = COALESCE($11::jsonb, settings)
      WHERE id = $12
      RETURNING *;
    `;

    const result = await db.query(query, [
      primary_color, secondary_color, accent_color, motto,
      logo_url, badge_url, contact_email, contact_phone, principal_name,
      curriculum_type, settings ? JSON.stringify(settings) : null, schoolId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }

    res.json({
      success: true,
      message: 'School branding and settings updated successfully.',
      school: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating school branding:', err.message);
    res.status(500).json({ error: 'Failed to update school branding.' });
  }
};

/**
 * Handles official School Onboarding & Accreditation applications submitted by Principals.
 */
exports.applySchool = async (req, res) => {
  try {
    // 0. Executive Gatekeeper Lock Verification
    const lockState = await isControlLocked('school_registration');
    if (lockState && lockState.is_locked) {
      return res.status(403).json({
        error: lockState.locked_reason || 'School registration is currently locked by Geleza SA Executives.',
        is_locked: true
      });
    }

    const {
      school_name,
      emis_number,
      province,
      district,
      circuit,
      physical_address,
      contact_email,
      contact_phone,
      curriculum_type = 'CAPS (DBE)',
      grade_range = '8-12',
      offered_streams = ['General', 'Science', 'Commerce', 'Tourism'],
      offered_languages = ['English FAL', 'Sepedi Home Language'],
      offered_subjects = [],
      principal_first_name,
      principal_surname,
      principal_id_number,
      principal_sace_number,
      principal_email,
      principal_phone,
      password,
      motto = 'Excellence in Education',
      primary_color = '#0284c7',
      secondary_color = '#06b6d4',
      application_fee_paid = 450.00,
      registration_fee_paid = 1500.00,
      payment_reference,
      teacher_modules,
      learner_modules
    } = req.body;

    // Strict input validation
    if (!school_name || !school_name.trim()) {
      return res.status(400).json({ error: 'Official school name is strictly required.' });
    }
    if (/\d/.test(school_name)) {
      return res.status(400).json({ error: 'Numbers are not allowed in this field. Please use letters only.' });
    }

    const cleanEmis = (emis_number || '').toString().replace(/\D/g, '');
    if (cleanEmis.length !== 9) {
      return res.status(400).json({ error: 'Invalid EMIS Number. Must be exactly 9 numeric digits.' });
    }

    if (!province || !district || !physical_address) {
      return res.status(400).json({ error: 'School location details (Province, District, Physical Address) are mandatory.' });
    }

    let firstName = (principal_first_name || '').trim();
    let surname = (principal_surname || '').trim();
    if (!firstName && req.body.principal_name) {
      const parts = req.body.principal_name.trim().split(' ');
      firstName = parts[0] || '';
      surname = surname || parts.slice(1).join(' ') || 'Principal';
    }

    if (!firstName || !surname) {
      return res.status(400).json({ error: 'Principal full name and surname are required.' });
    }

    if (/\d/.test(firstName) || /\d/.test(surname)) {
      return res.status(400).json({ error: 'Numbers are strictly prohibited in the Principal name placeholders.' });
    }

    const cleanId = (principal_id_number || '').toString().replace(/\D/g, '');
    if (cleanId.length !== 13) {
      return res.status(400).json({ error: 'Principal National ID number must be exactly 13 digits.' });
    }

    if (!principal_email || !principal_email.includes('@')) {
      return res.status(400).json({ error: 'A valid Principal work email address is required.' });
    }

    if (!principal_phone || !String(principal_phone).trim()) {
      return res.status(400).json({ error: 'Principal cellphone number is required.' });
    }

    if (!password || password.trim().length < 6) {
      return res.status(400).json({ error: 'Choose a password of at least 6 characters. It is used only after Geleza SA approves the school.' });
    }

    const existingUser = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [principal_email.trim()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'That email already has a Geleza SA account. Use a different principal email.' });
    }

    // Check if school already exists
    const existingSchool = await db.query('SELECT id, name FROM schools WHERE emis_number = $1 OR LOWER(name) = LOWER($2)', [cleanEmis, school_name.trim()]);
    if (existingSchool.rows.length > 0) {
      return res.status(409).json({ error: `A school with EMIS ${cleanEmis} or name "${school_name}" is already registered on Geleza SA.` });
    }

    // Check if an application is already active/pending
    const existingApp = await db.query(
      'SELECT id, application_number, status FROM school_applications WHERE emis_number = $1 AND status IN (\'pending_review\', \'under_review\')',
      [cleanEmis]
    );
    if (existingApp.rows.length > 0) {
      return res.status(409).json({
        error: `An application (${existingApp.rows[0].application_number}) for this school is already under executive review.`
      });
    }

    const appNumber = `GSA-SCH-${Date.now().toString().slice(-6)}`;
    const payRef = payment_reference || `PAY-${Date.now().toString().slice(-8)}`;
    const passHash = await bcrypt.hash(password.trim(), 10);

    await db.query('ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS password_hash TEXT');
    await ensureSchoolModuleColumns();
    const linkedModules = linkSchoolModules(teacher_modules, learner_modules);
    const chosenTeacherModules = linkedModules.teacher;
    const chosenLearnerModules = linkedModules.learner;

    const insertQuery = `
      INSERT INTO school_applications (
        application_number, status, school_name, emis_number, province, district, circuit,
        physical_address, contact_email, contact_phone, curriculum_type, grade_range,
        offered_streams, offered_languages, offered_subjects,
        principal_first_name, principal_surname, principal_id_number, principal_sace_number,
        principal_email, principal_phone, motto, primary_color, secondary_color,
        application_fee_paid, registration_fee_paid, payment_status, payment_reference, password_hash,
        teacher_modules, learner_modules
      )
      VALUES (
        $1, 'pending_review', $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22, $23,
        $24, $25, 'awaiting_bank', $26, $27,
        $28::jsonb, $29::jsonb
      )
      RETURNING *;
    `;

    const result = await db.query(insertQuery, [
      appNumber, school_name.trim(), cleanEmis, province.trim(), district.trim(), circuit ? circuit.trim() : null,
      physical_address.trim(), (contact_email || principal_email || '').trim().toLowerCase(), (contact_phone || principal_phone || '').trim(), curriculum_type || 'CAPS (DBE)', grade_range || '8-12',
      offered_streams || ['General', 'Science', 'Commerce'],
      offered_languages || ['English Home Language', 'English FAL', 'Sepedi Home Language', 'isiZulu Home Language'],
      offered_subjects || [],
      firstName, surname, cleanId, (principal_sace_number || req.body.principal_sace || '').toString().trim() || null,
      principal_email.trim().toLowerCase(), principal_phone.trim(), (motto || 'Excellence in Education').trim(), primary_color || '#0284c7', secondary_color || '#06b6d4',
      parseFloat(application_fee_paid) || 450.00, parseFloat(registration_fee_paid) || 1500.00, payRef, passHash,
      JSON.stringify(chosenTeacherModules), JSON.stringify(chosenLearnerModules)
    ]);

    const createdApp = result.rows[0];
    delete createdApp.password_hash;

    emailService.sendSchoolApplicationReceivedNotice({
      principalEmail: createdApp.principal_email,
      principalName: `${createdApp.principal_first_name} ${createdApp.principal_surname}`,
      schoolName: createdApp.school_name,
      emisNumber: createdApp.emis_number,
      applicationNumber: createdApp.application_number
    }).catch(err => {
      console.warn('[EMAIL NOTIFY] Could not send receipt email:', err.message);
    });

    res.status(201).json({
      success: true,
      message: `School "${school_name.trim()}" is with Geleza SA for approval. Families can select it only after that approval.`,
      application_number: appNumber,
      application: createdApp
    });
  } catch (err) {
    console.error('Error submitting school application:', err.message);
    res.status(500).json({ error: 'Failed to process school application. Please verify details and try again.' });
  }
};

/**
 * Lists all School Applications for Geleza SA Executives / SuperAdmins.
 */
exports.getSchoolApplications = async (req, res) => {
  try {
    const statusFilter = req.query.status;
    let query = 'SELECT * FROM school_applications';
    const params = [];

    if (statusFilter && statusFilter !== 'all') {
      query += ' WHERE status = $1';
      params.push(statusFilter);
    }

    query += ' ORDER BY created_at DESC;';
    const result = await db.query(query, params);
    res.json(result.rows.map((row) => {
      const copy = { ...row };
      delete copy.password_hash;
      return copy;
    }));
  } catch (err) {
    console.error('Error fetching school applications:', err.message);
    res.status(500).json({ error: 'Failed to retrieve school applications.' });
  }
};

/**
 * Reviews (Approve or Decline) a School Application by Geleza SA Executives.
 */
exports.reviewSchoolApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, reason, executive_notes } = req.body;

    if (!['approve', 'decline'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be either "approve" or "decline".' });
    }

    const appRes = await db.query('SELECT * FROM school_applications WHERE id = $1', [id]);
    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const app = appRes.rows[0];

    if (app.status === 'approved') {
      return res.status(409).json({ error: 'This school application is already approved.' });
    }
    if (app.status === 'declined') {
      return res.status(409).json({ error: 'This school application was declined.' });
    }

    await ensureSchoolModuleColumns();

    if (decision === 'approve') {
      // 1. Generate unique slug for school
      let slug = app.school_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existingSlug = await db.query('SELECT id FROM schools WHERE slug = $1', [slug]);
      if (existingSlug.rows.length > 0) {
        slug = `${slug}-${app.emis_number.slice(-4)}`;
      }

      const approvedModules = (app.teacher_modules || app.learner_modules)
        ? linkSchoolModules(app.teacher_modules, app.learner_modules)
        : null;

      // 2. Insert into schools table
      const schoolInsert = await db.query(`
        INSERT INTO schools (
          name, slug, domain, emis_number, circuit, district, province,
          physical_address, contact_email, contact_phone, principal_name,
          primary_color, secondary_color, motto, curriculum_type, grade_range,
          offered_streams, offered_languages, offered_subjects, sace_number, is_active,
          teacher_modules, learner_modules
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, TRUE, $21::jsonb, $22::jsonb)
        RETURNING *;
      `, [
        app.school_name, slug, `${slug}.co.za`, app.emis_number, app.circuit, app.district, app.province,
        app.physical_address, app.contact_email, app.contact_phone, `${app.principal_first_name} ${app.principal_surname}`,
        app.primary_color || '#0284c7', app.secondary_color || '#06b6d4', app.motto || 'Excellence in Education',
        app.curriculum_type || 'CAPS (DBE)', app.grade_range || '8-12',
        app.offered_streams || ['General', 'Science', 'Commerce', 'Tourism'],
        app.offered_languages || ['English FAL', 'Sepedi Home Language'],
        app.offered_subjects || [], app.principal_sace_number,
        approvedModules ? JSON.stringify(approvedModules.teacher) : null,
        approvedModules ? JSON.stringify(approvedModules.learner) : null
      ]);

      const newSchool = schoolInsert.rows[0];
      await ensureGradeClasses(newSchool.id);

      // 3. Create or Update Principal user account
      let passHash = app.password_hash;
      let tempPassword = undefined;
      if (!passHash) {
        tempPassword = req.body.temporary_password || `Geleza@${app.emis_number || '2026'}`;
        passHash = await bcrypt.hash(tempPassword, 10);
      }

      const userInsert = await db.query(`
        INSERT INTO users (
          email, password_hash, role_id, school_id, is_superadmin,
          full_name, surname, id_number, phone, country
        )
        VALUES ($1, $2, (SELECT id FROM roles WHERE name = 'admin'), $3, FALSE, $4, $5, $6, $7, 'South Africa')
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role_id = EXCLUDED.role_id,
          school_id = EXCLUDED.school_id,
          full_name = EXCLUDED.full_name,
          surname = EXCLUDED.surname
        RETURNING id;
      `, [
        app.principal_email, passHash, newSchool.id,
        app.principal_first_name, app.principal_surname,
        app.principal_id_number, app.principal_phone
      ]);

      const principalUserId = userInsert.rows[0].id;

      // 4. Create Employee record for Principal
      await db.query(`
      INSERT INTO employees (user_id, full_name, surname, department_id, school_id, phone, email)
      VALUES ($1, $2, $3, (SELECT id FROM departments ORDER BY id ASC LIMIT 1), $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
          school_id = EXCLUDED.school_id,
          full_name = EXCLUDED.full_name,
          surname = EXCLUDED.surname;
      `, [
        principalUserId, app.principal_first_name, app.principal_surname,
        newSchool.id, app.principal_phone, app.principal_email
      ]);

      // 5. Update Application Status
      await db.query(`
        UPDATE school_applications
        SET status = 'approved',
            reviewed_by = $1,
            reviewed_at = CURRENT_TIMESTAMP,
            executive_notes = $2,
            created_school_id = $3
        WHERE id = $4;
      `, [req.user?.id || null, executive_notes || 'Approved by Geleza SA Executive Board', newSchool.id, id]);

      const baseUrl = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null) || process.env.FRONTEND_URL || 'https://gelezasa.co.za';

      // 6. Send Approval Email to Principal
      emailService.sendSchoolApplicationApprovedNotice({
        principalEmail: app.principal_email,
        principalName: `${app.principal_first_name} ${app.principal_surname}`,
        schoolName: app.school_name,
        emisNumber: app.emis_number,
        temporaryPassword: tempPassword,
        loginUrl: `${baseUrl}/login`
      }).catch(err => {
        console.warn('[EMAIL NOTIFY] Could not send approval email:', err.message);
      });

      return res.json({
        success: true,
        status: 'approved',
        message: `School "${app.school_name}" successfully provisioned and Principal notified.`,
        school: newSchool
      });
    } else {
      // Decline Application
      await db.query(`
        UPDATE school_applications
        SET status = 'declined',
            declined_reason = $1,
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            executive_notes = $3
        WHERE id = $4;
      `, [reason || 'Accreditation details could not be verified.', req.user?.id || null, executive_notes || null, id]);

      const baseUrl = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null) || process.env.FRONTEND_URL || 'https://gelezasa.co.za';

      // Send Decline Email with explanation
      emailService.sendSchoolApplicationDeclinedNotice({
        principalEmail: app.principal_email,
        principalName: `${app.principal_first_name} ${app.principal_surname}`,
        schoolName: app.school_name,
        emisNumber: app.emis_number,
        reason: reason || 'EMIS registration or Principal credentials could not be verified.',
        appealUrl: `${baseUrl}/register`
      }).catch(err => {
        console.warn('[EMAIL NOTIFY] Could not send decline email:', err.message);
      });

      return res.json({
        success: true,
        status: 'declined',
        message: 'Application declined and notice dispatched to applicant.'
      });
    }
  } catch (err) {
    console.error('Error reviewing school application:', err.message);
    res.status(500).json({ error: 'Failed to process application review.' });
  }
};

exports.updateSchoolModules = async (req, res) => {
  try {
    await ensureSchoolModuleColumns();
    const schoolId = parseInt(req.params.id, 10);
    if (!schoolId) {
      return res.status(400).json({ error: 'A school is required.' });
    }
    if (!req.user?.is_superadmin && Number(req.user?.school_id) !== schoolId) {
      return res.status(403).json({ error: 'You can only choose modules for your own school.' });
    }

    const linkedModules = linkSchoolModules(req.body.teacher_modules, req.body.learner_modules);
    const teacherModules = linkedModules.teacher;
    const learnerModules = linkedModules.learner;
    const updated = await db.query(
      `UPDATE schools
       SET teacher_modules = $1::jsonb, learner_modules = $2::jsonb
       WHERE id = $3
       RETURNING id, name, teacher_modules, learner_modules`,
      [JSON.stringify(teacherModules), JSON.stringify(learnerModules), schoolId]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }
    res.json({ success: true, school: updated.rows[0] });
  } catch (err) {
    console.error('Error saving school modules:', err.message);
    res.status(500).json({ error: 'The school modules could not be saved.' });
  }
};

exports.getSchoolBank = async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    if (!schoolId) return res.status(400).json({ error: 'A school is required.' });
    if (!req.user?.is_superadmin && Number(req.user?.school_id) !== schoolId) {
      return res.status(403).json({ error: 'You can only view the bank account for your own school.' });
    }
    const result = await db.query(
      `SELECT id, bank_name, account_holder, account_number, branch_code, account_type
       FROM schools WHERE id = $1`,
      [schoolId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'School not found.' });
    const row = result.rows[0];
    res.json({ ...row, has_bank_account: Boolean(paymentHold.realBank(row)) });
  } catch (err) {
    console.error('Error loading school bank:', err.message);
    res.status(500).json({ error: 'The school bank account could not be loaded.' });
  }
};

exports.updateSchoolBank = async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    if (!schoolId) return res.status(400).json({ error: 'A school is required.' });
    if (!req.user?.is_superadmin && Number(req.user?.school_id) !== schoolId) {
      return res.status(403).json({ error: 'You can only save the bank account for your own school.' });
    }
    const bankName = String(req.body.bank_name || '').trim();
    const accountHolder = String(req.body.account_holder || '').trim();
    const accountNumber = String(req.body.account_number || '').replace(/\D/g, '');
    const branchCode = String(req.body.branch_code || '').replace(/\D/g, '');
    const accountType = String(req.body.account_type || 'Cheque').trim();
    if (rejectNameDigits(res, bankName, accountHolder)) return;
    if (!bankName || !accountHolder) {
      return res.status(400).json({ error: 'The bank name and account holder are required.' });
    }
    if (accountNumber.length < 6 || accountNumber.length > 16) {
      return res.status(400).json({ error: 'Enter the school account number using digits only.' });
    }
    if (branchCode.length < 4 || branchCode.length > 8) {
      return res.status(400).json({ error: 'Enter the branch code using digits only.' });
    }
    if (paymentHold.realBank({
      bank_name: bankName,
      account_holder: accountHolder,
      account_number: accountNumber,
      branch_code: branchCode
    }) == null && (accountNumber === '62849102841' || accountNumber === '20491823901')) {
      return res.status(400).json({ error: 'That account number is a placeholder. Enter the school’s own bank account.' });
    }
    const updated = await db.query(
      `UPDATE schools
       SET bank_name = $1, account_holder = $2, account_number = $3, branch_code = $4, account_type = $5
       WHERE id = $6
       RETURNING id, bank_name, account_holder, account_number, branch_code, account_type`,
      [bankName, accountHolder, accountNumber, branchCode, accountType, schoolId]
    );
    if (updated.rows.length === 0) return res.status(404).json({ error: 'School not found.' });
    const row = updated.rows[0];
    res.json({ success: true, school: { ...row, has_bank_account: Boolean(paymentHold.realBank(row)) } });
  } catch (err) {
    console.error('Error saving school bank:', err.message);
    res.status(500).json({ error: 'The school bank account could not be saved.' });
  }
};

/**
 * Updates a school's offered subjects, streams, and languages.
 */
exports.updateSchoolCurriculum = async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    if (!schoolId) return res.status(400).json({ error: 'A valid school ID is required.' });

    if (!req.user?.is_superadmin && Number(req.user?.school_id) !== schoolId) {
      return res.status(403).json({ error: 'You can only update the curriculum for your own school.' });
    }

    const { offered_subjects, offered_streams, offered_languages } = req.body;

    const existingRes = await db.query('SELECT * FROM schools WHERE id = $1', [schoolId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }

    const current = existingRes.rows[0];
    const newSubjects = Array.isArray(offered_subjects) ? offered_subjects : current.offered_subjects;
    const newStreams = Array.isArray(offered_streams) ? offered_streams : current.offered_streams;
    const newLanguages = Array.isArray(offered_languages) ? offered_languages : current.offered_languages;

    const updated = await db.query(
      `UPDATE schools
       SET offered_subjects = $1,
           offered_streams = $2,
           offered_languages = $3
       WHERE id = $4
       RETURNING *;`,
      [newSubjects, newStreams, newLanguages, schoolId]
    );

    // Sync to Supabase Cloud REST if available
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
      try {
        const axios = require('axios');
        await axios.patch(
          `${process.env.SUPABASE_URL}/rest/v1/schools?id=eq.${schoolId}`,
          {
            offered_subjects: newSubjects,
            offered_streams: newStreams,
            offered_languages: newLanguages
          },
          {
            headers: {
              apikey: process.env.SUPABASE_SECRET_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (cloudErr) {
        console.warn('[SUPABASE CLOUD SYNC] Error syncing curriculum to cloud REST:', cloudErr.message);
      }
    }

    res.json({
      success: true,
      message: 'School curriculum and offered subjects updated successfully.',
      school: updated.rows[0]
    });
  } catch (err) {
    console.error('Error updating school curriculum:', err.message);
    res.status(500).json({ error: 'Failed to update school curriculum.' });
  }
};

