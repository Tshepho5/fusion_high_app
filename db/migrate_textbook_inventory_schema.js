const db = require('./db');

/**
 * Migration: Ensures complete schema for textbook_inventory and textbook_allocations.
 * Safely adds missing columns (publisher, barcode, unit_cost_zar, etc.) using idempotent ALTER TABLE statements.
 */
async function migrateTextbookInventorySchema() {
  console.log('[MIGRATION] --- Starting Textbook Inventory & Allocation Schema Verification ---');
  try {
    // 1. Ensure textbook_inventory exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS textbook_inventory (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(150) NOT NULL,
        grade INTEGER NOT NULL,
        publisher VARCHAR(150) DEFAULT 'CAPS Approved Publisher',
        isbn VARCHAR(50),
        barcode VARCHAR(50),
        total_copies INTEGER DEFAULT 50,
        available_copies INTEGER DEFAULT 50,
        unit_cost_zar NUMERIC(10, 2) DEFAULT 250.00,
        school_id INTEGER DEFAULT 1,
        stream VARCHAR(50) DEFAULT 'General',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add any missing columns to textbook_inventory (idempotent ALTER TABLE statements)
    await db.query(`
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS publisher VARCHAR(150) DEFAULT 'CAPS Approved Publisher';
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS unit_cost_zar NUMERIC(10, 2) DEFAULT 250.00;
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS total_copies INTEGER DEFAULT 50;
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS available_copies INTEGER DEFAULT 50;
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS stream VARCHAR(50) DEFAULT 'General';
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS isbn VARCHAR(50);
      ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS barcode_prefix VARCHAR(50);
    `);

    // 3. Backfill missing defaults in existing rows
    await db.query(`
      UPDATE textbook_inventory SET publisher = 'CAPS Approved Publisher' WHERE publisher IS NULL;
      UPDATE textbook_inventory SET unit_cost_zar = 250.00 WHERE unit_cost_zar IS NULL;
      UPDATE textbook_inventory SET barcode = COALESCE(barcode_prefix, 'TB-' || grade || '-' || id) WHERE barcode IS NULL;
      UPDATE textbook_inventory SET total_copies = 50 WHERE total_copies IS NULL;
      UPDATE textbook_inventory SET available_copies = total_copies WHERE available_copies IS NULL;
      UPDATE textbook_inventory SET school_id = 1 WHERE school_id IS NULL;
    `);

    // 4. Ensure textbook_allocations exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS textbook_allocations (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER NOT NULL REFERENCES textbook_inventory(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        issued_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        copy_barcode VARCHAR(100),
        issued_date DATE DEFAULT CURRENT_DATE,
        expected_return_date DATE DEFAULT (CURRENT_DATE + INTERVAL '120 days'),
        returned_date DATE,
        condition_on_issue VARCHAR(30) DEFAULT 'Good',
        condition_on_return VARCHAR(30),
        replacement_fee NUMERIC(10, 2) DEFAULT 0.00,
        status VARCHAR(30) DEFAULT 'issued',
        school_id INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Add missing columns to textbook_allocations
    await db.query(`
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS issued_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS issued_date DATE DEFAULT CURRENT_DATE;
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS expected_return_date DATE DEFAULT (CURRENT_DATE + INTERVAL '120 days');
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS returned_date DATE;
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS condition_on_issue VARCHAR(30) DEFAULT 'Good';
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS condition_on_return VARCHAR(30);
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS replacement_fee NUMERIC(10, 2) DEFAULT 0.00;
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'issued';
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS copy_barcode VARCHAR(100);
    `);

    // Drop NOT NULL constraint on copy_barcode if it exists
    try {
      await db.query(`ALTER TABLE textbook_allocations ALTER COLUMN copy_barcode DROP NOT NULL;`);
    } catch (_) {}

    // Synchronize legacy date column names if they exist
    try {
      await db.query(`
        UPDATE textbook_allocations SET issued_date = issue_date WHERE issued_date IS NULL AND issue_date IS NOT NULL;
        UPDATE textbook_allocations SET expected_return_date = return_due_date WHERE expected_return_date IS NULL AND return_due_date IS NOT NULL;
      `);
    } catch (_) {}

    // Indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_textbook_inv_grade ON textbook_inventory(grade);
      CREATE INDEX IF NOT EXISTS idx_textbook_inv_subject ON textbook_inventory(subject);
      CREATE INDEX IF NOT EXISTS idx_textbook_alloc_child ON textbook_allocations(child_id);
      CREATE INDEX IF NOT EXISTS idx_textbook_alloc_inv ON textbook_allocations(inventory_id);
      CREATE INDEX IF NOT EXISTS idx_textbook_alloc_status ON textbook_allocations(status);
    `);

    console.log('[MIGRATION] ✓ Textbook Inventory & Allocations schema successfully verified and upgraded.');

    // 6. Seed initial CAPS textbooks if inventory is empty
    const countRes = await db.query('SELECT COUNT(*) FROM textbook_inventory');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      console.log('[MIGRATION] Seeding standard South African CAPS textbook catalog...');
      const defaultBooks = [
        { title: 'Platinum Mathematics Grade 8', subject: 'Mathematics', grade: 8, publisher: 'Pearson South Africa', isbn: '978-0-636-12781-4', barcode: 'MATH-08-001', copies: 60, cost: 230.00 },
        { title: 'Spot On Natural Sciences Grade 8', subject: 'Natural Sciences', grade: 8, publisher: 'Pearson South Africa', isbn: '978-0-7962-3588-6', barcode: 'NSCI-08-001', copies: 60, cost: 220.00 },
        { title: 'English in Context FAL Grade 8', subject: 'English FAL', grade: 8, publisher: 'Maskew Miller Longman', isbn: '978-0-636-08568-8', barcode: 'ENGL-08-001', copies: 60, cost: 210.00 },
        { title: 'Platinum Mathematics Grade 9', subject: 'Mathematics', grade: 9, publisher: 'Pearson South Africa', isbn: '978-0-636-12782-1', barcode: 'MATH-09-001', copies: 60, cost: 240.00 },
        { title: 'Spot On Natural Sciences Grade 9', subject: 'Natural Sciences', grade: 9, publisher: 'Pearson South Africa', isbn: '978-0-7962-3589-3', barcode: 'NSCI-09-001', copies: 60, cost: 225.00 },
        { title: 'English in Context FAL Grade 9', subject: 'English FAL', grade: 9, publisher: 'Maskew Miller Longman', isbn: '978-0-636-08569-5', barcode: 'ENGL-09-001', copies: 60, cost: 215.00 },
        { title: 'Platinum Mathematics Grade 10', subject: 'Mathematics', grade: 10, publisher: 'Pearson South Africa', isbn: '978-0-636-12784-5', barcode: 'MATH-10-001', copies: 90, cost: 280.00 },
        { title: 'Doc Scientia Physical Sciences Grade 10', subject: 'Physical Sciences', grade: 10, publisher: 'Doc Scientia', isbn: '978-0-6395-0010-9', barcode: 'PHYS-10-001', copies: 80, cost: 290.00 },
        { title: 'Understanding Life Sciences Grade 10', subject: 'Life Sciences', grade: 10, publisher: 'Pulse Education', isbn: '978-1-92019-220-4', barcode: 'LIFE-10-001', copies: 85, cost: 275.00 },
        { title: 'English in Context FAL Grade 10', subject: 'English FAL', grade: 10, publisher: 'Maskew Miller Longman', isbn: '978-0-636-08570-1', barcode: 'ENGL-10-001', copies: 95, cost: 245.00 },
        { title: 'New Era Accounting Grade 10', subject: 'Accounting', grade: 10, publisher: 'New Generation', isbn: '978-1-77581-000-1', barcode: 'ACC-10-001', copies: 60, cost: 260.00 },
        { title: 'Focus Business Studies Grade 10', subject: 'Business Studies', grade: 10, publisher: 'Maskew Miller Longman', isbn: '978-0-636-12701-2', barcode: 'BUSS-10-001', copies: 60, cost: 250.00 },
        { title: 'Enjoy Economics Grade 10', subject: 'Economics', grade: 10, publisher: 'Heinemann', isbn: '978-0-7962-3580-0', barcode: 'ECON-10-001', copies: 60, cost: 255.00 },
        { title: 'Mind Action Series Mathematics Grade 11', subject: 'Mathematics', grade: 11, publisher: 'Sanlam / Mind Action', isbn: '978-1-86921-511-7', barcode: 'MATH-11-001', copies: 90, cost: 310.00 },
        { title: 'Doc Scientia Physical Sciences Grade 11', subject: 'Physical Sciences', grade: 11, publisher: 'Doc Scientia', isbn: '978-0-6395-0011-6', barcode: 'PHYS-11-001', copies: 80, cost: 295.00 },
        { title: 'Understanding Life Sciences Grade 11', subject: 'Life Sciences', grade: 11, publisher: 'Pulse Education', isbn: '978-1-92019-221-1', barcode: 'LIFE-11-001', copies: 85, cost: 280.00 },
        { title: 'English in Context FAL Grade 11', subject: 'English FAL', grade: 11, publisher: 'Maskew Miller Longman', isbn: '978-0-636-08571-8', barcode: 'ENGL-11-001', copies: 95, cost: 250.00 },
        { title: 'New Era Accounting Grade 11', subject: 'Accounting', grade: 11, publisher: 'New Generation', isbn: '978-1-77581-001-8', barcode: 'ACC-11-001', copies: 60, cost: 265.00 },
        { title: 'Focus Business Studies Grade 11', subject: 'Business Studies', grade: 11, publisher: 'Maskew Miller Longman', isbn: '978-0-636-12702-9', barcode: 'BUSS-11-001', copies: 60, cost: 255.00 },
        { title: 'Mind Action Series Mathematics Grade 12', subject: 'Mathematics', grade: 12, publisher: 'Sanlam / Mind Action', isbn: '978-1-86921-500-1', barcode: 'MATH-12-001', copies: 80, cost: 320.00 },
        { title: 'Doc Scientia Physical Sciences Grade 12', subject: 'Physical Sciences', grade: 12, publisher: 'Doc Scientia', isbn: '978-0-6395-0012-3', barcode: 'PHYS-12-001', copies: 75, cost: 300.00 },
        { title: 'Understanding Life Sciences Grade 12', subject: 'Life Sciences', grade: 12, publisher: 'Pulse Education', isbn: '978-1-92019-228-0', barcode: 'LIFE-12-001', copies: 75, cost: 285.00 },
        { title: 'English in Context FAL Grade 12', subject: 'English FAL', grade: 12, publisher: 'Maskew Miller Longman', isbn: '978-0-636-08573-2', barcode: 'ENGL-12-001', copies: 100, cost: 255.00 },
        { title: 'New Era Accounting Grade 12', subject: 'Accounting', grade: 12, publisher: 'New Generation', isbn: '978-1-77581-002-5', barcode: 'ACC-12-001', copies: 60, cost: 270.00 }
      ];

      for (const b of defaultBooks) {
        await db.query(`
          INSERT INTO textbook_inventory (title, subject, grade, publisher, isbn, barcode, total_copies, available_copies, unit_cost_zar)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8);
        `, [b.title, b.subject, b.grade, b.publisher, b.isbn, b.barcode, b.copies, b.cost]);
      }
      console.log('[MIGRATION] ✓ Seeded standard CAPS textbooks.');
    }
  } catch (err) {
    console.error('[MIGRATION ERROR] Textbook inventory migration:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateTextbookInventorySchema()
    .then(() => {
      console.log('Textbook migration finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal migration error:', err);
      process.exit(1);
    });
}

module.exports = migrateTextbookInventorySchema;
