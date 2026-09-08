const timetableController = require('../public/src/controller/timetableController');
const db = require('../db/db');

async function testGenerateTimetables() {
  try {
    const req = {
      user: { id: 1, school_id: 1, role: 'admin' },
      body: {}
    };
    const res = {
      json: (data) => {
        console.log('Timetable Generation Response:', data.message);
        console.log(`Total grades generated: ${data.total_grades}`);
      },
      status: (code) => ({
        json: (err) => console.error(`Error ${code}:`, err)
      })
    };

    await timetableController.generateSchoolWideTimetable(req, res);

    // Verify generated timetables in DB
    const ttRes = await db.query('SELECT id, name, grade, stream, timetable_data FROM timetables WHERE school_id = 1 AND is_active = TRUE ORDER BY grade');
    console.log(`\nFound ${ttRes.rows.length} active timetables in database:`);
    
    for (const row of ttRes.rows) {
      console.log(`\n=== ${row.name} (Grade ${row.grade}) ===`);
      const data = typeof row.timetable_data === 'string' ? JSON.parse(row.timetable_data) : row.timetable_data;
      const classNames = Object.keys(data || {});
      console.log(`Classes: ${classNames.join(', ')}`);
      
      for (const cName of classNames) {
        const mondaySlots = data[cName]?.Monday || {};
        const teachersInMonday = Object.keys(mondaySlots).map(p => `${mondaySlots[p]?.subject} (${mondaySlots[p]?.teacher})`);
        console.log(`  Class ${cName} (Monday): ${teachersInMonday.slice(0, 3).join(' | ')}`);
      }
    }
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    process.exit(0);
  }
}

testGenerateTimetables();
