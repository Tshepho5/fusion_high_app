const SCHOOL_NAME = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .,'’&()/:-]{1,254}$/u;
const PERSON_NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'\u2019-]{0,99}$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9]{10,15}$/;

function text(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

function list(value, maxItems, maxItem) {
  let source = value;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch (_) { source = source.split(','); }
  }
  if (!Array.isArray(source)) return [];
  return source.map((item) => text(item, maxItem)).filter(Boolean).slice(0, maxItems);
}

function validSaId(value) {
  const clean = String(value || '').replace(/\D/g, '');
  if (clean.length !== 13) return false;
  let sum = 0;
  let doubleIt = false;
  for (let index = clean.length - 1; index >= 0; index -= 1) {
    let digit = Number(clean.charAt(index));
    if (doubleIt) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleIt = !doubleIt;
  }
  if (sum % 10 !== 0) return false;
  const month = Number(clean.slice(2, 4));
  const day = Number(clean.slice(4, 6));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function validateRegistration(body) {
  const source = body && typeof body === 'object' ? body : {};
  const errors = [];
  const rawSchoolName = String(source.school_name || '').trim();
  const schoolName = text(source.school_name, 255);
  if (rawSchoolName.length > 255) errors.push('The school name is too long.');
  else if (!schoolName || !SCHOOL_NAME.test(schoolName)) {
    errors.push('Enter the official school name. Numbers and ordinary punctuation are allowed.');
  }
  const emis = String(source.emis_number || '').replace(/\D/g, '');
  if (emis.length !== 9) errors.push('The EMIS number must be exactly 9 digits.');
  const province = text(source.province, 50);
  const district = text(source.district, 100);
  const address = text(source.physical_address, 1000);
  if (!province || !district || !address) {
    errors.push('Province, district, and physical address are required.');
  }
  const principalEmail = text(source.principal_email, 255).toLowerCase();
  const contactEmail = text(source.contact_email || principalEmail, 255).toLowerCase();
  if (!EMAIL.test(principalEmail) || principalEmail.length > 255) {
    errors.push('Enter a valid principal email address.');
  }
  if (!EMAIL.test(contactEmail)) errors.push('Enter a valid school contact email address.');
  const principalPhone = text(source.principal_phone, 20).replace(/[\s()-]/g, '');
  const contactPhone = text(source.contact_phone || principalPhone, 20).replace(/[\s()-]/g, '');
  if (!PHONE.test(principalPhone)) errors.push('Enter a principal phone number of 10 to 15 digits.');
  if (!PHONE.test(contactPhone)) errors.push('Enter a school phone number of 10 to 15 digits.');
  const firstName = text(source.principal_first_name, 100);
  const surname = text(source.principal_surname, 100);
  if (!PERSON_NAME.test(firstName) || !PERSON_NAME.test(surname)) {
    errors.push('Enter the principal first name and surname using letters.');
  }
  const idNumber = String(source.principal_id_number || '').replace(/\D/g, '');
  if (!validSaId(idNumber)) errors.push('Enter a valid 13-digit South African ID number.');
  const streams = list(source.offered_streams, 12, 80);
  const languages = list(source.offered_languages, 20, 80);
  const subjects = list(source.offered_subjects, 40, 120);
  if (!streams.length) errors.push('Select at least one academic stream.');
  if (!languages.length) errors.push('Select at least one language.');

  return {
    ok: errors.length === 0,
    errors,
    value: {
      school_name: schoolName,
      emis_number: emis,
      province,
      district,
      circuit: text(source.circuit, 100) || null,
      physical_address: address,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      curriculum_type: text(source.curriculum_type, 100) || 'CAPS (DBE)',
      grade_range: text(source.grade_range, 50) || '8-12',
      offered_streams: streams,
      offered_languages: languages,
      offered_subjects: subjects,
      principal_first_name: firstName,
      principal_surname: surname,
      principal_id_number: idNumber,
      principal_sace_number: text(source.principal_sace_number || source.principal_sace, 50) || null,
      principal_email: principalEmail,
      principal_phone: principalPhone,
      motto: text(source.motto, 300) || 'Excellence in Education',
      primary_color: /^#[0-9a-fA-F]{6}$/.test(String(source.primary_color || '')) ? source.primary_color : '#0284c7',
      secondary_color: /^#[0-9a-fA-F]{6}$/.test(String(source.secondary_color || '')) ? source.secondary_color : '#06b6d4',
      teacher_modules: source.teacher_modules == null || source.teacher_modules === '' ? undefined : list(source.teacher_modules, 40, 40),
      learner_modules: source.learner_modules == null || source.learner_modules === '' ? undefined : list(source.learner_modules, 40, 40)
    }
  };
}

function publicApplication(row) {
  if (!row) return null;
  const copy = { ...row };
  delete copy.password_hash;
  return copy;
}

module.exports = { validateRegistration, validSaId, publicApplication };
