'use strict';

const LIFE_ORIENTATION = 'Life Orientation';
const MATHEMATICS = 'Mathematics';
const MATHEMATICAL_LITERACY = 'Mathematical Literacy';
const HOME_LANGUAGE = 'Home Language';
const FIRST_ADDITIONAL = 'First Additional Language';

const OFFICIAL_LANGUAGES = [
  'Afrikaans',
  'English',
  'isiNdebele',
  'isiXhosa',
  'isiZulu',
  'Sepedi',
  'Sesotho',
  'Setswana',
  'siSwati',
  'Tshivenda',
  'Xitsonga'
];

const ELECTIVE_CATALOGUE = [
  'Accounting',
  'Agricultural Management Practices',
  'Agricultural Sciences',
  'Business Studies',
  'Civil Technology',
  'Computer Applications Technology',
  'Consumer Studies',
  'Dance Studies',
  'Design',
  'Dramatic Arts',
  'Economics',
  'Electrical Technology',
  'Engineering Graphics and Design',
  'Geography',
  'History',
  'Hospitality Studies',
  'Information Technology',
  'Life Sciences',
  'Mechanical Technology',
  'Music',
  'Physical Sciences',
  'Religion Studies',
  'Technical Sciences',
  'Tourism',
  'Visual Arts'
];

const SENIOR_PHASE_COMPULSORY = [
  'Mathematics',
  'Natural Sciences',
  'Social Sciences',
  'Technology',
  'Economic & Management Sciences (EMS)',
  'Life Orientation',
  'Creative Arts'
];

const SENIOR_PHASE_ELECTIVES = [
  'Coding and Robotics',
  'Computer Literacy',
  'Agricultural Studies',
  'Design and Technology',
  'Dramatic Arts',
  'Music',
  'Religion Studies',
  'Visual Arts'
];

const SUBJECT_ALIASES = new Map([
  ['engineering graphics & design (egd)', 'Engineering Graphics and Design'],
  ['engineering graphics & design', 'Engineering Graphics and Design'],
  ['egd', 'Engineering Graphics and Design'],
  ['information technology (it)', 'Information Technology'],
  ['it', 'Information Technology'],
  ['computer applications technology (cat)', 'Computer Applications Technology'],
  ['cat', 'Computer Applications Technology'],
  ['ems', 'Economic & Management Sciences (EMS)'],
  ['economic and management sciences', 'Economic & Management Sciences (EMS)'],
  ['economic & management sciences', 'Economic & Management Sciences (EMS)'],
  ['technical mathematics', 'Mathematics']
]);

const RESERVED = new Set([
  LIFE_ORIENTATION.toLowerCase(),
  MATHEMATICS.toLowerCase(),
  MATHEMATICAL_LITERACY.toLowerCase(),
  HOME_LANGUAGE.toLowerCase(),
  FIRST_ADDITIONAL.toLowerCase()
]);

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

function sameName(left, right) {
  return clean(left, 120).toLowerCase() === clean(right, 120).toLowerCase();
}

function normalizeLanguageLevel(rawLevel) {
  const value = clean(rawLevel, 60);
  if (!value) return '';
  if (/^(home\s*language|hl|huistaal)$/i.test(value)) return HOME_LANGUAGE;
  if (/^(first\s*additional\s*language|fal|additional\s*language)$/i.test(value)) return FIRST_ADDITIONAL;
  return value;
}

function canonicalizeElective(name) {
  const subject = clean(name, 80);
  if (!subject) return '';
  const aliased = SUBJECT_ALIASES.get(subject.toLowerCase()) || subject;
  return ELECTIVE_CATALOGUE.find((item) => sameName(item, aliased)) || '';
}

function canonicalizeSeniorPhaseSubject(name) {
  const subject = clean(name, 80);
  if (!subject) return '';
  const aliased = SUBJECT_ALIASES.get(subject.toLowerCase()) || subject;
  const pool = [...SENIOR_PHASE_COMPULSORY, ...SENIOR_PHASE_ELECTIVES, ...ELECTIVE_CATALOGUE];
  return pool.find((item) => sameName(item, aliased)) || '';
}

function languageSubject(language, level) {
  return `${clean(language, 40)} ${normalizeLanguageLevel(level) || level}`;
}

