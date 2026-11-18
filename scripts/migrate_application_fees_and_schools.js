require('dotenv').config();
const db = require('../db/db');

async function migrate() {
  console.log('--- Migrating Application, Schools, and Fees System ---');

  // 1. Upgrade schools table
  await db.query(`
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_languages TEXT[] DEFAULT '{"English", "Sepedi", "isiZulu"}';
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_subjects TEXT[] DEFAULT '{}';
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_streams TEXT[] DEFAULT '{"General", "Science", "Commerce"}';
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255);
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20);
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'Cheque / Current';
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS application_fee NUMERIC(10,2) DEFAULT 250.00;
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS registration_fee NUMERIC(10,2) DEFAULT 1500.00;
  `);
  console.log('✓ Schools table columns upgraded.');

  // 2. Set diverse official language offerings and banking details for all 13 schools
  const schoolUpdates = [
    { id: 1, languages: ['English', 'Sepedi', 'isiZulu', 'Afrikaans'] },
    { id: 2, languages: ['Sepedi', 'English', 'Setswana'] },
    { id: 3, languages: ['Sepedi', 'English', 'Sesotho'] },
    { id: 4, languages: ['Sepedi', 'English', 'isiNdebele'] },
    { id: 5, languages: ['Sepedi', 'English', 'siSwati'] },
    { id: 6, languages: ['Sepedi', 'English'] },
    { id: 7, languages: ['English', 'Afrikaans', 'isiZulu', 'Sepedi'] },
    { id: 8, languages: ['isiZulu', 'English', 'isiXhosa'] },
    { id: 9, languages: ['isiXhosa', 'English', 'isiZulu', 'Sesotho'] },
    { id: 10, languages: ['Xitsonga', 'Tshivenda', 'English', 'Sepedi'] },
    { id: 11, languages: ['Tshivenda', 'Xitsonga', 'English', 'isiZulu'] },
    { id: 12, languages: ['isiNdebele', 'siSwati', 'English', 'Sepedi'] },
    { id: 13, languages: ['Sepedi', 'English', 'Setswana'] }
  ];

  for (const s of schoolUpdates) {
    await db.query(`
      UPDATE schools SET
        offered_languages = $1,
        application_fee = 250.00,
        registration_fee = 1500.00
      WHERE id = $2
    `, [s.languages, s.id]);
  }
  console.log('✓ All 13 schools updated with their language offerings.');

  // 3. Upgrade applications table
  await db.query(`
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_fee_amount NUMERIC(10,2) DEFAULT 250.00;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_fee_status VARCHAR(50) DEFAULT 'unpaid';
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_fee_paid_at TIMESTAMP;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_fee_due_date TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days');
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_fee_reminder_sent BOOLEAN DEFAULT FALSE;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS registration_fee_amount NUMERIC(10,2) DEFAULT 1500.00;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS registration_fee_status VARCHAR(50) DEFAULT 'unpaid';
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS registration_fee_paid_at TIMESTAMP;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS scenario VARCHAR(50) DEFAULT 'public_new_applicant';
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS existing_parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS existing_learner_id INTEGER REFERENCES children(id) ON DELETE SET NULL;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);

    CREATE INDEX IF NOT EXISTS idx_applications_fee_reminders ON applications(application_fee_status, application_fee_reminder_sent, application_fee_due_date);
  `);
  console.log('✓ Applications table columns & indices upgraded.');

  // 4. Create application_payments table
  await db.query(`
    CREATE TABLE IF NOT EXISTS application_payments (
      id SERIAL PRIMARY KEY,
      application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
      fee_type VARCHAR(50) NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'eft',
      payment_reference VARCHAR(100) UNIQUE NOT NULL,
      receipt_number VARCHAR(100) UNIQUE NOT NULL,
      payer_name VARCHAR(255),
      payer_email VARCHAR(255),
      status VARCHAR(50) DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_application_payments_app ON application_payments(application_id);
  `);
  console.log('✓ application_payments table created.');

  console.log('Migration finished successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
