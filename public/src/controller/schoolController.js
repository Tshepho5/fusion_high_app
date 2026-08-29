const db = require('../../../db/db');

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
    res.json(result.rows || []);
  } catch (err) {
    console.error('Error fetching schools:', err.message);
    res.status(500).json({ error: 'Failed to retrieve schools.' });
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
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching current school:', err.message);
    res.status(500).json({ error: 'Failed to retrieve current school.' });
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
