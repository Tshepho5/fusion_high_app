const db = require('../db/db');
const bcrypt = require('bcryptjs');

async function setCredentials() {
  const emails = ['202247878@myturf.ul.ac.za', 'sthepomakola23@gmail.com', 'admin@fusionhigh.co.za'];
  const plainPassword = '#Makola#$5$';
  const hash = await bcrypt.hash(plainPassword, 10);

  for (const email of emails) {
    const res = await db.query(
      `UPDATE users 
       SET password_hash = $1, role_id = 1, is_superadmin = TRUE, school_id = 1 
       WHERE LOWER(email) = LOWER($2) 
       RETURNING id, email, full_name, surname, role_id, is_superadmin, school_id`,
      [hash, email]
    );
    console.log(`Updated ${email}:`, res.rows);
  }

  process.exit(0);
}

setCredentials().catch(err => {
  console.error(err);
  process.exit(1);
});
