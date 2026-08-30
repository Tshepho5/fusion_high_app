const db = require('../../../db/db');

// Fallback seed data in case table is booting
const FALLBACK_SCHOOLS = [
  // 1. Limpopo (Polokwane & Mankweng - Capricorn South District)
  { id: 1, name: 'Fusion High School', slug: 'fusion-high', domain: 'fusion-high.co.za', emis_number: '911220001', circuit: 'Polokwane Central Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'Polokwane Central, Limpopo, 0700', contact_email: 'admin@fusionhigh.co.za', contact_phone: '+27 15 291 0000', principal_name: 'Dr. T. Makola', logo_url: '/assets/schools/fusion-high.svg', badge_url: '/assets/schools/fusion-high.svg', primary_color: '#4f46e5', secondary_color: '#06b6d4', accent_color: '#f59e0b', motto: 'Innovate, Lead, Transform', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
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
