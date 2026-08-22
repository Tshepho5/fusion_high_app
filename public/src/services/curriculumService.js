/**
 * Curriculum Service - CAPS Curriculum Subjects by Grade and Stream
 * South African Department of Basic Education Curriculum and Assessment Policy Statement (CAPS)
 */

const STREAM_SUBJECTS = {
  '8': {
    'General': [
      'English FAL',
      'Home Language',
      'Mathematics',
      'Natural Sciences',
      'Social Sciences',
      'Technology',
      'Economic & Management Sciences (EMS)',
      'Life Orientation',
      'Creative Arts'
    ]
  },
  '9': {
    'General': [
      'English FAL',
      'Home Language',
      'Mathematics',
      'Natural Sciences',
      'Social Sciences',
      'Technology',
      'Economic & Management Sciences (EMS)',
      'Life Orientation',
      'Creative Arts'
    ]
  },
  '10': {
    'Science': [
      'English FAL',
      'Home Language',
      'Mathematics',
      'Physical Sciences',
      'Life Sciences',
      'Geography',
      'Life Orientation'
    ],
    'Commerce': [
      'English FAL',
      'Home Language',
      'Mathematics',
      'Accounting',
      'Business Studies',
      'Economics',
      'Life Orientation'
    ],
    'Tourism': [
      'English FAL',
      'Home Language',
      'Mathematical Literacy',
      'Tourism',
      'History',
      'Geography',
      'Life Orientation'
    ],
    'General': [
      'English FAL',
      'Home Language',
      'Mathematics',
      'Life Orientation'
    ]
  },
  '11': {
    'Science': [
      'English FAL',
      'Home Language',
      'Mathematics',
      'Physical Sciences',
      'Life Sciences',
      'Geography',
      'Life Orientation'
    ],
    'Commerce': [
      'English FAL',
      'Home Language',
      'Mathematics',
      'Accounting',
      'Business Studies',
      'Economics',
      'Life Orientation'
    ],
    'Tourism': [
      'English FAL',
      'Home Language',
      'Mathematical Literacy',
      'Tourism',
      'History',
      'Geography',
      'Life Orientation'
    ],
    'General': [
      'English FAL',
      'Home Language',
      'Mathematics',
      'Life Orientation'
    ]
  },
  '12': {
    'Science': [
      'English FAL',
      'Home Language',
      'Mathematics',
      'Physical Sciences',
      'Life Sciences',
      'Geography',
      'Life Orientation'
    ],
    'Commerce': [
      'English FAL',
      'Home Language',
      'Mathematics',
      'Accounting',
      'Business Studies',
      'Economics',
      'Life Orientation'
    ],
    'Tourism': [
      'English FAL',
      'Home Language',
      'Mathematical Literacy',
      'Tourism',
      'History',
      'Geography',
      'Life Orientation'
    ],
    'General': [
      'English FAL',
      'Home Language',
      'Mathematics',
      'Life Orientation'
    ]
  }
};

const SA_OFFICIAL_LANGUAGES_LIST = [
  'Sepedi',
  'Sesotho',
  'Setswana',
  'siSwati',
  'Tshivenda',
  'Xitsonga',
  'Afrikaans',
  'English',
  'isiNdebele',
  'isiXhosa',
  'isiZulu'
];

/**
 * Returns the official list of CAPS curriculum subjects for a given grade, stream, and chosen Home Language.
 * @param {number|string} grade - 8, 9, 10, 11, or 12
 * @param {string} [stream] - Science, Commerce, Tourism, or General
 * @param {string|null} [homeLanguage] - One of the 11 South African Official Languages
 * @returns {string[]} Array of subject names
 */
function getSubjectsForGradeAndStream(grade, stream, homeLanguage = null) {
  const gStr = String(grade || '8').replace(/\D/g, '') || '8';
  const gradeKey = ['8', '9', '10', '11', '12'].includes(gStr) ? gStr : '8';
  
  let baseList;
  if (gradeKey === '8' || gradeKey === '9') {
    baseList = [...STREAM_SUBJECTS[gradeKey]['General']];
  } else {
    const normalizedStream = stream ? stream.trim() : '';
    const validStream = Object.keys(STREAM_SUBJECTS[gradeKey]).find(
      s => s.toLowerCase() === normalizedStream.toLowerCase()
    ) || 'Science';
    baseList = [...(STREAM_SUBJECTS[gradeKey][validStream] || STREAM_SUBJECTS[gradeKey]['Science'])];
  }

  // Format Home Language subject entry if specified
  let langSubjectName = null;
  if (homeLanguage && typeof homeLanguage === 'string' && homeLanguage.trim() && homeLanguage.trim() !== 'Home Language') {
    const rawLang = homeLanguage.trim();
    const matchedOfficial = SA_OFFICIAL_LANGUAGES_LIST.find(l => l.toLowerCase() === rawLang.toLowerCase()) || rawLang;
    langSubjectName = matchedOfficial.toLowerCase().includes('home language') || matchedOfficial.toLowerCase().includes('huistaal')
      ? matchedOfficial
      : `${matchedOfficial} Home Language`;
  }

  return baseList.map(subj => {
    if (subj === 'Home Language' || subj === 'Home Language (HL)') {
      return langSubjectName || 'Select Home Language';
    }
    return subj;
  });
}

module.exports = {
  STREAM_SUBJECTS,
  SA_OFFICIAL_LANGUAGES_LIST,
  getSubjectsForGradeAndStream
};
