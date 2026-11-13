const crypto = require('crypto');
const db = require('../../../db/db');
const { withTransaction } = require('../../../db/transaction');
const { resolveSchoolId } = require('../services/schoolScope');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');
const { isControlLocked } = require('./systemController');
const paymentHold = require('../services/paymentHold');
const { ensureSchoolModuleColumns, linkSchoolModules } = require('../services/schoolModules');
const { rejectNameDigits } = require('../services/lettersOnly');
const { validateRegistration, publicApplication } = require('../services/schoolRegistrationRules');
const schoolLogo = require('../services/schoolLogo');
const principalActivation = require('../services/principalActivation');
const schoolRetention = require('../services/schoolRetention');

function ownsSchool(req, schoolId) {
  if (req.user?.is_superadmin) return true;
  return Number(req.user?.school_id) === Number(schoolId);
}

function hideBankNumbers(row) {
  if (!row) return row;
  const copy = { ...row };
  copy.has_bank_account = Boolean(paymentHold.realBank(row));
  delete copy.account_number;
  delete copy.branch_code;
  delete copy.account_holder;
  delete copy.bank_name;
  delete copy.account_type;
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

async function ensureGradeClasses(schoolId, runner = db) {
  await runner.query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id INTEGER');
  await runner.query('ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_name_key');
  for (let grade = 8; grade <= 12; grade += 1) {
    const name = `${grade}A`;
    await runner.query(
      `INSERT INTO classes (name, grade, stream, school_id)
       SELECT $1, $2, 'General', $3
       WHERE NOT EXISTS (
         SELECT 1 FROM classes WHERE school_id = $3 AND grade = $2
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
    const { ensureDatabaseSchema } = require('../../../db/schemaEnsurer');
    await ensureDatabaseSchema().catch(() => {});
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

    const publicPayment = paymentHold.publicBank(school);
    if (isOffered) {
      return res.json({
        is_offered: true,
        school_id: school.id,
        school_name: school.name,
        language: requestedLanguage,
        offered_languages: offeredLangs,
        banking_details: publicPayment,
        application_fee: parseFloat(school.application_fee) || 250.00,
        registration_fee: parseFloat(school.registration_fee) || 1500.00,
        payments_waiting: !publicPayment.has_bank_account
      });
    }

    // School does not offer the requested Home Language -> Find referrals!
    const allSchools = await db.query(
      'SELECT id, name, slug, circuit, district, province, offered_languages FROM schools WHERE is_active = TRUE AND id != $1 ORDER BY name ASC',
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
    if (!ownsSchool(req, schoolId)) {
      return res.status(403).json({ error: 'You can only update your own school.' });
    }
    if (req.body.logo_url || req.body.badge_url) {
      return res.status(400).json({ error: 'Upload the school logo through the school logo control. A file path cannot be saved.' });
    }
    const {
      primary_color, secondary_color, accent_color, motto,
      contact_email, contact_phone, principal_name,
      curriculum_type, settings
    } = req.body;

    const query = `
      UPDATE schools
      SET 
        primary_color = COALESCE($1, primary_color),
        secondary_color = COALESCE($2, secondary_color),
        accent_color = COALESCE($3, accent_color),
        motto = COALESCE($4, motto),
        contact_email = COALESCE($5, contact_email),
        contact_phone = COALESCE($6, contact_phone),
        principal_name = COALESCE($7, principal_name),
        curriculum_type = COALESCE($8, curriculum_type),
        settings = COALESCE($9::jsonb, settings)
      WHERE id = $10
      RETURNING *;
    `;

    const result = await db.query(query, [
      primary_color, secondary_color, accent_color, motto,
      contact_email, contact_phone, principal_name,
      curriculum_type, settings ? JSON.stringify(settings) : null, schoolId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }

    res.json({
      success: true,
      message: 'School branding and settings updated successfully.',
      school: hideBankNumbers(result.rows[0])
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

    const checked = validateRegistration(req.body);
    if (!checked.ok) {
      return res.status(400).json({ error: checked.errors[0], errors: checked.errors });
    }
    const value = checked.value;
    const logo = schoolLogo.inspectLogo(req.file && req.file.buffer);
    if (!logo.ok) return res.status(400).json({ error: logo.error });

    const existingUser = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [value.principal_email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'That email already has a Geleza SA account. Use a different principal email.' });
    }
    const existingSchool = await db.query('SELECT id FROM schools WHERE emis_number = $1', [value.emis_number]);
    if (existingSchool.rows.length > 0) {
      return res.status(409).json({ error: `A school with EMIS ${value.emis_number} is already registered on Geleza SA.` });
    }
    const existingApp = await db.query(
      `SELECT application_number FROM school_applications
       WHERE status IN ('pending_review', 'under_review')
         AND (emis_number = $1 OR LOWER(principal_email) = LOWER($2))
       LIMIT 1`,
      [value.emis_number, value.principal_email]
    );
    if (existingApp.rows.length > 0) {
      return res.status(409).json({
        error: `An application (${existingApp.rows[0].application_number}) for this school or principal is already under executive review.`
      });
    }

    let storedLogo = null;
    try {
      storedLogo = schoolLogo.writeLogo(req.file.buffer, logo.kind);
      await db.query('ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS password_hash TEXT');
      await db.query('ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS logo_stored_name VARCHAR(80)');
      await ensureSchoolModuleColumns();
      const linkedModules = linkSchoolModules(value.teacher_modules, value.learner_modules);
      const appNumber = `GSA-SCH-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
      const payRef = `PAY-${crypto.randomBytes(4).toString('hex')}`;
      const createdApp = await withTransaction(async (client) => {
        const result = await client.query(
          `INSERT INTO school_applications (
            application_number, status, school_name, emis_number, province, district, circuit,
            physical_address, contact_email, contact_phone, curriculum_type, grade_range,
            offered_streams, offered_languages, offered_subjects,
            principal_first_name, principal_surname, principal_id_number, principal_sace_number,
            principal_email, principal_phone, motto, primary_color, secondary_color,
            application_fee_paid, registration_fee_paid, payment_status, payment_reference, password_hash,
            teacher_modules, learner_modules, logo_stored_name
          ) VALUES (
            $1, 'pending_review', $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16, $17, $18,
            $19, $20, $21, $22, $23,
            450.00, 1500.00, 'awaiting_bank', $24, $25,
            $26::jsonb, $27::jsonb, $28
          ) RETURNING *`,
          [
            appNumber, value.school_name, value.emis_number, value.province, value.district, value.circuit,
            value.physical_address, value.contact_email, value.contact_phone, value.curriculum_type, value.grade_range,
            value.offered_streams, value.offered_languages, value.offered_subjects,
            value.principal_first_name, value.principal_surname, value.principal_id_number, value.principal_sace_number,
            value.principal_email, value.principal_phone, value.motto, value.primary_color, value.secondary_color,
            payRef, null,
            JSON.stringify(linkedModules.teacher), JSON.stringify(linkedModules.learner), storedLogo
          ]
        );
        return result.rows[0];
      });

      emailService.sendSchoolApplicationReceivedNotice({
        principalEmail: createdApp.principal_email,
        principalName: `${createdApp.principal_first_name} ${createdApp.principal_surname}`,
        schoolName: createdApp.school_name,
        emisNumber: createdApp.emis_number,
        applicationNumber: createdApp.application_number
      }).catch((err) => {
        console.warn('[EMAIL NOTIFY] Could not send receipt email:', err.message);
      });

      res.status(201).json({
        success: true,
        message: 'The school registration is waiting for Geleza SA. The school is not active yet. After approval, the principal receives a single-use email link to create a password.',
        application_number: createdApp.application_number,
        application: publicApplication(createdApp)
      });
    } catch (error) {
      if (storedLogo) schoolLogo.removeLogo(storedLogo);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'This school or principal already has a registration in progress.' });
      }
      throw error;
    }
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
    if (!req.user?.is_superadmin) {
      return res.status(403).json({ error: 'Only Geleza SA platform administrators can review school admissions and registrations.' });
    }
    const { id } = req.params;
    const { decision, reason, executive_notes } = req.body;

    if (!['approve', 'decline', 'withdraw'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be approve, decline, or withdraw.' });
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
    if (app.status === 'withdrawn') {
      return res.status(409).json({ error: 'This school application was withdrawn.' });
    }

    if (decision === 'withdraw') {
      const withdrawn = await db.query(`
        UPDATE school_applications
        SET status = 'withdrawn',
            password_hash = NULL,
            declined_reason = $1,
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            executive_notes = $3,
            withdrawn_at = CURRENT_TIMESTAMP,
            last_activity_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND status IN ('pending_review', 'under_review')
        RETURNING application_number, status
      `, [reason || 'Withdrawn before a decision.', req.user?.id || null, executive_notes || null, id]);
      if (!withdrawn.rows.length) {
        return res.status(409).json({ error: 'This school application is no longer awaiting review.' });
      }
      return res.json({
        success: true,
        status: 'withdrawn',
        message: 'The application was withdrawn. Its decision record remains, and personal information is not removed while retention actions are off.'
      });
    }

    await ensureSchoolModuleColumns();
    await principalActivation.ensureColumns(db);
    const authorityReview = principalActivation.readAuthorityReview(req.body);

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

      const approved = await withTransaction(async (client) => {
        const locked = await client.query('SELECT * FROM school_applications WHERE id = $1 FOR UPDATE', [id]);
        const current = locked.rows[0];
        if (!current || !['pending_review', 'under_review'].includes(current.status)) {
          const error = new Error('This school application is no longer awaiting review.');
          error.status = 409;
          throw error;
        }
        const department = await client.query('SELECT id FROM departments ORDER BY id ASC LIMIT 1');
        if (!department.rows.length) {
          const error = new Error('School approval cannot be completed because no staff department exists.');
          error.status = 409;
          throw error;
        }
        const taken = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [current.principal_email]);
        if (taken.rows.length) {
          const error = new Error('That principal email already belongs to a Geleza SA account.');
          error.status = 409;
          throw error;
        }
        const schoolInsert = await client.query(`
        INSERT INTO schools (
          name, slug, domain, emis_number, circuit, district, province,
          physical_address, contact_email, contact_phone, principal_name,
          primary_color, secondary_color, motto, curriculum_type, grade_range,
          offered_streams, offered_languages, offered_subjects, sace_number, is_active,
          teacher_modules, learner_modules, logo_url, badge_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, TRUE, $21::jsonb, $22::jsonb, $23, $23)
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
          approvedModules ? JSON.stringify(approvedModules.learner) : null,
          schoolLogo.logoPublicPath(app.logo_stored_name)
        ]);
        const created = schoolInsert.rows[0];
        await ensureGradeClasses(created.id, client);
        const userInsert = await client.query(`
        INSERT INTO users (
          email, password_hash, role_id, school_id, is_superadmin,
          full_name, surname, id_number, phone, country
        )
        VALUES ($1, NULL, (SELECT id FROM roles WHERE name = 'admin'), $2, FALSE, $3, $4, $5, $6, 'South Africa')
        RETURNING id, email, full_name, surname, school_id;
      `, [
          app.principal_email, created.id,
          app.principal_first_name, app.principal_surname,
          app.principal_id_number, app.principal_phone
        ]);
        const activationToken = await principalActivation.issue(client, userInsert.rows[0].id);
        await client.query(`
        INSERT INTO employees (user_id, full_name, surname, department_id, school_id, phone, email)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
          userInsert.rows[0].id, current.principal_first_name, current.principal_surname,
          department.rows[0].id, created.id, current.principal_phone, current.principal_email
        ]);
        const marked = await client.query(`
        UPDATE school_applications
        SET status = 'approved',
            password_hash = NULL,
            reviewed_by = $1,
            reviewed_at = CURRENT_TIMESTAMP,
            executive_notes = $2,
            created_school_id = $3,
            authority_review = $4::jsonb
        WHERE id = $5 AND status IN ('pending_review', 'under_review')
        RETURNING id;
      `, [
          req.user?.id || null,
          executive_notes || 'Approved by Geleza SA Executive Board',
          created.id,
          JSON.stringify(authorityReview),
          id
        ]);
        if (!marked.rows.length) {
          const error = new Error('This school application is no longer awaiting review.');
          error.status = 409;
          throw error;
        }
        return { school: created, principal: userInsert.rows[0], activationToken };
      });

      const baseUrl = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null) || process.env.FRONTEND_URL || 'https://gelezasa.co.za';

      emailService.sendSchoolApplicationApprovedNotice({
        principalEmail: app.principal_email,
        principalName: `${app.principal_first_name} ${app.principal_surname}`,
        schoolName: app.school_name,
        emisNumber: app.emis_number,
        activationUrl: `${baseUrl}/activate?token=${encodeURIComponent(approved.activationToken)}`
      }).catch(() => {
        console.warn('[EMAIL NOTIFY] Could not send the principal invitation.');
      });

      return res.json({
        success: true,
        status: 'approved',
        message: `School "${app.school_name}" is ready. The principal must create a password from the invitation email.`,
        school: hideBankNumbers(approved.school)
      });
    } else {
      // Decline Application
      await db.query(`
        UPDATE school_applications
        SET status = 'declined',
            password_hash = NULL,
            declined_reason = $1,
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            executive_notes = $3,
            authority_review = $4::jsonb
        WHERE id = $5;
      `, [
        reason || 'Accreditation details could not be verified.',
        req.user?.id || null,
        executive_notes || null,
        JSON.stringify(authorityReview),
        id
      ]);
      if (app.logo_stored_name) schoolLogo.removeLogo(app.logo_stored_name);

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
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This school or principal email is already registered.' });
    }
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
    if (!ownsSchool(req, schoolId)) {
      return res.status(403).json({ error: 'You can only choose modules for your own school.' });
    }

    const rawTeacher = Array.isArray(req.body.teacher_modules) ? req.body.teacher_modules.map(String) : [];
    const rawLearner = Array.isArray(req.body.learner_modules) ? req.body.learner_modules.map(String) : [];

    const linked = linkSchoolModules(rawTeacher, rawLearner);
    const teacherModules = linked.teacher && linked.teacher.length > 0 ? linked.teacher : rawTeacher;
    const learnerModules = linked.learner && linked.learner.length > 0 ? linked.learner : rawLearner;

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
    res.status(500).json({ error: 'The modules could not be saved: ' + (err.message || 'Server error') });
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

