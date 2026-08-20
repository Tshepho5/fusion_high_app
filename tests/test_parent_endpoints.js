const db = require('../db/db');
const parentController = require('../public/src/controller/parentController');

async function testParentEndpoints() {
  try {
    const parentRes = await db.query(
      `SELECT u.id, u.email, u.full_name, u.surname 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE LOWER(r.name) = 'parent' 
       LIMIT 1`
    );
    if (parentRes.rows.length === 0) {
      console.log('No parent found.');
      process.exit(0);
    }
    const parent = parentRes.rows[0];
    console.log('Testing parent:', parent);

    const req = { user: { id: parent.id } };

    // 1. Test getChildren
    console.log('--- 1. Testing getChildren ---');
    const resChildren = {
      json: (data) => console.log('getChildren success! Count:', Array.isArray(data) ? data.length : data),
      status: (code) => ({ json: (err) => console.error('getChildren status', code, err) })
    };
    await parentController.getChildren(req, resChildren);

    // 2. Test getParentOverview
    console.log('--- 2. Testing getParentOverview ---');
    const resOverview = {
      json: (data) => console.log('getParentOverview success! Children:', data.children?.length),
      status: (code) => ({ json: (err) => console.error('getParentOverview status', code, err) })
    };
    await parentController.getParentOverview(req, resOverview);

    // 3. Test getChildrenDetailedOverview
    console.log('--- 3. Testing getChildrenDetailedOverview ---');
    const resDetailed = {
      json: (data) => console.log('getChildrenDetailedOverview success! Children:', data.children?.length),
      status: (code) => ({ json: (err) => console.error('getChildrenDetailedOverview status', code, err) })
    };
    await parentController.getChildrenDetailedOverview(req, resDetailed);

    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testParentEndpoints();
