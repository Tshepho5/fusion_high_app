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
  'Engineering Graphics and Design',
  'Geography',
  'History',
  'Hospitality Studies',
  'Information Technology',
  'Life Sciences',
  'Music',
  'Physical Sciences',
  'Tourism',
  'Visual Arts'
];

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

function languageSubject(language, level) {
  return `${clean(language, 40)} ${level}`;
}

function assertElectiveName(name) {
  const subject = clean(name, 80);
  if (!/^[\p{L}0-9][\p{L}0-9 &'().-]{1,78}$/u.test(subject)) {
    return 'Use the official subject name.';
  }
  if (RESERVED.has(subject.toLowerCase()) || OFFICIAL_LANGUAGES.some((language) => sameName(language, subject))) {
    return `${subject} is not an elective subject.`;
  }
  return '';
}

function validateOfferings(input) {
  const errors = [];
  const year = Number(input.academic_year);
  const grade = Number(input.grade);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) errors.push('Select a valid academic year.');
  if (![10, 11, 12].includes(grade)) errors.push('Subject streams are configured for Grades 10, 11 and 12.');

  const languages = Array.isArray(input.languages) ? input.languages : [];
  const normalisedLanguages = [];
  languages.forEach((item) => {
    const language = clean(item.language || item.name, 40);
    const level = clean(item.level, 40);
    if (!OFFICIAL_LANGUAGES.some((official) => sameName(official, language))) {
      errors.push(`${language || 'A language'} is not an official language.`);
      return;
    }
    if (level !== HOME_LANGUAGE && level !== FIRST_ADDITIONAL) {
      errors.push(`${language} must be offered as Home Language or First Additional Language.`);
      return;
    }
    const key = `${language.toLowerCase()}|${level.toLowerCase()}`;
    if (normalisedLanguages.some((row) => `${row.language.toLowerCase()}|${row.level.toLowerCase()}` === key)) return;
    normalisedLanguages.push({ language, level, required: Boolean(item.required) && level === FIRST_ADDITIONAL });
  });

  const homeLanguages = normalisedLanguages.filter((row) => row.level === HOME_LANGUAGE);
  const additionalLanguages = normalisedLanguages.filter((row) => row.level === FIRST_ADDITIONAL);
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

  const mathematics = (Array.isArray(input.mathematics) ? input.mathematics : [])
    .map((item) => clean(item, 40))
    .filter((item) => item === MATHEMATICS || item === MATHEMATICAL_LITERACY);
  const uniqueMathematics = [...new Set(mathematics)];
  if (!uniqueMathematics.length) errors.push('Offer Mathematics, Mathematical Literacy, or both as alternative options.');

  const electives = [];
  (Array.isArray(input.electives) ? input.electives : []).forEach((item) => {
    const name = clean(item, 80);
    const problem = assertElectiveName(name);
    if (problem) errors.push(problem);
    else if (!electives.some((existing) => sameName(existing, name))) electives.push(name);
  });
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

module.exports = {
  LIFE_ORIENTATION,
  MATHEMATICS,
  MATHEMATICAL_LITERACY,
  HOME_LANGUAGE,
  FIRST_ADDITIONAL,
  OFFICIAL_LANGUAGES,
  ELECTIVE_CATALOGUE,
  validateOfferings,
  validateStream,
  validateLanguageChoice,
  buildPackage,
  packageElectives,
  sameName
};