exports.replaceSchoolLogo = async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    if (!ownsSchool(req, schoolId)) {
      return res.status(403).json({ error: 'You can only update your own school logo.' });
    }
    const logo = schoolLogo.inspectLogo(req.file && req.file.buffer);
    if (!logo.ok) return res.status(400).json({ error: logo.error });
    const current = await db.query('SELECT id, logo_url FROM schools WHERE id = $1', [schoolId]);
    if (!current.rows.length) return res.status(404).json({ error: 'School not found.' });
    const stored = schoolLogo.writeLogo(req.file.buffer, logo.kind);
    const publicPath = schoolLogo.logoPublicPath(stored);
    await db.query('UPDATE schools SET logo_url = $1, badge_url = $1 WHERE id = $2', [publicPath, schoolId]);
    const previous = String(current.rows[0].logo_url || '').split('/').pop();
    if (previous && previous !== stored) schoolLogo.removeLogo(previous);
    res.json({ success: true, logo_url: publicPath });
  } catch (err) {
    console.error('Error replacing school logo:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'The school logo could not be saved.' });
  }
};

exports.retentionDryRun = async (req, res) => {
  try {
    const report = await schoolRetention.dryRun(db);
    res.json(report);
  } catch (err) {
    console.error('Retention dry run failed:', err.message);
    res.status(500).json({ error: 'The retention report could not be prepared.' });
  }
};

