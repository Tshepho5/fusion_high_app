/**
 * SA-SAMS → Geleza learner CSV helpers (pure, no DB).
 * Schools typically export via SA-SAMS Menu 16.3 → Learner Info (Excel → save as CSV).
 */

const GELEZA_FIELDS = [
  { key: 'full_name', label: 'First / full name', required: true },
  { key: 'surname', label: 'Surname', required: true },
  { key: 'id_number', label: 'SA ID number', required: false },
  { key: 'learner_number', label: 'Learner / admission number', required: false },
  { key: 'grade', label: 'Grade', required: false },
  { key: 'class_name', label: 'Class / register class', required: false },
  { key: 'stream', label: 'Stream', required: false },
  { key: 'gender', label: 'Gender', required: false },
  { key: 'dob', label: 'Date of birth', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'home_language', label: 'Home language', required: false },
  { key: 'physical_address', label: 'Address', required: false }
];

/** Normalized header → Geleza field (SA-SAMS + common school exports) */
const HEADER_ALIASES = {
  firstname: 'full_name',
  first_name: 'full_name',
  learnerfirstname: 'full_name',
  learnername: 'full_name',
  name: 'full_name',
  names: 'full_name',
  fullname: 'full_name',
  full_name: 'full_name',
  studentname: 'full_name',
  learner: 'full_name',

  surname: 'surname',
  lastname: 'surname',
  last_name: 'surname',
  learnersurname: 'surname',
  familyname: 'surname',

  idno: 'id_number',
  id_no: 'id_number',
  idnumber: 'id_number',
  id_number: 'id_number',
  rsaid: 'id_number',
  identitynumber: 'id_number',
  nationalid: 'id_number',
  said: 'id_number',

  admissionno: 'learner_number',
  admission_no: 'learner_number',
  admissionnumber: 'learner_number',
  admno: 'learner_number',
  learnernumber: 'learner_number',
  learner_number: 'learner_number',
  learnerno: 'learner_number',
  studentnumber: 'learner_number',
  lurits: 'learner_number',
  luritsnumber: 'learner_number',

  grade: 'grade',
  gr: 'grade',
  currentgrade: 'grade',
  gradelevel: 'grade',

  class: 'class_name',
  classname: 'class_name',
  class_name: 'class_name',
  registerclass: 'class_name',
  register_class: 'class_name',
  classdescription: 'class_name',
  class_description: 'class_name',
  homeroom: 'class_name',
  classgrade: 'class_name',

  stream: 'stream',
  pathway: 'stream',
  curriculumstream: 'stream',

  gender: 'gender',
  sex: 'gender',

  dob: 'dob',
  dateofbirth: 'dob',
  date_of_birth: 'dob',
  birthdate: 'dob',
  birth_date: 'dob',

  phone: 'phone',
  cell: 'phone',
  cellphone: 'phone',
  mobile: 'phone',
  telephone: 'phone',
  contactnumber: 'phone',

  email: 'email',
  emailaddress: 'email',
  e_mail: 'email',

  homelanguage: 'home_language',
  home_language: 'home_language',
  language: 'home_language',
  mothertongue: 'home_language',

  address: 'physical_address',
  physicaladdress: 'physical_address',
  residentialaddress: 'physical_address',
  homeaddress: 'physical_address'
};

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function detectDelimiter(firstLine) {
  const commas = (firstLine.match(/,/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  if (tabs >= commas && tabs >= semis && tabs > 0) return '\t';
  if (semis > commas) return ';';
  return ',';
}

/** RFC-style CSV line split with quotes */
function splitCsvLine(line, delimiter) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function parseCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  if (!raw.trim()) {
    return { headers: [], rows: [], delimiter: ',', error: 'File is empty.' };
  }
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { headers: [], rows: [], delimiter: ',', error: 'CSV needs a header row and at least one data row.' };
  }
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter);
    if (cells.every((c) => !String(c || '').trim())) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] != null ? String(cells[idx]).trim() : '';
    });
    rows.push(obj);
  }
  return { headers, rows, delimiter, error: null };
}

function resolveAlias(header) {
  const norm = normalizeHeader(header);
  if (HEADER_ALIASES[norm]) return HEADER_ALIASES[norm];
  const compact = norm.replace(/_/g, '');
  if (HEADER_ALIASES[compact]) return HEADER_ALIASES[compact];
  return null;
}

