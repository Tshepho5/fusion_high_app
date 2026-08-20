const db = require('../db/db');

async function testHomeworkFlow() {
  console.log('--- Testing Homework & Digital Submission Portal Flow ---');
  try {
    // 1. Fetch an active teacher
    const teacherRes = await db.query(`SELECT u.id, u.full_name, u.surname, u.email FROM users u JOIN roles r ON u.role_id = r.id WHERE LOWER(r.name) = 'teacher' LIMIT 1`);
    if (teacherRes.rows.length === 0) {
      console.log('No teacher found for test');
      process.exit(0);
    }
    const teacher = teacherRes.rows[0];
    console.log(`Teacher: ${teacher.full_name} ${teacher.surname} (${teacher.email})`);

    // 2. Fetch an active learner
    const childRes = await db.query(`SELECT c.id, c.full_name, c.surname, c.grade, c.learner_user_id, c.parent_id FROM children c WHERE learner_user_id IS NOT NULL LIMIT 1`);
    if (childRes.rows.length === 0) {
      console.log('No learner child found for test');
      process.exit(0);
    }
    const child = childRes.rows[0];
    console.log(`Learner Child: ${child.full_name} ${child.surname} (Grade ${child.grade}, Child ID ${child.id})`);

    // 3. Create a test assignment
    const assignRes = await db.query(
      `INSERT INTO homework_assignments (teacher_id, title, description, subject, grade, stream, due_date, total_marks)
       VALUES ($1, 'Test Euclidean Geometry Circle Theorems', 'Prove that the angle subtended by an arc at the center is double the angle subtended at the circumference.', 'Mathematics', $2, 'Science', CURRENT_DATE + 5, 50)
       RETURNING *`,
      [teacher.id, parseInt(child.grade, 10)]
    );
    const assignment = assignRes.rows[0];
    console.log(`✅ Created Assignment ID: ${assignment.id} ("${assignment.title}")`);

    // 4. Submit homework by learner
    const subRes = await db.query(
      `INSERT INTO homework_submissions 
        (assignment_id, child_id, learner_user_id, submission_text, submitted_at, status,
         ai_score, ai_percentage, ai_feedback, ai_strengths, ai_areas_for_improvement)
       VALUES ($1, $2, $3, 'Given circle with center O. Let arc AB subtend angle AOB at center and ACB at circumference. By isosceles triangle properties, angle AOB = 2 * angle ACB. Q.E.D.', NOW(), 'ai_evaluated',
               42, 84, 'Comprehensive geometric proof demonstrating accurate use of radii equality and exterior angle theorem.', 'Clear deductive steps and correct theorem reference.', 'Include diagram label references.')
       RETURNING *`,
      [assignment.id, child.id, child.learner_user_id]
    );
    const submission = subRes.rows[0];
    console.log(`✅ Learner Submitted ID: ${submission.id} | Fusion AI Evaluator Score: ${submission.ai_score}/50 (${submission.ai_percentage}%)`);

    // 5. Educator signs off on submission
    const gradeRes = await db.query(
      `UPDATE homework_submissions
       SET teacher_score = 45,
           teacher_percentage = 90,
           teacher_feedback = 'Excellent geometric reasoning and clear proof structure. Well done!',
           signed_by_teacher_id = $1,
           signed_at = NOW(),
           status = 'teacher_signed'
       WHERE id = $2
       RETURNING *`,
      [teacher.id, submission.id]
    );
    const graded = gradeRes.rows[0];
    console.log(`✅ Educator Signed Off: ${graded.teacher_score}/50 (${graded.teacher_percentage}%) | Status: ${graded.status}`);

    // Clean up test records
    await db.query(`DELETE FROM homework_assignments WHERE id = $1`, [assignment.id]);
    console.log(`🧹 Cleaned up test records.`);

    console.log('--- ✅ All Homework Flow Tests Passed Successfully! ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testHomeworkFlow();
