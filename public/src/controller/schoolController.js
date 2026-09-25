const db = require('../../../db/db');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const { isControlLocked } = require('./systemController');

// Fallback seed data in case table is booting
const FALLBACK_SCHOOLS = [
  // 1. Limpopo (Polokwane & Mankweng - Capricorn South District)
  { id: 1, name: 'Geleza SA', slug: 'fusion-high', domain: 'geleza-sa.co.za', emis_number: '911220001', circuit: 'Polokwane Central Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'Polokwane Central, Limpopo, 0700', contact_email: 'admin@geleza-sa.co.za', contact_phone: '+27 15 291 0000', principal_name: 'Dr. T. Makola', logo_url: '/assets/schools/geleza-sa.svg', badge_url: '/assets/schools/geleza-sa.svg', primary_color: '#0284c7', secondary_color: '#06b6d4', accent_color: '#f59e0b', motto: 'Geleza Smart, The Future Is Thine', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
  { id: 2, name: 'Mountainview Senior Secondary School', slug: 'mountainview-high', domain: 'mountainview.co.za', emis_number: '923241054', circuit: 'Mankweng Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'Mankweng Unit B/C, Polokwane, 0727', contact_email: 'info@mountainviewhigh.co.za', contact_phone: '+27 15 267 1100', principal_name: 'Mr. M. S. Phasha', logo_url: '/assets/schools/mountainview-high.svg', badge_url: '/assets/schools/mountainview-high.svg', primary_color: '#7A1426', secondary_color: '#D4AF37', accent_color: '#F59E0B', motto: 'Strive for Excellence', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
  { id: 3, name: 'Makgoka High School', slug: 'makgoka-high', domain: 'makgoka.co.za', emis_number: '923240457', circuit: 'Molepo Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'Maclean Farm, Boyne, Mankweng Area, 0727', contact_email: 'admin@makgoka.co.za', contact_phone: '+27 15 266 0022', principal_name: 'Mrs. K. E. Molepo', logo_url: '/assets/schools/makgoka-high.svg', badge_url: '/assets/schools/makgoka-high.svg', primary_color: '#065f46', secondary_color: '#10b981', accent_color: '#fbbf24', motto: 'Thuto Ke Lesedi', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
  { id: 4, name: 'Turfloop High School', slug: 'turfloop-high', domain: 'turfloop.co.za', emis_number: '923240890', circuit: 'Mankweng Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'University Road, Turfloop, Mankweng, 0727', contact_email: 'principal@turfloophigh.co.za', contact_phone: '+27 15 267 3300', principal_name: 'Mr. N. J. Mamabolo', logo_url: '/assets/schools/turfloop-high.svg', badge_url: '/assets/schools/turfloop-high.svg', primary_color: '#1e1b4b', secondary_color: '#4338ca', accent_color: '#991b1b', motto: 'Education for Progress', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
  { id: 5, name: 'Hwiti High School', slug: 'hwiti-high', domain: 'hwiti.co.za', emis_number: '923240150', circuit: 'Mankweng Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: '118 Zone 1, Hwiti St, Mankweng/Sovenga, 0727', contact_email: 'info@hwitisecondary.co.za', contact_phone: '+27 15 267 4400', principal_name: 'Mrs. R. M. Ramokgopa', logo_url: '/assets/schools/hwiti-high.svg', badge_url: '/assets/schools/hwiti-high.svg', primary_color: '#581c87', secondary_color: '#9333ea', accent_color: '#06b6d4', motto: 'Tsebo Ke Maatla', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
  { id: 6, name: 'Ngwana Mohube Secondary School', slug: 'ngwana-mohube', domain: 'ngwanamohube.co.za', emis_number: '923260994', circuit: 'Mankweng Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'Gamphahlele, Seleteng, Limpopo, 0734', contact_email: 'admin@ngwanamohube.co.za', contact_phone: '+27 15 267 5500', principal_name: 'Mr. S. P. Mohube', logo_url: '/assets/schools/ngwana-mohube.svg', badge_url: '/assets/schools/ngwana-mohube.svg', primary_color: '#991b1b', secondary_color: '#ef4444', accent_color: '#0f172a', motto: 'Thuto Ke Maatla', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
  
  // 2. Gauteng (Lotus Gardens & Atteridgeville, Pretoria - GDE)
  { id: 7, name: 'Fusion Secondary School (Lotus Gardens)', slug: 'fusion-secondary-lotus', domain: 'fusionsecondary.co.za', emis_number: '700232348', circuit: 'Tshwane West District', district: 'Tshwane West', province: 'Gauteng', physical_address: '809 Cyme Crescent, Lotus Gardens, Pretoria, 0008', contact_email: 'admin@fusionsecondary.co.za', contact_phone: '+27 12 373 0000', principal_name: 'Dr. T. Makola', logo_url: '/assets/schools/fusion-secondary-lotus.svg', badge_url: '/assets/schools/fusion-secondary-lotus.svg', primary_color: '#4f46e5', secondary_color: '#06b6d4', accent_color: '#f59e0b', motto: 'Innovate, Aspire, Achieve', curriculum_type: 'CAPS (GDE Gauteng)', grade_range: '8-12', is_active: true },
  { id: 8, name: 'Saulridge Secondary School', slug: 'saulridge-secondary', domain: 'saulridge.co.za', emis_number: '700232223', circuit: 'Tshwane South District (D4)', district: 'Tshwane South', province: 'Gauteng', physical_address: 'Ramokgopa St, Saulsville, Atteridgeville, Pretoria, 0008', contact_email: 'info@saulridge.co.za', contact_phone: '+27 12 375 6000', principal_name: 'Mr. K. E. Masemola', logo_url: '/assets/schools/saulridge-secondary.svg', badge_url: '/assets/schools/saulridge-secondary.svg', primary_color: '#1e3a8a', secondary_color: '#f59e0b', accent_color: '#3b82f6', motto: 'Knowledge is Power', curriculum_type: 'CAPS (GDE Gauteng)', grade_range: '8-12', is_active: true },
  { id: 9, name: 'Phelindaba Secondary School', slug: 'phelindaba-secondary', domain: 'phelindaba.co.za', emis_number: '700232124', circuit: 'Tshwane South District (D4)', district: 'Tshwane South', province: 'Gauteng', physical_address: 'Kgwale St, Atteridgeville, Pretoria, 0008', contact_email: 'admin@phelindaba.co.za', contact_phone: '+27 12 373 8100', principal_name: 'Mrs. M. T. Sithole', logo_url: '/assets/schools/phelindaba-secondary.svg', badge_url: '/assets/schools/phelindaba-secondary.svg', primary_color: '#14532d', secondary_color: '#eab308', accent_color: '#10b981', motto: 'Strive for Success', curriculum_type: 'CAPS (GDE Gauteng)', grade_range: '8-12', is_active: true },
  { id: 10, name: 'Flavius Mareka Secondary School', slug: 'flavius-mareka', domain: 'flaviusmareka.co.za', emis_number: '700231670', circuit: 'Tshwane South District (D4)', district: 'Tshwane South', province: 'Gauteng', physical_address: 'Khoza St, Atteridgeville, Pretoria, 0008', contact_email: 'principal@flaviusmareka.co.za', contact_phone: '+27 12 373 9200', principal_name: 'Mr. L. N. Maluleke', logo_url: '/assets/schools/flavius-mareka.svg', badge_url: '/assets/schools/flavius-mareka.svg', primary_color: '#1d4ed8', secondary_color: '#38bdf8', accent_color: '#fbbf24', motto: 'Excellence in Action', curriculum_type: 'CAPS (GDE Gauteng)', grade_range: '8-12', is_active: true },
  { id: 11, name: 'Dr. W.F. Nkomo Secondary School', slug: 'wf-nkomo-secondary', domain: 'wfnkomo.co.za', emis_number: '700231613', circuit: 'Tshwane South District (D4)', district: 'Tshwane South', province: 'Gauteng', physical_address: '84 Khudu St, Atteridgeville, Pretoria, 0008', contact_email: 'info@wfnkomo.co.za', contact_phone: '+27 12 375 7300', principal_name: 'Mr. D. M. Ndlovu', logo_url: '/assets/schools/wf-nkomo-secondary.svg', badge_url: '/assets/schools/wf-nkomo-secondary.svg', primary_color: '#881337', secondary_color: '#f43f5e', accent_color: '#fbbf24', motto: 'Labor Omnia Vincit', curriculum_type: 'CAPS (GDE Gauteng)', grade_range: '8-12', is_active: true },
  { id: 12, name: 'Hofmeyr Secondary School', slug: 'hofmeyr-secondary', domain: 'hofmeyr.co.za', emis_number: '700231746', circuit: 'Tshwane South District (D4)', district: 'Tshwane South', province: 'Gauteng', physical_address: '1 Mngadi and Mafole St, Atteridgeville, Pretoria, 0008', contact_email: 'admin@hofmeyr.co.za', contact_phone: '+27 12 373 7400', principal_name: 'Mrs. S. R. Mogale', logo_url: '/assets/schools/hofmeyr-secondary.svg', badge_url: '/assets/schools/hofmeyr-secondary.svg', primary_color: '#581c87', secondary_color: '#14b8a6', accent_color: '#f59e0b', motto: 'Education for Liberation', curriculum_type: 'CAPS (GDE Gauteng)', grade_range: '8-12', is_active: true }
];

/**
 * Returns all active enrolled schools with real live database counts.
 */
exports.getAllSchools = async (req, res) => {
  try {
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
      WHERE s.is_active = TRUE
      ORDER BY s.id ASC;
    `;
    const result = await db.query(query);
    if (result.rows && result.rows.length > 0) {
      return res.json(result.rows);
    }
    return res.json(FALLBACK_SCHOOLS);
  } catch (err) {
    console.error('Error fetching schools, using fallback list:', err.message);
    res.json(FALLBACK_SCHOOLS);
  }
};

/**
 * Returns details & branding for the current active school with real database counts.
 * Resolves by query param `school_id`, header `x-school-id`, or user profile school_id.
 */
exports.getCurrentSchool = async (req, res) => {
  try {
    const requestedId = req.query.school_id || req.headers['x-school-id'] || req.user?.school_id || 1;
    const requestedSlug = req.query.slug || req.headers['x-school-slug'];

    let query = `
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
      WHERE s.is_active = TRUE 
    `;
    let params = [];

    if (requestedSlug) {
      query += `AND s.slug = $1 LIMIT 1;`;
      params = [requestedSlug];
    } else {
      const parsedId = parseInt(requestedId, 10);
      if (!isNaN(parsedId) && parsedId > 0) {
        query += `AND (s.id = $1::integer OR s.id = 1) ORDER BY (s.id = $1::integer) DESC LIMIT 1;`;
        params = [parsedId];
      } else {
        query += `AND (s.slug = $1::text OR s.id = 1) ORDER BY (s.slug = $1::text) DESC LIMIT 1;`;
        params = [String(requestedId)];
      }
    }

    const result = await db.query(query, params);
    if (result.rows && result.rows.length > 0) {
      return res.json(result.rows[0]);
    }
    const matched = FALLBACK_SCHOOLS.find(s => String(s.id) === String(requestedId) || s.slug === requestedSlug) || FALLBACK_SCHOOLS[0];
    res.json(matched);
  } catch (err) {
    console.error('Error fetching current school, using fallback:', err.message);
    const matched = FALLBACK_SCHOOLS[0];
    res.json(matched);
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
    const schoolId = parseInt(req.params.id || req.user?.school_id || 1, 10);
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
      payment_reference
    } = req.body;

    // Strict input validation
    if (!school_name || !school_name.trim()) {
      return res.status(400).json({ error: 'Official school name is strictly required.' });
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
    const passHash = password && password.trim().length >= 6 ? await bcrypt.hash(password.trim(), 10) : null;

    const insertQuery = `
      INSERT INTO school_applications (
        application_number, status, school_name, emis_number, province, district, circuit,
        physical_address, contact_email, contact_phone, curriculum_type, grade_range,
        offered_streams, offered_languages, offered_subjects,
        principal_first_name, principal_surname, principal_id_number, principal_sace_number,
        principal_email, principal_phone, motto, primary_color, secondary_color,
        application_fee_paid, registration_fee_paid, payment_status, payment_reference, password_hash
      )
      VALUES (
        $1, 'pending_review', $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22, $23,
        $24, $25, 'paid', $26, $27
      )
      RETURNING *;
    `;

    const result = await db.query(insertQuery, [
      appNumber, school_name.trim(), cleanEmis, province.trim(), district.trim(), circuit ? circuit.trim() : null,
      physical_address.trim(), (contact_email || principal_email || '').trim().toLowerCase(), (contact_phone || principal_phone || '').trim(), curriculum_type || 'CAPS (DBE)', grade_range || '8-12',
      offered_streams || ['General', 'Science'], offered_languages || ['English FAL'], offered_subjects || [],
      firstName, surname, cleanId, (principal_sace_number || req.body.principal_sace || '').toString().trim() || null,
      principal_email.trim().toLowerCase(), principal_phone.trim(), (motto || 'Excellence in Education').trim(), primary_color || '#0284c7', secondary_color || '#06b6d4',
      parseFloat(application_fee_paid) || 450.00, parseFloat(registration_fee_paid) || 1500.00, payRef, passHash
    ]);

    const createdApp = result.rows[0];

    // Trigger instant email confirmation to Principal
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
      message: 'School application submitted successfully. It has been placed in the Geleza SA Executive Accreditation Queue.',
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
    res.json(result.rows);
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

    if (decision === 'approve') {
      // 1. Generate unique slug for school
      let slug = app.school_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existingSlug = await db.query('SELECT id FROM schools WHERE slug = $1', [slug]);
      if (existingSlug.rows.length > 0) {
        slug = `${slug}-${app.emis_number.slice(-4)}`;
      }

      // 2. Insert into schools table
      const schoolInsert = await db.query(`
        INSERT INTO schools (
          name, slug, domain, emis_number, circuit, district, province,
          physical_address, contact_email, contact_phone, principal_name,
          primary_color, secondary_color, motto, curriculum_type, grade_range,
          offered_streams, offered_languages, offered_subjects, sace_number, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, TRUE)
        RETURNING *;
      `, [
        app.school_name, slug, `${slug}.co.za`, app.emis_number, app.circuit, app.district, app.province,
        app.physical_address, app.contact_email, app.contact_phone, `${app.principal_first_name} ${app.principal_surname}`,
        app.primary_color || '#0284c7', app.secondary_color || '#06b6d4', app.motto || 'Excellence in Education',
        app.curriculum_type || 'CAPS (DBE)', app.grade_range || '8-12',
        app.offered_streams || ['General', 'Science', 'Commerce', 'Tourism'],
        app.offered_languages || ['English FAL', 'Sepedi Home Language'],
        app.offered_subjects || [], app.principal_sace_number
      ]);

      const newSchool = schoolInsert.rows[0];

      // 3. Create or Update Principal user account
      let passHash = app.password_hash;
      if (!passHash) {
        const tempPassword = 'password123';
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
        VALUES ($1, $2, $3, 1, $4, $5, $6)
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
        temporaryPassword: app.password_hash ? undefined : 'password123',
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

