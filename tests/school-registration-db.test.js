/**
 * Confirms the registration column and unique indexes can be applied,
 * then rolls back a pending application so no school is kept.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const db = require('../db/db');
const { migrateSchoolOnboardingAndCleanRoster } = require('../db/migrate_school_onboarding_and_clean_roster');

describe('school registration database', () => {
  let client;

  before(async () => {
    await migrateSchoolOnboardingAndCleanRoster();
    client = await db.pool.connect();
  });

  after(async () => {
    if (client) client.release();
    await db.pool.end();
  });

  it('stores a pending application without creating a school, then rolls it back', async () => {
    await client.query('BEGIN');
    try {
      const beforeSchools = await client.query('SELECT COUNT(*)::int AS total FROM schools');
      const inserted = await client.query(
        `INSERT INTO school_applications (
           application_number, status, school_name, emis_number, province, district,
           physical_address, contact_email, contact_phone,
           principal_first_name, principal_surname, principal_id_number,
           principal_email, principal_phone, logo_stored_name
         ) VALUES (
           'GSA-TEST-ROLLBACK', 'pending_review', 'Rollback Probe School', '000000001', 'Limpopo', 'Test',
           'Test address', 'office@example.com', '0151234567',
           'Test', 'Principal', '8001015009087',
           'rollback-principal@example.com', '0821234567', '1700000000000-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png'
         ) RETURNING id, status, logo_stored_name`
      );
      assert.equal(inserted.rows[0].status, 'pending_review');
      assert.ok(inserted.rows[0].logo_stored_name);
      const afterSchools = await client.query('SELECT COUNT(*)::int AS total FROM schools');
      assert.equal(afterSchools.rows[0].total, beforeSchools.rows[0].total);
      const user = await client.query("SELECT id FROM users WHERE email = 'rollback-principal@example.com'");
      assert.equal(user.rows.length, 0);
      await client.query('ROLLBACK');
      const leftover = await client.query("SELECT id FROM school_applications WHERE application_number = 'GSA-TEST-ROLLBACK'");
      assert.equal(leftover.rows.length, 0);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
});