function assertElectiveName(name) {
  const subject = clean(name, 80);
  if (!/^[\p{L}0-9][\p{L}0-9 &'().-]{1,78}$/u.test(subject)) {
    return 'Use the official subject name.';
  }
  if (RESERVED.has(subject.toLowerCase()) || OFFICIAL_LANGUAGES.some((language) => sameName(language, subject))) {
    return `${subject} is not an elective subject.`;
  }
  if (!canonicalizeElective(subject)) {
    return `${subject} is not in Geleza SA's recognised CAPS subject catalogue.`;
  }
  return '';
}

function validateOfferings(input) {
  const errors = [];
  const year = Number(input.academic_year);
  const grade = Number(input.grade);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) errors.push('Select a valid academic year.');
  if (![8, 9, 10, 11, 12].includes(grade)) errors.push('Subject offerings are configured for Grades 8 to 12.');
  const seniorPhase = grade === 8 || grade === 9;

  const languages = Array.isArray(input.languages) ? input.languages : [];
  const normalisedLanguages = [];
  languages.forEach((item) => {
    const rawLang = clean(item.language || item.name, 40);
    const officialMatch = OFFICIAL_LANGUAGES.find((official) => sameName(official, rawLang));
    const level = normalizeLanguageLevel(item.level);
    if (!officialMatch) {
      errors.push(`${rawLang || 'A language'} is not an official language.`);
      return;
    }
    if (level !== HOME_LANGUAGE && level !== FIRST_ADDITIONAL) {
      errors.push(`${officialMatch} must be offered as Home Language or First Additional Language.`);
      return;
    }
    const key = `${officialMatch.toLowerCase()}|${level.toLowerCase()}`;
    if (normalisedLanguages.some((row) => `${row.language.toLowerCase()}|${row.level.toLowerCase()}` === key)) return;
    normalisedLanguages.push({ language: officialMatch, level, required: Boolean(item.required) && level === FIRST_ADDITIONAL });
  });

  const homeLanguages = normalisedLanguages.filter((row) => row.level === HOME_LANGUAGE);
  const additionalLanguages = normalisedLanguages.filter((row) => row.level === FIRST_ADDITIONAL);
  if (seniorPhase) {
    if (!homeLanguages.length) errors.push('Offer at least one Home Language for this grade.');
    if (additionalLanguages.filter((row) => row.required).length > 1) {
      errors.push('Only one First Additional Language can be required by the school.');
    }
  } else {
    if (!homeLanguages.length) errors.push('Offer at least one Home Language.');
    if (!additionalLanguages.length) errors.push('Offer at least one First Additional Language.');
    if (additionalLanguages.filter((row) => row.required).length > 1) {
      errors.push('Only one First Additional Language can be required by the school.');
    }
    homeLanguages.forEach((home) => {
      if (!additionalLanguages.some((extra) => !sameName(extra.language, home.language))) {
        errors.push(`${home.language} Home Language needs a different First Additional Language.`);
      }
    });
  }

  const mathematics = (Array.isArray(input.mathematics) ? input.mathematics : [])
    .map((item) => clean(item, 40))
    .filter((item) => item === MATHEMATICS || item === MATHEMATICAL_LITERACY);
  const uniqueMathematics = [...new Set(mathematics)];
  if (!seniorPhase && !uniqueMathematics.length) errors.push('Offer Mathematics, Mathematical Literacy, or both as alternative options.');

  const electives = [];
  (Array.isArray(input.electives) ? input.electives : []).forEach((item) => {
    const raw = clean(item, 80);
    if (!raw) return;
    if (!seniorPhase) {
      const problem = assertElectiveName(raw);
      if (problem) {
        errors.push(problem);
        return;
      }
      const canonical = canonicalizeElective(raw);
      if (!electives.some((existing) => sameName(existing, canonical))) electives.push(canonical);
    } else {
      const canonical = canonicalizeSeniorPhaseSubject(raw);
      if (!canonical) {
        errors.push(`${raw} is not in Geleza SA's recognised Senior Phase subject catalogue.`);
        return;
      }
      if (!electives.some((existing) => sameName(existing, canonical))) electives.push(canonical);
    }
  });

  if (seniorPhase) {
    const named = normalisedLanguages.length + uniqueMathematics.length + electives.length;
    if (!named) errors.push('Name at least one subject this school offers for this grade.');
    return {
      ok: errors.length === 0,
      errors: [...new Set(errors)],
      value: { academic_year: year, grade, languages: normalisedLanguages, mathematics: uniqueMathematics, electives }
    };
  }

  if (electives.length < 3) errors.push('Offer at least three elective subjects before creating a stream.');

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    value: { academic_year: year, grade, languages: normalisedLanguages, mathematics: uniqueMathematics, electives }
  };
}