exports.setApplicationHold = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const reason = String(req.body?.reason || '').replace(/[\u0000-\u001F]/g, '').slice(0, 500);
    const updated = await db.query(`
      UPDATE school_applications
      SET legal_hold = COALESCE($2, legal_hold),
          investigation_hold = COALESCE($3, investigation_hold),
          privacy_request_open = COALESCE($4, privacy_request_open),
          legal_hold_reason = CASE WHEN $2 IS TRUE THEN $5 ELSE legal_hold_reason END,
          investigation_hold_reason = CASE WHEN $3 IS TRUE THEN $5 ELSE investigation_hold_reason END,
          privacy_request_note = CASE WHEN $4 IS TRUE THEN $5 ELSE privacy_request_note END,
          last_activity_at = NOW()
      WHERE id = $1
      RETURNING id, application_number, legal_hold, investigation_hold, privacy_request_open
    `, [
      id,
      req.body?.legal_hold === undefined ? null : Boolean(req.body.legal_hold),
      req.body?.investigation_hold === undefined ? null : Boolean(req.body.investigation_hold),
      req.body?.privacy_request_open === undefined ? null : Boolean(req.body.privacy_request_open),
      reason
    ]);
    if (!updated.rows.length) return res.status(404).json({ error: 'Application not found.' });
    res.json({ success: true, application: updated.rows[0] });
  } catch (err) {
    console.error('Application hold could not be saved:', err.message);
    res.status(500).json({ error: 'The hold could not be saved.' });
  }
};

