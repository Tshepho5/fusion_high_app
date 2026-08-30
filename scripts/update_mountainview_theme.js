const db = require('../db/db');

async function updateMountainviewTheme() {
  try {
    console.log('--- UPDATING MOUNTAINVIEW SENIOR SECONDARY SCHOOL THEME ---');
    const updateRes = await db.query(`
      UPDATE schools 
      SET 
        primary_color = '#7A1426',
        secondary_color = '#D4AF37',
        accent_color = '#F59E0B',
        settings = jsonb_set(
          COALESCE(settings, '{}'::jsonb),
          '{theme_description}',
          '"Maroon and Gold: The predominant colors of the school uniform are maroon and gold."'::jsonb
        )
      WHERE slug = 'mountainview-high' OR id = 2
      RETURNING id, name, slug, primary_color, secondary_color, accent_color, settings;
    `);

    console.log('✅ Mountainview Updated Successfully:', updateRes.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating Mountainview theme:', err.message);
    process.exit(1);
  }
}

updateMountainviewTheme();
