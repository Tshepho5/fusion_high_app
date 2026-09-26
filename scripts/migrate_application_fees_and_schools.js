require('dotenv').config();
const db = require('../db/db');

async function migrate() {
  console.log('--- Migrating Application, Schools, and Fees System ---');

  // 1. Upgrade schools table
  await db.query(`
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_languages TEXT[] DEFAULT '{"English", "Sepedi", "isiZulu"}';
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_subjects TEXT[] DEFAULT '{}';
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_streams TEXT[] DEFAULT '{"General", "Science", "Commerce"}';
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT 'First National Bank (FNB)';
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255);
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_number VARCHAR(50) DEFAULT '62849102841';
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20) DEFAULT '250655';
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'Cheque / Current';
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS application_fee NUMERIC(10,2) DEFAULT 250.00;
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS registration_fee NUMERIC(10,2) DEFAULT 1500.00;
  `);
  console.log('✓ Schools table columns upgraded.');

  // 2. Set diverse official language offerings and banking details for all 13 schools
  const schoolUpdates = [
    { id: 1, languages: ['English', 'Sepedi', 'isiZulu', 'Afrikaans'], bank: 'First National Bank (FNB)', acc: '62849102841', branch: '250655', holder: 'Geleza SA Central Fund' },
    { id: 2, languages: ['Sepedi', 'English', 'Setswana'], bank: 'Standard Bank', acc: '02849102948', branch: '051001', holder: 'Mountainview Senior Secondary' },
    { id: 3, languages: ['Sepedi', 'English', 'Sesotho'], bank: 'Nedbank', acc: '1192840192', branch: '198765', holder: 'Makgoka High School Trust' },
    { id: 4, languages: ['Sepedi', 'English', 'isiNdebele'], bank: 'ABSA Bank', acc: '4089201948', branch: '632005', holder: 'Turfloop High Admissions' },
    { id: 5, languages: ['Sepedi', 'English', 'siSwati'], bank: 'Capitec Bank', acc: '1829401928', branch: '470010', holder: 'Hwiti Secondary School' },
    { id: 6, languages: ['Sepedi', 'English'], bank: 'First National Bank (FNB)', acc: '62991029481', branch: '250655', holder: 'Ngwana Mohube Secondary' },
    { id: 7, languages: ['English', 'Afrikaans', 'isiZulu', 'Sepedi'], bank: 'First National Bank (FNB)', acc: '62740192841', branch: '250655', holder: 'Fusion Secondary School Lotus' },
    { id: 8, languages: ['isiZulu', 'English', 'isiXhosa'], bank: 'Standard Bank', acc: '03849102911', branch: '051001', holder: 'Saulridge Secondary School' },
    { id: 9, languages: ['isiXhosa', 'English', 'isiZulu', 'Sesotho'], bank: 'Nedbank', acc: '1184910293', branch: '198765', holder: 'Phelindaba Secondary School' },
    { id: 10, languages: ['Xitsonga', 'Tshivenda', 'English', 'Sepedi'], bank: 'ABSA Bank', acc: '4078910291', branch: '632005', holder: 'Flavius Mareka Secondary' },
    { id: 11, languages: ['Tshivenda', 'Xitsonga', 'English', 'isiZulu'], bank: 'Capitec Bank', acc: '1784910294', branch: '470010', holder: 'Dr. W.F. Nkomo Secondary' },
    { id: 12, languages: ['isiNdebele', 'siSwati', 'English', 'Sepedi'], bank: 'Standard Bank', acc: '04849102933', branch: '051001', holder: 'Hofmeyr Secondary School' },
    { id: 13, languages: ['Sepedi', 'English', 'Setswana'], bank: 'First National Bank (FNB)', acc: '62984019284', branch: '250655', holder: 'Bochum High School' }
  ];

  for (const s of schoolUpdates) {
    await db.query(`
      UPDATE schools SET
        offered_languages = $1,
        bank_name = $2,
        account_number = $3,
        branch_code = $4,
        account_holder = $5,
        application_fee = 250.00,
        registration_fee = 1500.00
      WHERE id = $6
    `, [s.languages, s.bank, s.acc, s.branch, s.holder, s.id]);
  }
  console.log('✓ All 13 schools updated with calibrated language offerings and banking details.');

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