function validateStream(stream, offerings) {
  const errors = [];
  const name = clean(stream.name, 80);
  if (name.length < 2) errors.push('Give the stream a name.');
  const mathematics = clean(stream.mathematics, 40);
  if (mathematics !== MATHEMATICS && mathematics !== MATHEMATICAL_LITERACY) {
    errors.push('Choose either Mathematics or Mathematical Literacy.');
  } else if (!offerings.mathematics.some((item) => item === mathematics)) {
    errors.push(`${mathematics} is not offered by this school for the selected grade.`);
  }

  const electives = Array.isArray(stream.electives) ? stream.electives.map((item) => clean(item, 80)) : [];
  if (electives.length !== 3) errors.push('A standard stream has exactly three elective subjects.');
  const seen = new Set();
  electives.forEach((subject) => {
    const problem = assertElectiveName(subject);
    if (problem) errors.push(problem);
    const key = subject.toLowerCase();
    if (seen.has(key)) errors.push(`${subject} is listed more than once.`);
    seen.add(key);
    if (!offerings.electives.some((offered) => sameName(offered, subject))) {
      errors.push(`${subject} is not offered by this school for the selected grade.`);
    }
  });
  if (electives.some((subject) => sameName(subject, mathematics))) {
    errors.push('The mathematical option cannot also be counted as an elective.');
  }
  if (electives.some((subject) => sameName(subject, 'Physical Sciences')) && mathematics !== MATHEMATICS) {
    errors.push('Physical Sciences must be taken with Mathematics.');
  }
  const hasCat = electives.some((subject) => sameName(subject, 'Computer Applications Technology'));
  const hasIt = electives.some((subject) => sameName(subject, 'Information Technology'));
  if (hasCat && hasIt) errors.push('Computer Applications Technology and Information Technology cannot be taken together.');

  return { ok: errors.length === 0, errors: [...new Set(errors)], value: { name, mathematics, electives } };
}

function validateLanguageChoice(homeLanguage, additionalLanguage, offerings) {
  const errors = [];
  const home = clean(homeLanguage, 40);
  const additional = clean(additionalLanguage, 40);
  const homeOffered = offerings.languages.some((row) => row.level === HOME_LANGUAGE && sameName(row.language, home));
  const additionalOffered = offerings.languages.some((row) => row.level === FIRST_ADDITIONAL && sameName(row.language, additional));
  if (!homeOffered) errors.push('Select a Home Language offered by this school.');
  if (!additionalOffered) errors.push('Select a First Additional Language offered by this school.');
  if (home && additional && sameName(home, additional)) {
    errors.push('Home Language and First Additional Language must be two different official languages.');
  }
  const required = offerings.languages.find((row) => row.level === FIRST_ADDITIONAL && row.required);
  if (required && !sameName(required.language, additional)) {
    errors.push(`This school requires ${required.language} First Additional Language.`);
  }
  return { ok: errors.length === 0, errors, home, additional };
}

function buildPackage({ homeLanguage, additionalLanguage, stream }) {
  const subjects = [
    languageSubject(homeLanguage, HOME_LANGUAGE),
    languageSubject(additionalLanguage, FIRST_ADDITIONAL),
    stream.mathematics,
    LIFE_ORIENTATION,
    ...stream.electives
  ];
  return {
    home_language: languageSubject(homeLanguage, HOME_LANGUAGE),
    first_additional_language: languageSubject(additionalLanguage, FIRST_ADDITIONAL),
    mathematics: stream.mathematics,
    life_orientation: LIFE_ORIENTATION,
    electives: [...stream.electives],
    subjects,
    count: subjects.length
  };
}

function packageElectives(subjects) {
  const list = Array.isArray(subjects) ? subjects.map((item) => clean(item, 80)) : [];
  return list.filter((subject) => (
    subject
    && !RESERVED.has(subject.toLowerCase())
    && !/home language$/i.test(subject)
    && !/first additional language$/i.test(subject)
  ));
}

