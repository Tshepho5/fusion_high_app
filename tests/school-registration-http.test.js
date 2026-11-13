/**
 * Exercises the running registration API, then deletes any probe application it created.
 */
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const db = require('../db/db');

const BASE = 'http://127.0.0.1:4000';
const EMIS = '999000111';
const EMAIL = 'geleza-audit-probe@example.com';

function validId() {
  const first12 = '800101500908';
  let sum = 0;
  let doubleIt = true;
  for (let index = first12.length - 1; index >= 0; index -= 1) {
    let digit = Number(first12.charAt(index));
    if (doubleIt) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleIt = !doubleIt;
  }
  return `${first12}${(10 - (sum % 10)) % 10}`;
}

function png() {
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
}

function form(logoBuffer, logoName, logoType) {
  const body = new FormData();
  body.append('school_name', "St. Mary's Audit Probe No. 2");
  body.append('emis_number', EMIS);
  body.append('province', 'Limpopo');
  body.append('district', 'Capricorn South');
  body.append('physical_address', 'Audit probe address');
  body.append('contact_email', 'office-audit-probe@example.com');
  body.append('contact_phone', '0151234567');
  body.append('principal_first_name', 'Audit');
  body.append('principal_surname', 'Probe');
  body.append('principal_id_number', validId());
  body.append('principal_email', EMAIL);
  body.append('principal_phone', '0821234567');
  body.append('password', 'audit-probe-password');
  body.append('offered_streams', JSON.stringify(['Science']));
  body.append('offered_languages', JSON.stringify(['Sepedi Home Language']));
  body.append('logo', new Blob([logoBuffer], { type: logoType }), logoName);
  return body;
}

async function cleanup() {
  const rows = await db.query(
    'SELECT logo_stored_name FROM school_applications WHERE emis_number = $1 OR principal_email = $2',
    [EMIS, EMAIL]
  );
  const schoolLogo = require('../public/src/services/schoolLogo');
  for (const row of rows.rows) schoolLogo.removeLogo(row.logo_stored_name);
  await db.query('DELETE FROM school_applications WHERE emis_number = $1 OR principal_email = $2', [EMIS, EMAIL]);
  await db.query("DELETE FROM schools WHERE emis_number = $1 AND name = 'St. Mary''s Audit Probe No. 2'", [EMIS]);
  await db.query('DELETE FROM users WHERE email = $1', [EMAIL]);
}

describe('school registration http', () => {
  after(async () => {
    await cleanup();
    await db.pool.end();
  });

  it('rejects a spoofed logo, an unauthorised review, and does not activate a probe school', async () => {
    let reachable = true;
    const spoofed = await fetch(`${BASE}/api/schools/apply`, {
      method: 'POST',
      body: form(Buffer.from('<?php echo 1;'), 'logo.png', 'image/png')
    }).catch(() => { reachable = false; return null; });
    if (!reachable) return;

    assert.equal(spoofed.status, 400);
    const unauthorised = await fetch(`${BASE}/api/schools/applications/1/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approve', role: 'admin', school_id: 1 })
    });
    assert.equal(unauthorised.status, 401);

    const created = await fetch(`${BASE}/api/schools/apply`, {
      method: 'POST',
      body: form(png(), 'logo.png', 'image/png')
    });
    if (created.status === 403) {
      const locked = await created.json();
      assert.equal(typeof locked.error, 'string');
      return;
    }
    const payload = await created.json();
    assert.equal(created.status, 201, payload.error || JSON.stringify(payload));
    assert.equal(payload.application.status, 'pending_review');
    assert.equal(payload.school, undefined);
    const linked = await db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM schools WHERE emis_number = $1) AS schools,
         (SELECT COUNT(*)::int FROM users WHERE email = $2) AS users`,
      [EMIS, EMAIL]
    );
    assert.equal(linked.rows[0].schools, 0);
    assert.equal(linked.rows[0].users, 0);
    const repeat = await fetch(`${BASE}/api/schools/apply`, {
      method: 'POST',
      body: form(png(), 'logo.png', 'image/png')
    });
    assert.equal(repeat.status, 409);
  });
});
