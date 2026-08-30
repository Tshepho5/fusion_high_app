const fs = require('fs');
const path = require('path');
const db = require('../db/db');

async function cleanup() {
  console.log('--- Step 1: Deleting past paper files from uploads/textbooks ---');
  const dir = path.join(__dirname, '..', 'uploads', 'textbooks');
  let deletedCount = 0;
  let freedBytes = 0;

  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      try {
        const stat = fs.statSync(full);
        freedBytes += stat.size;
        fs.unlinkSync(full);
        deletedCount++;
      } catch (err) {
        console.warn('Failed to delete:', full, err.message);
      }
    }
  }

  console.log(`Deleted files count: ${deletedCount}`);
  console.log(`Freed disk space: ${(freedBytes / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n--- Step 2: Cleaning database seeded past papers ---');
  const delRes = await db.query(
    "DELETE FROM textbooks WHERE resource_type IN ('past_paper', 'exam_memo') OR title ILIKE '%exam%' OR title ILIKE '%paper%'"
  );
  console.log(`Deleted database records: ${delRes.rowCount}`);

  const remaining = await db.query('SELECT count(*) FROM textbooks');
  console.log(`Remaining textbooks/resources in DB: ${remaining.rows[0].count}`);

  console.log('\n[✓] All past question papers deleted successfully. Disk space reclaimed!');
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
