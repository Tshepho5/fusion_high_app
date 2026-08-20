const db = require('../db/db');
const parentController = require('../public/src/controller/parentController');

async function runTest() {
  try {
    console.log('--- Testing Parent AI Performance Engine ---');
    // Find an existing child in database
    const childRes = await db.query('SELECT id, full_name, surname, grade, subjects FROM children ORDER BY id ASC LIMIT 1');
    if (childRes.rows.length === 0) {
      console.log('No children in DB to test.');
      process.exit(0);
    }
    const testChild = childRes.rows[0];
    console.log(`Found child in DB: ID ${testChild.id} - ${testChild.full_name} ${testChild.surname} (Grade ${testChild.grade})`);

    // Find parent of this child
    const parentRes = await db.query('SELECT parent_id FROM children WHERE id = $1', [testChild.id]);
    const parentId = parentRes.rows[0]?.parent_id || 1;

    const req = {
      user: { id: parentId, role: 'parent' },
      query: { childId: testChild.id }
    };

    const res = {
      json: (data) => {
        console.log('\n--- Parent Child Performance API Result ---');
        console.log('Child Name:', data.name);
        console.log('Current Overall Average:', data.average_mark + '%');
        console.log('AI Predicted Final Mark:', data.predicted_final_mark + '%');
        console.log('Total Enrolled Subjects:', data.total_subjects);
        console.log('Completed Assessments Logged:', data.completed_assessments);
        console.log('Attendance Impact:', data.attendance_impact);
        console.log('\nSubject Breakdown (First 3):');
        console.log(data.subject_performance_table.slice(0, 3));
        console.log('\nDynamic Strengths:', data.strengths);
        console.log('\nDynamic Areas for Improvement:', data.areas_for_improvement);
        process.exit(0);
      },
      status: (code) => ({
        json: (err) => {
          console.error(`Status ${code} Error:`, err);
          process.exit(1);
        }
      })
    };

    await parentController.getChildPerformanceOverview(req, res);
  } catch (err) {
    console.error('Test Execution Error:', err);
    process.exit(1);
  }
}

runTest();
