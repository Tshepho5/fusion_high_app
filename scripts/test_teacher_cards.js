const teacherOverviewController = require('../public/src/controller/teacher/teacherOverviewController');

async function testTeacherCards() {
  try {
    console.log('--- Testing User 2 (Physical Sciences) ---');
    const req2 = { user: { id: 2, school_id: 1 } };
    const res2 = {
      json: (data) => {
        console.log(`User 2 Cards count: ${data.length}`);
        data.forEach(c => console.log(`  Subject: ${c.subject_name}, Grade: ${c.grade}, Class: ${c.class_name}`));
      },
      status: (code) => ({ json: (err) => console.error('Error:', code, err) })
    };
    await teacherOverviewController.getMySubjectsOverview(req2, res2);

    console.log('\n--- Testing User 6 (English FAL / Home Language) ---');
    const req6 = { user: { id: 6, school_id: 1 } };
    const res6 = {
      json: (data) => {
        console.log(`User 6 Cards count: ${data.length}`);
        data.forEach(c => console.log(`  Subject: ${c.subject_name}, Grade: ${c.grade}, Class: ${c.class_name}`));
      },
      status: (code) => ({ json: (err) => console.error('Error:', code, err) })
    };
    await teacherOverviewController.getMySubjectsOverview(req6, res6);
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    process.exit(0);
  }
}

testTeacherCards();
