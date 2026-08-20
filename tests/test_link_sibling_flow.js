const db = require('../db/db');
const { generateOfficialLearnerNumber } = require('../public/src/controller/authController');
const curriculumService = require('../public/src/services/curriculumService');
const bcrypt = require('bcryptjs');

async function testLinkSiblingFlow() {
  console.log('--- Testing Link / Enroll Sibling Internal Flow ---');
  try {
    // 1. Fetch active parent
    const parentRes = await db.query(
      `SELECT u.id, u.email, u.full_name, u.surname 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE LOWER(r.name) = 'parent' 
       LIMIT 1`
    );
    if (parentRes.rows.length === 0) {
      console.log('No parent found in database for test.');
      process.exit(0);
    }
    const parent = parentRes.rows[0];
    console.log(`Parent: ${parent.full_name} ${parent.surname} (${parent.email}, ID ${parent.id})`);

    // 2. Generate credentials using established ID skip rule
    const lrnNumber = await generateOfficialLearnerNumber();
    const siblingFirstName = 'Lesedi';
    const siblingSurname = parent.surname || 'Makola';
    const sampleIdNumber = '0805145028082';
    // Index 0 ('0'), Index 3 ('5'), Index 6 ('5'), Index 9 ('2'), Index 12 ('2') -> '05522'
    const generatedPassword = `${sampleIdNumber.charAt(0)}${sampleIdNumber.charAt(3)}${sampleIdNumber.charAt(6)}${sampleIdNumber.charAt(9)}${sampleIdNumber.charAt(12)}`;
    const learnerEmail = `${lrnNumber}@fusion.high`;

    console.log(`Generated Learner Number: ${lrnNumber}`);
    console.log(`Generated Login Email: ${learnerEmail}`);
    console.log(`Generated Password: ${generatedPassword}`);

    // 3. Verify subjects for Grade 8
    const grade8Subjects = curriculumService.getSubjectsForGradeAndStream(8, 'General', 'isiZulu');
    console.log(`Allocated Grade 8 Subjects (${grade8Subjects.length}):`, grade8Subjects.join(', '));

    // 4. Create child record and link to parent
    const roleRes = await db.query("SELECT id FROM roles WHERE LOWER(name) = 'learner'");
    const learnerRoleId = roleRes.rows[0]?.id || 3;
    const childPwHash = await bcrypt.hash(generatedPassword, 10);

    // Insert user
    const userRes = await db.query(
      `INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [learnerEmail, childPwHash, learnerRoleId, siblingFirstName, siblingSurname, sampleIdNumber]
    );
    const learnerUserId = userRes.rows[0].id;

    // Insert child
    const childRes = await db.query(
      `INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, stream, subjects, home_language)
       VALUES ($1, $2, $3, $4, $5, 8, 'General', $6, 'isiZulu') RETURNING id, full_name, surname, learner_number, grade`,
      [learnerUserId, siblingFirstName, siblingSurname, parent.id, lrnNumber, grade8Subjects]
    );
    const child = childRes.rows[0];
    console.log(`✅ Created Child Record ID: ${child.id} (${child.full_name} ${child.surname}, Grade ${child.grade}, LRN: ${child.learner_number})`);

    // Insert parent_children
    await db.query(
      `INSERT INTO parent_children (parent_id, child_id, relationship, is_primary)
       VALUES ($1, $2, 'Parent', true)
       ON CONFLICT (parent_id, child_id) DO NOTHING`,
      [parent.id, child.id]
    );
    console.log(`✅ Linked Child ${child.id} to Parent ${parent.id} in parent_children table.`);

    // 5. Verify parent can fetch both old children and new sibling
    const fetchRes = await db.query(
      `SELECT c.id, c.full_name, c.surname, c.grade, c.learner_number 
       FROM children c 
       WHERE c.parent_id = $1 OR EXISTS (SELECT 1 FROM parent_children pc WHERE pc.child_id = c.id AND pc.parent_id = $1)`,
      [parent.id]
    );
    console.log(`Parent now has ${fetchRes.rows.length} children linked:`, fetchRes.rows.map(c => `${c.full_name} (Grade ${c.grade})`).join(', '));

    // Cleanup test records
    await db.query(`DELETE FROM parent_children WHERE child_id = $1`, [child.id]);
    await db.query(`DELETE FROM children WHERE id = $1`, [child.id]);
    await db.query(`DELETE FROM users WHERE id = $1`, [learnerUserId]);
    console.log(`🧹 Cleaned up test sibling record.`);

    console.log('--- ✅ Link / Enroll Sibling Test Passed Successfully! ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Link Sibling test failed:', err);
    process.exit(1);
  }
}

testLinkSiblingFlow();
