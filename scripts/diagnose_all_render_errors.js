const db = require('../db/db');

async function diagnose() {
  try {
    console.log('=== 1. CHECKING COLUMN TYPES FOR school_id, role_id, id ===');
    const cols = await db.query(`
      SELECT table_name, column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE column_name IN ('school_id', 'role_id', 'id')
        AND table_schema = 'public'
      ORDER BY table_name, column_name;
    `);
    console.table(cols.rows);

    console.log('=== 2. CHECKING DASHBOARD STATS QUERY ===');
    const adminController = require('../public/src/controller/adminController');
    const fakeReq = { query: {}, headers: {}, user: { role: 'admin', is_superadmin: true, school_id: 1 } };
    const fakeRes = {
      json: (d) => console.log('Dashboard Stats Success:', Object.keys(d)),
      status: (c) => ({ json: (e) => console.error('Dashboard Stats Error:', c, e) })
    };
    await adminController.getDashboardStats(fakeReq, fakeRes);

    console.log('=== 3. CHECKING getAllSchoolAdmins QUERY ===');
    const fakeAdminRes = {
      json: (d) => console.log('Admins Success:', d.admins?.length),
      status: (c) => ({ json: (e) => console.error('Admins Error:', c, e) })
    };
    await adminController.getAllSchoolAdmins(fakeReq, fakeAdminRes);

    console.log('=== 4. CHECKING getAllSchools QUERY ===');
    const schoolController = require('../public/src/controller/schoolController');
    const fakeSchoolRes = {
      json: (d) => console.log('Schools Success:', d.length),
      status: (c) => ({ json: (e) => console.error('Schools Error:', c, e) })
    };
    await schoolController.getAllSchools(fakeReq, fakeSchoolRes);

    process.exit(0);
  } catch (err) {
    console.error('Fatal Diagnostic Error:', err);
    process.exit(1);
  }
}

diagnose();
