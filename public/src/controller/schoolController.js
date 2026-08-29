const db = require('../../../db/db');

// Fallback seed data in case table is booting
const FALLBACK_SCHOOLS = [
  { id: 1, name: 'Fusion High School', slug: 'fusion-high', domain: 'fusion-high.co.za', emis_number: '911220001', circuit: 'Polokwane Central Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'Polokwane Central, Limpopo, 0700', contact_email: 'admin@fusionhigh.co.za', contact_phone: '+27 15 291 0000', principal_name: 'Dr. T. Makola', primary_color: '#4f46e5', secondary_color: '#06b6d4', accent_color: '#f59e0b', motto: 'Innovate, Lead, Transform', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
  { id: 2, name: 'Mountainview Senior Secondary School', slug: 'mountainview-high', domain: 'mountainview.co.za', emis_number: '911220452', circuit: 'Mankweng Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'Mankweng Unit C, Polokwane, 0727', contact_email: 'info@mountainviewhigh.co.za', contact_phone: '+27 15 267 1100', principal_name: 'Mr. M. S. Phasha', primary_color: '#1e40af', secondary_color: '#3b82f6', accent_color: '#f59e0b', motto: 'Strive for Excellence', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
  { id: 3, name: 'Makgoka High School', slug: 'makgoka-high', domain: 'makgoka.co.za', emis_number: '911220411', circuit: 'Molepo Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'Ga-Molepo, Mankweng Area, Polokwane, 0727', contact_email: 'admin@makgoka.co.za', contact_phone: '+27 15 267 2200', principal_name: 'Mrs. K. E. Molepo', primary_color: '#065f46', secondary_color: '#10b981', accent_color: '#fbbf24', motto: 'Knowledge is Light', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
  { id: 4, name: 'Turfloop High School', slug: 'turfloop-high', domain: 'turfloop.co.za', emis_number: '911220612', circuit: 'Mankweng Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'University Road, Turfloop, Mankweng, 0727', contact_email: 'principal@turfloophigh.co.za', contact_phone: '+27 15 267 3300', principal_name: 'Mr. N. J. Mamabolo', primary_color: '#1e1b4b', secondary_color: '#4338ca', accent_color: '#991b1b', motto: 'Education for Progress', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
  { id: 5, name: 'Hwiti High School', slug: 'hwiti-high', domain: 'hwiti.co.za', emis_number: '911220323', circuit: 'Mankweng Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'Sovenga Zone 1, Mankweng, Polokwane, 0727', contact_email: 'info@hwitisecondary.co.za', contact_phone: '+27 15 267 4400', principal_name: 'Mrs. R. M. Ramokgopa', primary_color: '#581c87', secondary_color: '#9333ea', accent_color: '#06b6d4', motto: 'Perseverance Conquers', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true },
  { id: 6, name: 'Ngwana Mohube Secondary School', slug: 'ngwana-mohube', domain: 'ngwanamohube.co.za', emis_number: '911220501', circuit: 'Mankweng Circuit', district: 'Capricorn South', province: 'Limpopo', physical_address: 'Segopje Village, Mankweng Area, Polokwane, 0727', contact_email: 'admin@ngwanamohube.co.za', contact_phone: '+27 15 267 5500', principal_name: 'Mr. S. P. Mohube', primary_color: '#991b1b', secondary_color: '#ef4444', accent_color: '#0f172a', motto: 'Forward in Excellence', curriculum_type: 'CAPS (DBE Limpopo)', grade_range: '8-12', is_active: true }
];

/**
 * Returns all active enrolled schools across Mankweng, Polokwane, and Limpopo.
 */
exports.getAllSchools = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, name, slug, domain, emis_number, circuit, district, province,
        physical_address, contact_email, contact_phone, principal_name,
        logo_url, badge_url, primary_color, secondary_color, accent_color,
        motto, curriculum_type, grade_range, is_active, settings
      FROM schools
      WHERE is_active = TRUE
      ORDER BY id ASC;
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
 * Returns details & branding for the current active school.
 * Resolves by query param `school_id`, header `x-school-id`, or user profile school_id.
 */
exports.getCurrentSchool = async (req, res) => {
  try {
    const requestedId = req.query.school_id || req.headers['x-school-id'] || req.user?.school_id || 1;
    const requestedSlug = req.query.slug || req.headers['x-school-slug'];

    let query = `SELECT * FROM schools WHERE is_active = TRUE `;
    let params = [];

    if (requestedSlug) {
      query += `AND slug = $1 LIMIT 1;`;
      params = [requestedSlug];
    } else {
      query += `AND (id = $1 OR id = 1) ORDER BY (id = $1) DESC LIMIT 1;`;
      params = [parseInt(requestedId, 10) || 1];
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
 * Retrieves a single school by slug (e.g. 'makgoka-high', 'mountainview-high').
 */
exports.getSchoolBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await db.query(`SELECT * FROM schools WHERE slug = $1 AND is_active = TRUE`, [slug]);
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
