const db = require('../db/db');

const SA_OFFICIAL_LANGUAGES = [
  { name: 'Sepedi', code: 'SEP' },
  { name: 'isiZulu', code: 'ZUL' },
  { name: 'English', code: 'ENG' },
  { name: 'Afrikaans', code: 'AFR' },
  { name: 'isiXhosa', code: 'XHO' },
  { name: 'Setswana', code: 'TSW' },
  { name: 'Sesotho', code: 'SOT' },
  { name: 'Xitsonga', code: 'XIT' },
  { name: 'siSwati', code: 'SWA' },
  { name: 'Tshivenda', code: 'VEN' },
  { name: 'isiNdebele', code: 'NDE' }
];

async function runMigration() {
  console.log('🚀 Starting Home Languages and User Presence Migration...');

  try {
    // 1. Add presence tracking columns to users table
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
      UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE last_seen_at IS NULL;
    `);
    console.log('✅ Added last_seen_at and is_online columns to users table.');

    // 2. Remove generic 'Home Language' subjects and insert official language subjects
    await db.query(`
      DELETE FROM subjects WHERE name = 'Home Language' OR code LIKE 'HMLG%';
    `);
    console.log('✅ Removed generic Home Language from subjects table.');

    const grades = [8, 9, 10, 11, 12];
    for (const lang of SA_OFFICIAL_LANGUAGES) {
      for (const grade of grades) {
        const stream = grade < 10 ? 'General' : 'General';
        const subjName = `${lang.name} Home Language`;
        const subjCode = `${lang.code}H${grade.toString().padStart(2, '0')}`;

        await db.query(`
          INSERT INTO subjects (name, code, grade, stream)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (code) DO UPDATE 
          SET name = EXCLUDED.name, grade = EXCLUDED.grade, stream = EXCLUDED.stream;
        `, [subjName, subjCode, grade, stream]);
      }
    }
    console.log('✅ Inserted all 11 official South African Home Languages into subjects table for Grades 8-12.');

    // 3. Update existing children whose subjects array still has generic 'Home Language'
    const childrenRes = await db.query(`
      SELECT id, home_language, subjects FROM children WHERE 'Home Language' = ANY(subjects);
    `);

    for (const child of childrenRes.rows) {
      const homeLang = (child.home_language || 'Sepedi').trim();
      const specificLangName = homeLang.toLowerCase().includes('home language')
        ? homeLang
        : `${homeLang} Home Language`;

      const updatedSubjects = (child.subjects || []).map(s => (s === 'Home Language' ? specificLangName : s));
      // Deduplicate
      const uniqueSubjects = [...new Set(updatedSubjects)];

      await db.query(`
        UPDATE children SET subjects = $1 WHERE id = $2;
      `, [uniqueSubjects, child.id]);
    }
    console.log(`✅ Updated ${childrenRes.rows.length} children records to replace generic Home Language with their specific Home Language.`);

    // 4. Update marks table if any records have subject = 'Home Language'
    await db.query(`
      UPDATE marks 
      SET subject = 'Sepedi Home Language' 
      WHERE subject = 'Home Language';
    `);
    console.log('✅ Cleaned up marks records referencing generic Home Language.');

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
