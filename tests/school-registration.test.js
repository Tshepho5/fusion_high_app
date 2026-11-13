const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateRegistration, validSaId } = require('../public/src/services/schoolRegistrationRules');
const { inspectLogo } = require('../public/src/services/schoolLogo');

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

function registration(overrides = {}) {
  return {
    school_name: "St. Mary's High School No. 2",
    emis_number: '923240457',
    province: 'Limpopo',
    district: 'Capricorn South',
    physical_address: 'Mankweng',
    contact_email: 'office@example.com',
    contact_phone: '0151234567',
    principal_first_name: 'Lesetja',
    principal_surname: 'Molepo',
    principal_id_number: validId(),
    principal_email: 'principal@example.com',
    principal_phone: '+27821234567',
    password: 'choose-a-password',
    offered_streams: ['Science'],
    offered_languages: ['Sepedi Home Language'],
    ...overrides
  };
}

const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function png(width, height) {
  if (width === 9000) {
    const buffer = Buffer.from(TINY_PNG);
    buffer.writeUInt32BE(width, 16);
    return buffer;
  }
  return TINY_PNG;
}

describe('school registration rules', () => {
  it('accepts a school name with numbers and punctuation', () => {
    const result = validateRegistration(registration());
    assert.equal(result.ok, true);
    assert.equal(result.value.school_name, "St. Mary's High School No. 2");
    assert.equal(result.value.is_superadmin, undefined);
    assert.equal(result.value.password, undefined);
  });

  it('rejects a missing email, a short phone number, and an invalid identity number', () => {
    const result = validateRegistration(registration({
      principal_email: 'not-an-email',
      principal_phone: '123',
      principal_id_number: '123'
    }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes('email')));
    assert.ok(result.errors.some((error) => error.includes('phone')));
    assert.equal(validSaId('123'), false);
  });

  it('rejects an oversized school name', () => {
    const result = validateRegistration(registration({ school_name: 'A'.repeat(300) }));
    assert.equal(result.ok, false);
  });
});

describe('school logo inspection', () => {
  it('accepts a PNG and rejects a renamed script and an oversized image', () => {
    assert.equal(inspectLogo(png(800, 400)).ok, true);
    const script = Buffer.from('<?php echo "no";');
    assert.equal(inspectLogo(script).ok, false);
    const executable = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    assert.equal(inspectLogo(executable).ok, false);
    assert.equal(inspectLogo(png(9000, 10)).ok, false);
    const claimedPng = Buffer.from('not really a png');
    assert.equal(inspectLogo(claimedPng).ok, false);
  });
});