function parseSchoolOfferedLanguages(rawLanguages) {
  let list = [];
  if (Array.isArray(rawLanguages)) {
    list = rawLanguages;
  } else if (typeof rawLanguages === 'string' && rawLanguages.trim()) {
    try {
      const parsed = JSON.parse(rawLanguages);
      list = Array.isArray(parsed) ? parsed : rawLanguages.split(',');
    } catch (_) {
      list = rawLanguages.split(',');
    }
  }
  const results = [];
  const seen = new Set();
  const add = (language, level) => {
    const key = `${language.toLowerCase()}|${level.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ language, level, required: false });
  };

  for (const entry of list) {
    const raw = clean(entry, 120);
    if (!raw) continue;
    const lower = raw.toLowerCase();
    const matchedOfficial = OFFICIAL_LANGUAGES.find((lang) => {
      const l = lang.toLowerCase();
      return lower === l || lower.startsWith(`${l} `) || lower.includes(l);
    });
    if (!matchedOfficial) continue;
    const isHL = /\b(home\s*language|hl|huistaal)\b/i.test(raw);
    const isFAL = /\b(first\s*additional\s*language|fal|additional\s*language)\b/i.test(raw);
    if (isHL) add(matchedOfficial, HOME_LANGUAGE);
    if (isFAL) add(matchedOfficial, FIRST_ADDITIONAL);
    if (!isHL && !isFAL) {
      add(matchedOfficial, HOME_LANGUAGE);
      add(matchedOfficial, FIRST_ADDITIONAL);
    }
  }
  return results;
}

function parseSchoolOfferedSubjects(rawSubjects) {
  let list = [];
  if (Array.isArray(rawSubjects)) {
    list = rawSubjects;
  } else if (typeof rawSubjects === 'string' && rawSubjects.trim()) {
    try {
      const parsed = JSON.parse(rawSubjects);
      list = Array.isArray(parsed) ? parsed : rawSubjects.split(',');
    } catch (_) {
      list = rawSubjects.split(',');
    }
  }
  const mathematics = [];
  const electives = [];
  const extraLanguages = [];
  for (const entry of list) {
    const raw = clean(entry, 120);
    if (!raw) continue;
    if (sameName(raw, MATHEMATICS) || sameName(raw, 'Technical Mathematics')) {
      if (!mathematics.includes(MATHEMATICS)) mathematics.push(MATHEMATICS);
      continue;
    }
    if (sameName(raw, MATHEMATICAL_LITERACY)) {
      if (!mathematics.includes(MATHEMATICAL_LITERACY)) mathematics.push(MATHEMATICAL_LITERACY);
      continue;
    }
    if (sameName(raw, LIFE_ORIENTATION)) continue;
    const canonical = canonicalizeElective(raw);
    if (canonical && !electives.some((e) => sameName(e, canonical))) {
      electives.push(canonical);
      continue;
    }
    const langParsed = parseSchoolOfferedLanguages([raw]);
    if (langParsed.length) {
      extraLanguages.push(...langParsed);
    }
  }
  return { mathematics, electives, languages: extraLanguages };
}

const MISSING_SCHEMA_CODES = new Set(['42P01', '42703', '42P10']);

function isLegacyGradeCheckViolation(error) {
  if (!error || error.code !== '23514') return false;
  const constraint = String(error.constraint || '').toLowerCase();
  if (constraint) {
    return (
      constraint.includes('grade')
      && (constraint.includes('school_subject_offerings') || constraint.includes('academic_streams'))
    );
  }
  const msg = String(error.message || '');
  return /(school_subject_offerings|academic_streams)/i.test(msg) && /grade/i.test(msg);
}

function wrapCurriculumSchemaError(error, operation) {
  if (error && (MISSING_SCHEMA_CODES.has(error.code) || isLegacyGradeCheckViolation(error))) {
    const wrapped = new Error(
      `Curriculum database schema is not up to date during ${operation} (${error.message}). Apply migration 20261121_curriculum_grades_8_12_upgrade.sql.`
    );
    wrapped.status = 503;
    wrapped.code = 'SCHEMA_OUT_OF_DATE';
    wrapped.pgCode = error.code;
    wrapped.constraint = error.constraint || undefined;
    throw wrapped;
  }
  throw error;
}

module.exports = {
  LIFE_ORIENTATION,
  MATHEMATICS,
  MATHEMATICAL_LITERACY,
  HOME_LANGUAGE,
  FIRST_ADDITIONAL,
  OFFICIAL_LANGUAGES,
  ELECTIVE_CATALOGUE,
  SENIOR_PHASE_COMPULSORY,
  SENIOR_PHASE_ELECTIVES,
  normalizeLanguageLevel,
  canonicalizeElective,
  canonicalizeSeniorPhaseSubject,
  validateOfferings,
  validateStream,
  validateLanguageChoice,
  buildPackage,
  packageElectives,
  parseSchoolOfferedLanguages,
  parseSchoolOfferedSubjects,
  isLegacyGradeCheckViolation,
  wrapCurriculumSchemaError,
  sameName
};