exports.schoolLogoFile = (req, res) => {
  const safe = schoolLogo.safeLogoName(req.params.name);
  const full = safe && schoolLogo.logoFilePath(safe);
  if (!full) return res.status(404).json({ error: 'Logo not found.' });
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'private, max-age=3600');
  res.type(schoolLogo.contentTypeFor(safe));
  res.sendFile(full);
};

async function parentHasChildAtSchool(userId, schoolId) {
  const result = await db.query(
    `SELECT 1
     FROM children c
     WHERE c.school_id::text = $2::text
       AND (
         c.parent_id::text = $1::text
         OR c.secondary_parent_id::text = $1::text
         OR EXISTS (
           SELECT 1 FROM parent_children pc
           WHERE pc.parent_id::text = $1::text AND pc.child_id::text = c.id::text
         )
       )
     LIMIT 1`,
    [String(userId), String(schoolId)]
  );
  return result.rows.length > 0;
}

exports.getAuthorisedPaymentAccount = async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    if (!schoolId) return res.status(400).json({ error: 'A school is required.' });
    const allowed = ownsSchool(req, schoolId) || await parentHasChildAtSchool(req.user.id, schoolId);
    if (!allowed) {
      return res.status(403).json({ error: 'You can only view payment details for a school you belong to.' });
    }
    const result = await db.query(
      `SELECT id, bank_name, account_holder, account_number, branch_code, account_type
       FROM schools WHERE id = $1`,
      [schoolId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'School not found.' });
    const bank = paymentHold.realBank(result.rows[0]);
    if (!bank) return res.json({ has_bank_account: false, banking_details: null });
    return res.json({ has_bank_account: true, banking_details: bank });
  } catch (err) {
    console.error('Authorised payment account failed:', err.message);
    res.status(500).json({ error: 'The payment account could not be loaded.' });
  }
};