function autoMapHeaders(headers) {
  const mapping = {}; // gelezaField -> sourceHeader
  const used = new Set();
  for (const header of headers) {
    const field = resolveAlias(header);
    if (field && !mapping[field] && !used.has(header)) {
      mapping[field] = header;
      used.add(header);
    }
  }
  return mapping;
}

function normalizeGender(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith('m') || s === '1') return 'Male';
  if (s.startsWith('f') || s === '2') return 'Female';
  return String(v).trim();
}

function normalizeGrade(v) {
  if (v == null || v === '') return null;
  const m = String(v).match(/(\d{1,2})/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 8 || n > 12) return n; // still return; validator may warn
  return n;
}

function normalizeDob(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split('-');
    return `${y}-${m}-${d}`;
  }
  return s;
}

function mapRow(rawRow, mapping) {
  const get = (field) => {
    const header = mapping[field];
    if (!header) return '';
    return rawRow[header] != null ? String(rawRow[header]).trim() : '';
  };

  let full_name = get('full_name');
  let surname = get('surname');

  // If only a combined "Name" mapped to full_name and surname empty, split last token
  if (full_name && !surname && full_name.includes(' ')) {
    const parts = full_name.split(/\s+/);
    surname = parts.pop();
    full_name = parts.join(' ');
  }

  const id_number = get('id_number').replace(/\D/g, '');
  const phoneDigits = get('phone').replace(/\D/g, '');

  return {
    full_name,
    surname,
    id_number: id_number || null,
    learner_number: get('learner_number') || null,
    grade: normalizeGrade(get('grade')),
    class_name: get('class_name') || null,
    stream: get('stream') || null,
    gender: normalizeGender(get('gender')),
    dob: normalizeDob(get('dob')),
    phone: phoneDigits || null,
    email: (get('email') || '').toLowerCase() || null,
    home_language: get('home_language') || null,
    physical_address: get('physical_address') || null
  };
}

function validateMappedRow(row, index) {
  const errors = [];
  const warnings = [];
  if (!row.full_name || row.full_name.length < 2) errors.push('Missing first/full name');
  if (!row.surname || row.surname.length < 2) errors.push('Missing surname');
  if (row.full_name && /\d/.test(row.full_name)) errors.push('First name contains numbers');
  if (row.surname && /\d/.test(row.surname)) errors.push('Surname contains numbers');
  if (row.id_number && row.id_number.length !== 13) warnings.push('ID number is not 13 digits');
  if (row.phone && row.phone.length !== 10) warnings.push('Phone is not 10 digits');
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email');
  if (row.grade != null && (row.grade < 8 || row.grade > 12)) {
    warnings.push(`Grade ${row.grade} is outside 8–12 (will still import)`);
  }
  return {
    row_index: index,
    ok: errors.length === 0,
    errors,
    warnings,
    row
  };
}

function buildPreview(csvText, mappingOverride = null) {
  const parsed = parseCsv(csvText);
  if (parsed.error) {
    return { success: false, error: parsed.error };
  }
  const mapping = mappingOverride && Object.keys(mappingOverride).length
    ? mappingOverride
    : autoMapHeaders(parsed.headers);

  const requiredMissing = GELEZA_FIELDS.filter((f) => f.required && !mapping[f.key]).map((f) => f.key);
  const validated = parsed.rows.map((raw, i) => validateMappedRow(mapRow(raw, mapping), i + 1));
  const validCount = validated.filter((v) => v.ok).length;

  return {
    success: true,
    delimiter: parsed.delimiter,
    headers: parsed.headers,
    mapping,
    fields: GELEZA_FIELDS,
    required_missing: requiredMissing,
    total_rows: parsed.rows.length,
    valid_rows: validCount,
    invalid_rows: parsed.rows.length - validCount,
    preview: validated.slice(0, 25),
    rows: validated
  };
}

module.exports = {
  GELEZA_FIELDS,
  HEADER_ALIASES,
  normalizeHeader,
  parseCsv,
  autoMapHeaders,
  mapRow,
  validateMappedRow,
  buildPreview
};
