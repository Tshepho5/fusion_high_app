const db = require('../db/db');
const adminController = require('../public/src/controller/adminController');

async function test() {
  try {
    console.log('--- TESTING SUBADMIN CREATION ---');
    
    // Check school id for Mountainview
    const schRes = await db.query("SELECT id, name FROM schools WHERE name ILIKE '%Mountainview%' OR slug = 'mountainview-high'");
    console.log('Found schools:', schRes.rows);
    const targetSchoolId = schRes.rows[0]?.id || 2;

    const mockReq = {
      user: { id: 1, role: 'admin', is_superadmin: true },
      body: {
        school_id: targetSchoolId,
        full_name: 'Butcher',
        surname: 'Masemola',
        email: 'tshepomakola22@gmail.com',
        phone: '0729391381',
        id_number: '0209205494088',
        password: 'Admin@2026'
      },
      get: (header) => 'https://educonnect-cmyh.onrender.com',
      protocol: 'https'
    };

    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log('Response JSON (Status ' + this.statusCode + '):', data);
        return this;
      }
    };

    // First check if user exists already and delete for test if needed
    await db.query("DELETE FROM users WHERE email = 'tshepomakola22@gmail.com' AND full_name = 'Butcher'");

    console.log('Calling createSchoolAdmin...');
    await adminController.createSchoolAdmin(mockReq, mockRes);
    process.exit(0);
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
}

test();