exports.resendPrincipalActivation = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const appRes = await db.query('SELECT * FROM school_applications WHERE id = $1', [id]);
    const app = appRes.rows[0];
    if (!app || app.status !== 'approved' || !app.created_school_id) {
      return res.status(409).json({ error: 'An invitation can be sent only after this application has been approved.' });
    }
    const userRes = await db.query(
      `SELECT id, email, full_name, surname, school_id, password_hash, is_superadmin
       FROM users
       WHERE LOWER(email) = LOWER($1) AND school_id::text = $2::text
       LIMIT 1`,
      [app.principal_email, app.created_school_id]
    );
    const principal = userRes.rows[0];
    if (!principal || principal.is_superadmin) {
      return res.status(409).json({ error: 'The principal account for this school was not found.' });
    }
    if (principal.password_hash) {
      return res.status(409).json({ error: 'This principal has already created a password.' });
    }
    const token = await principalActivation.issue(db, principal.id);
    const baseUrl = req.headers.origin || process.env.FRONTEND_URL || 'https://gelezasa.co.za';
    await emailService.sendSchoolApplicationApprovedNotice({
      principalEmail: principal.email,
      principalName: `${principal.full_name || ''} ${principal.surname || ''}`.trim(),
      schoolName: app.school_name,
      emisNumber: app.emis_number,
      activationUrl: `${String(baseUrl).replace(/\/$/, '')}/activate?token=${encodeURIComponent(token)}`
    }).catch(() => {});
    return res.json({ success: true, message: 'A new invitation was sent. The previous link no longer works.' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Principal invitation resend failed.');
    res.status(500).json({ error: 'The invitation could not be sent.' });
  }
};

