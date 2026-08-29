/**
 * Fusion High School - Admissions & Applications Multi-Step Engine
 * Real-Time Input Enforcement & Department of Home Affairs SA ID / Birth Certificate Verification
 */

let currentStep = 1;
const totalSteps = 4;
let resumptionToken = null;
let gradeCapacities = {};

// South African ID Validation Algorithm (Client-Side)
function validateSAIDClient(idNumber) {
  if (!idNumber || idNumber.length !== 13 || isNaN(idNumber)) {
    return { isValid: false, error: 'ID must be exactly 13 digits.' };
  }

  // Luhn Check
  let nCheck = 0;
  let bEven = false;
  for (let n = idNumber.length - 1; n >= 0; n--) {
    let cDigit = idNumber.charAt(n);
    let nDigit = parseInt(cDigit, 10);
    if (bEven) {
      if ((nDigit *= 2) > 9) nDigit -= 9;
    }
    nCheck += nDigit;
    bEven = !bEven;
  }

  if (nCheck % 10 !== 0) {
    return { isValid: false, error: 'Invalid South African ID checksum.' };
  }

  // Extract Date of Birth
  const year = idNumber.substring(0, 2);
  const month = idNumber.substring(2, 4);
  const day = idNumber.substring(4, 6);

  const currentYear2Digits = new Date().getFullYear() % 100;
  const century = parseInt(year, 10) <= currentYear2Digits ? '20' : '19';
  const fullYear = century + year;

  const dobDate = new Date(`${fullYear}-${month}-${day}`);
  if (isNaN(dobDate.getTime())) {
    return { isValid: false, error: 'Invalid birth date encoded in ID.' };
  }

  // Extract Gender (digits 7-10)
  const genderCode = parseInt(idNumber.substring(6, 10), 10);
  const gender = genderCode < 5000 ? 'Female' : 'Male';

  // Extract Citizenship (11th digit)
  const citizenshipCode = parseInt(idNumber.substring(10, 11), 10);
  const citizenship = citizenshipCode === 0 ? 'South Africa' : 'Permanent Resident';

  return {
    isValid: true,
    dob: `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    gender,
    citizenship
  };
}

function calculateAge(dobString) {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// Regex rules
const NAME_PATTERN = /^[A-Za-z\s\-']+$/;
const PHONE_PATTERN = /^(\+27|0)[0-9]{9}$/;

// DOM Initialization
document.addEventListener('DOMContentLoaded', async () => {
  initSchoolSelector();
  initRealtimeInputEnforcement();
  initStepper();
  initIDAutofill();
  initGradeAndStream();
  initAddressSync();
  initFileUploads();
  initFormSubmission();
  await loadCapacityData();
  checkUrlForResumption();
});

/**
 * Institutional High School Selector Engine
 */
function initSchoolSelector() {
  const schoolSelect = document.getElementById('school_id');
  if (!schoolSelect) return;

  const emisTag = document.getElementById('school-emis-tag');
  const circuitText = document.getElementById('school-circuit-text');
  const mottoText = document.getElementById('school-motto-text');
  const brandBadge = document.getElementById('app-brand-badge');
  const portalTitle = document.getElementById('app-portal-title');

  function updateSchoolDisplay() {
    const selectedOpt = schoolSelect.options[schoolSelect.selectedIndex];
    if (!selectedOpt) return;
    const schoolName = selectedOpt.textContent.split('(')[0].trim();
    const emis = selectedOpt.getAttribute('data-emis') || '911220001';
    const circuit = selectedOpt.getAttribute('data-circuit') || 'Polokwane Central Circuit';
    const motto = selectedOpt.getAttribute('data-motto') || 'Innovate, Lead, Transform';

    if (emisTag) emisTag.textContent = `EMIS ${emis}`;
    if (circuitText) circuitText.textContent = `📍 Circuit: ${circuit} • Limpopo DBE`;
    if (mottoText) mottoText.textContent = `"${motto}"`;
    if (brandBadge) brandBadge.textContent = `⚡ ${schoolName} Admissions`;
    if (portalTitle) portalTitle.textContent = `${schoolName} Learner Admissions`;
  }

  schoolSelect.addEventListener('change', updateSchoolDisplay);

  // Auto-detect school from URL parameters (?school=makgoka-high or ?school_id=3)
  const urlParams = new URLSearchParams(window.location.search);
  const targetSchool = urlParams.get('school') || urlParams.get('school_id') || urlParams.get('slug');
  if (targetSchool) {
    for (let i = 0; i < schoolSelect.options.length; i++) {
      const opt = schoolSelect.options[i];
      if (opt.value === targetSchool || opt.getAttribute('data-slug') === targetSchool) {
        schoolSelect.selectedIndex = i;
        break;
      }
    }
  }
  updateSchoolDisplay();

  // Load fresh schools directory from API
  fetch('/api/schools')
    .then(res => res.json())
    .then(schools => {
      if (Array.isArray(schools) && schools.length > 0) {
        const currentVal = schoolSelect.value;
        schoolSelect.innerHTML = '';
        schools.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.setAttribute('data-slug', s.slug);
          opt.setAttribute('data-emis', s.emis_number || '');
          opt.setAttribute('data-circuit', s.circuit || '');
          opt.setAttribute('data-motto', s.motto || '');
          opt.textContent = `${s.name} (${s.circuit || 'Limpopo'})`;
          if (String(s.id) === String(currentVal) || (targetSchool && (s.slug === targetSchool || String(s.id) === targetSchool))) {
            opt.selected = true;
          }
          schoolSelect.appendChild(opt);
        });
        updateSchoolDisplay();
      }
    })
    .catch(err => console.warn('Using static school dropdown defaults:', err));
}

/**
 * Real-Time Input Enforcement Engine
 */
function initRealtimeInputEnforcement() {
  // 1. Text-Only Fields (Names, Surnames, Citizenship, Occupations)
  const textOnlyInputs = document.querySelectorAll('[data-type="text-only"]');
  textOnlyInputs.forEach(input => {
    input.addEventListener('input', () => {
      const originalValue = input.value;
      
      if (/\d/.test(originalValue)) {
        showError(input.id, 'Numbers are not allowed in this field. Please use letters only.');
        input.value = originalValue.replace(/\d/g, '');
        shakeElement(input);
        checkStepFormValidity();
        return;
      }

      if (/[^A-Za-z\s\-']/.test(originalValue)) {
        showError(input.id, 'Special symbols are not allowed. Letters, spaces, and hyphens only.');
        input.value = originalValue.replace(/[^A-Za-z\s\-']/g, '');
        shakeElement(input);
        checkStepFormValidity();
        return;
      }

      if (input.value.trim().length > 0) {
        clearFieldError(input.id);
      }
      checkStepFormValidity();
    });

    input.addEventListener('blur', () => {
      if (input.hasAttribute('required') && !input.value.trim()) {
        showError(input.id, 'This field is required and cannot be left blank.');
      }
      checkStepFormValidity();
    });
  });

  // 2. Numeric-Only Fields (ID Numbers)
  const numericOnlyInputs = document.querySelectorAll('[data-type="numeric-only"]');
  numericOnlyInputs.forEach(input => {
    input.addEventListener('input', () => {
      const originalValue = input.value;

      if (/[^\d]/.test(originalValue)) {
        showError(input.id, 'Letters and words are not allowed in this field. Numbers only.');
        input.value = originalValue.replace(/\D/g, '');
        shakeElement(input);
        checkStepFormValidity();
        return;
      }

      if (input.value.length === 13) {
        const val = validateSAIDClient(input.value);
        if (!val.isValid) {
          showError(input.id, val.error);
        } else {
          clearFieldError(input.id);
        }
      } else if (input.value.length > 0 && input.value.length < 13 && input.id === 'id_number') {
        showError(input.id, `Please enter all 13 digits (${input.value.length}/13 entered).`);
      } else {
        clearFieldError(input.id);
      }

      checkStepFormValidity();
    });
  });

  // 3. Phone-Only Fields
  const phoneOnlyInputs = document.querySelectorAll('[data-type="phone-only"]');
  phoneOnlyInputs.forEach(input => {
    input.addEventListener('input', () => {
      const originalValue = input.value;

      if (/[a-zA-Z]/.test(originalValue)) {
        showError(input.id, 'Letters and words are not allowed in phone numbers. Numbers only.');
        input.value = originalValue.replace(/[a-zA-Z]/g, '');
        shakeElement(input);
        checkStepFormValidity();
        return;
      }

      let cleaned = originalValue.replace(/[^\d+]/g, '');
      if (cleaned.lastIndexOf('+') > 0) {
        cleaned = '+' + cleaned.replace(/\+/g, '');
      }
      input.value = cleaned;

      const cleanDigits = cleaned.replace(/[\s-]/g, '');
      if (cleaned.length > 0 && !PHONE_PATTERN.test(cleanDigits)) {
        showError(input.id, 'Phone format: 0XXXXXXXXX (10 digits) or +27XXXXXXXXX');
      } else {
        clearFieldError(input.id);
      }

      checkStepFormValidity();
    });
  });

  // 4. Email validation
  document.querySelectorAll('input[type="email"]').forEach(input => {
    input.addEventListener('input', () => {
      const val = input.value.trim();
      if (val.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        showError(input.id, 'Please enter a valid email format (e.g., name@domain.com).');
      } else {
        clearFieldError(input.id);
      }
      checkStepFormValidity();
    });
  });
}

function shakeElement(el) {
  if (!el) return;
  el.style.borderColor = '#ef4444';
  el.style.transform = 'translateX(4px)';
  setTimeout(() => { el.style.transform = 'translateX(-4px)'; }, 50);
  setTimeout(() => { el.style.transform = 'translateX(4px)'; }, 100);
  setTimeout(() => { el.style.transform = 'translateX(0)'; }, 150);
}

function checkStepFormValidity() {
  const activeCard = document.getElementById(`step-${currentStep}`);
  if (!activeCard) return;

  const hasErrors = activeCard.querySelectorAll('.form-group.has-error').length > 0;
  const nextBtn = document.getElementById('btn-next');
  const submitBtn = document.getElementById('btn-submit');

  if (nextBtn && currentStep < totalSteps) {
    nextBtn.disabled = hasErrors;
  }
  if (submitBtn && currentStep === totalSteps) {
    submitBtn.disabled = hasErrors;
  }
}

/**
 * Load Real-Time Capacity
 */
async function loadCapacityData() {
  try {
    const res = await fetch('/api/applications/capacity');
    if (res.ok) {
      const data = await res.json();
      if (data.capacity) {
        gradeCapacities = data.capacity.gradeBreakdown || {};
        updateCapacityBadges(data.capacity);
      }
    }
  } catch (err) {
    console.warn('[CAPACITY] Could not load live capacity:', err);
  }
}

function updateCapacityBadges(cap) {
  const schoolBadge = document.getElementById('school-capacity-badge');
  if (schoolBadge) {
    const remaining = cap.schoolRemainingSpace;
    schoolBadge.innerHTML = `<strong>${cap.totalCurrentLearners} / ${cap.schoolMaxCapacity}</strong> enrolled (<span style="color:${remaining > 20 ? '#34d399' : '#fbbf24'}">${remaining} spots available</span>)`;
  }
}

/**
 * Multi-Step Navigation
 */
function initStepper() {
  const nextBtn = document.getElementById('btn-next');
  const prevBtn = document.getElementById('btn-prev');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        if (currentStep < totalSteps) {
          goToStep(currentStep + 1);
        }
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentStep > 1) {
        goToStep(currentStep - 1);
      }
    });
  }
}

function goToStep(step) {
  document.querySelectorAll('.form-step-card').forEach(card => card.classList.remove('active'));
  document.querySelectorAll('.step-item').forEach((item, index) => {
    item.classList.remove('active');
    if (index + 1 < step) {
      item.classList.add('completed');
    } else {
      item.classList.remove('completed');
    }
  });

  const targetCard = document.getElementById(`step-${step}`);
  const targetItem = document.getElementById(`step-nav-${step}`);
  if (targetCard) targetCard.classList.add('active');
  if (targetItem) targetItem.classList.add('active');

  const progressFill = document.querySelector('.stepper-progress-fill');
  if (progressFill) {
    const percent = ((step - 1) / (totalSteps - 1)) * 100;
    progressFill.style.width = `${percent}%`;
  }

  currentStep = step;

  // Toggle prev/next button visibility
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const submitBtn = document.getElementById('btn-submit');

  if (prevBtn) prevBtn.style.display = step === 1 ? 'none' : 'inline-flex';
  if (nextBtn) nextBtn.style.display = step === totalSteps ? 'none' : 'inline-flex';
  if (submitBtn) submitBtn.style.display = step === totalSteps ? 'inline-flex' : 'none';

  // Ensure age UI is synchronized when arriving at Step 4
  const dobVal = document.getElementById('dob')?.value;
  if (dobVal) {
    updateAgeRequirementUI(dobVal);
  }

  checkStepFormValidity();
  window.scrollTo({ top: 100, behavior: 'smooth' });
}

/**
 * Step Validation
 */
function validateStep(step) {
  let isValid = true;
  let firstInvalidElement = null;

  if (step === 1) {
    const firstName = document.getElementById('first_name');
    const surname = document.getElementById('surname');
    const idNumber = document.getElementById('id_number');
    const grade = document.getElementById('grade_applied');
    const address = document.getElementById('physical_address');
    const phone = document.getElementById('learner_phone');
    const dob = document.getElementById('dob');

    if (!firstName.value.trim() || !NAME_PATTERN.test(firstName.value.trim())) {
      showError('first_name', 'Please enter a valid first name (letters only, no numbers).');
      if (!firstInvalidElement) firstInvalidElement = firstName;
      isValid = false;
    }

    if (!surname.value.trim() || !NAME_PATTERN.test(surname.value.trim())) {
      showError('surname', 'Please enter a valid surname (letters only, no numbers).');
      if (!firstInvalidElement) firstInvalidElement = surname;
      isValid = false;
    }

    const cleanId = (idNumber.value || '').replace(/\D/g, '');
    if (!cleanId || cleanId.length !== 13) {
      showError('id_number', 'Please enter a complete 13-digit South African ID number.');
      if (!firstInvalidElement) firstInvalidElement = idNumber;
      isValid = false;
    } else {
      const saVal = validateSAIDClient(cleanId);
      if (!saVal.isValid) {
        showError('id_number', saVal.error);
        if (!firstInvalidElement) firstInvalidElement = idNumber;
        isValid = false;
      }
    }

    if (!dob.value) {
      showError('dob', 'Date of Birth is required.');
      if (!firstInvalidElement) firstInvalidElement = dob;
      isValid = false;
    }

    if (!grade.value) {
      showError('grade_applied', 'Please select the grade you are applying for.');
      if (!firstInvalidElement) firstInvalidElement = grade;
      isValid = false;
    }

    const homeLang = document.getElementById('home_language');
    if (!homeLang || !homeLang.value) {
      showError('home_language', 'Please select your official Home Language.');
      if (!firstInvalidElement) firstInvalidElement = homeLang;
      isValid = false;
    }

    if (!address.value.trim() || address.value.trim().length < 6) {
      showError('physical_address', 'Please provide a complete physical residential address.');
      if (!firstInvalidElement) firstInvalidElement = address;
      isValid = false;
    }

    if (phone.value.trim() && !PHONE_PATTERN.test(phone.value.trim().replace(/[\s-]/g, ''))) {
      showError('learner_phone', 'Invalid phone number. Must start with +27 or 0, followed by 9 digits.');
      if (!firstInvalidElement) firstInvalidElement = phone;
      isValid = false;
    }
  }

  if (step === 2) {
    const pName = document.getElementById('primary_parent_name');
    const pSurname = document.getElementById('primary_parent_surname');
    const pRel = document.getElementById('primary_parent_relationship');
    const pId = document.getElementById('primary_parent_id_number');
    const pPhone = document.getElementById('primary_parent_phone');
    const pEmail = document.getElementById('primary_parent_email');
    const pAddress = document.getElementById('primary_parent_address');

    if (!pName.value.trim() || !NAME_PATTERN.test(pName.value.trim())) {
      showError('primary_parent_name', 'Primary parent name must only contain letters (no numbers).');
      if (!firstInvalidElement) firstInvalidElement = pName;
      isValid = false;
    }
    if (!pSurname.value.trim() || !NAME_PATTERN.test(pSurname.value.trim())) {
      showError('primary_parent_surname', 'Primary parent surname must only contain letters (no numbers).');
      if (!firstInvalidElement) firstInvalidElement = pSurname;
      isValid = false;
    }
    if (!pRel.value) {
      showError('primary_parent_relationship', 'Please select the parent/guardian relationship.');
      if (!firstInvalidElement) firstInvalidElement = pRel;
      isValid = false;
    }
    if (!pId.value.trim() || pId.value.trim().length < 6) {
      showError('primary_parent_id_number', 'Please enter a valid parent ID number (numbers only).');
      if (!firstInvalidElement) firstInvalidElement = pId;
      isValid = false;
    }
    const cleanPhone = (pPhone.value || '').replace(/[\s-]/g, '');
    if (!cleanPhone || !PHONE_PATTERN.test(cleanPhone)) {
      showError('primary_parent_phone', 'Phone must start with +27 or 0 followed by 9 digits.');
      if (!firstInvalidElement) firstInvalidElement = pPhone;
      isValid = false;
    }
    if (!pEmail.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pEmail.value.trim())) {
      showError('primary_parent_email', 'Please enter a valid email address.');
      if (!firstInvalidElement) firstInvalidElement = pEmail;
      isValid = false;
    }
    if (!pAddress.value.trim() || pAddress.value.trim().length < 6) {
      showError('primary_parent_address', 'Primary parent physical address is required.');
      if (!firstInvalidElement) firstInvalidElement = pAddress;
      isValid = false;
    }
  }

  if (step === 3) {
    const gradeVal = parseInt(document.getElementById('grade_applied').value, 10);
    const prevSchool = document.getElementById('previous_school');

    if (gradeVal > 8 && (!prevSchool.value.trim() || prevSchool.value.trim().length < 3)) {
      showError('previous_school', `Previous school name is required for Grade ${gradeVal} transfer admission.`);
      if (!firstInvalidElement) firstInvalidElement = prevSchool;
      isValid = false;
    }
  }

  if (step === 4) {
    const dobVal = document.getElementById('dob')?.value;
    const age = calculateAge(dobVal);
    const learnerIdDoc = document.getElementById('learner_id_doc');
    const birthCertDoc = document.getElementById('birth_certificate');
    const parentIdDoc = document.getElementById('parent_id_doc');
    const proofResDoc = document.getElementById('proof_of_residence');
    const reportCardDoc = document.getElementById('report_card');
    const gradeVal = parseInt(document.getElementById('grade_applied').value, 10);

    // 16+ Strict SA ID requirement vs Under 16 Birth Certificate
    if (age !== null && age >= 16) {
      if (!learnerIdDoc.files || learnerIdDoc.files.length === 0) {
        showModal('error', 'Document Required', `Learner is ${age} years old (16+). South African law requires an official ID Document (Smart ID Card or Green Book), not a Birth Certificate.`);
        const cardLearnerId = document.getElementById('card-learner-id');
        cardLearnerId.scrollIntoView({ behavior: 'smooth' });
        shakeElement(cardLearnerId);
        return false;
      }
    } else {
      if ((!birthCertDoc.files || birthCertDoc.files.length === 0) && (!learnerIdDoc.files || learnerIdDoc.files.length === 0)) {
        showModal('error', 'Document Required', `Learner is under 16 years old. An official Birth Certificate is required.`);
        const cardBirthCert = document.getElementById('card-birth-cert');
        cardBirthCert.scrollIntoView({ behavior: 'smooth' });
        shakeElement(cardBirthCert);
        return false;
      }
    }

    if (!parentIdDoc.files || parentIdDoc.files.length === 0) {
      showModal('error', 'Document Required', 'Parent / Legal Guardian certified ID document is required.');
      const cardParentId = document.getElementById('card-parent-id');
      cardParentId.scrollIntoView({ behavior: 'smooth' });
      shakeElement(cardParentId);
      return false;
    }

    if (!proofResDoc.files || proofResDoc.files.length === 0) {
      showModal('error', 'Document Required', 'Proof of Residential Address (< 3 months old) is required.');
      const cardProofRes = document.getElementById('card-proof-residence');
      cardProofRes.scrollIntoView({ behavior: 'smooth' });
      shakeElement(cardProofRes);
      return false;
    }

    if (gradeVal > 8 && (!reportCardDoc.files || reportCardDoc.files.length === 0)) {
      showModal('error', 'Document Required', `Latest Academic Report Card is required for Grade ${gradeVal} transfer admission.`);
      const cardReportCard = document.getElementById('card-report-card');
      cardReportCard.scrollIntoView({ behavior: 'smooth' });
      shakeElement(cardReportCard);
      return false;
    }
  }

  if (!isValid && firstInvalidElement) {
    firstInvalidElement.focus();
    shakeElement(firstInvalidElement);
  }

  return isValid;
}

function showError(fieldId, message) {
  const el = document.getElementById(fieldId);
  if (el) {
    const group = el.closest('.form-group');
    if (group) {
      group.classList.add('has-error');
      let errSpan = group.querySelector('.field-error');
      if (!errSpan) {
        errSpan = document.createElement('div');
        errSpan.className = 'field-error';
        group.appendChild(errSpan);
      }
      
      const cleanText = (message || '').replace(/^[❌⚠️✖🚫]\s*/, '');
      const forbiddenIconSvg = `<svg class="error-icon" style="width:13px;height:13px;display:inline-block;vertical-align:-1.5px;margin-right:6px;flex-shrink:0;color:#ef4444;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;
      
      errSpan.innerHTML = `${forbiddenIconSvg}<span>${cleanText}</span>`;
      errSpan.style.display = 'flex';
      errSpan.style.alignItems = 'center';
    }
  }
}

function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  if (el) {
    const group = el.closest('.form-group');
    if (group) {
      group.classList.remove('has-error');
      const errSpan = group.querySelector('.field-error');
      if (errSpan) {
        errSpan.textContent = '';
        errSpan.style.display = 'none';
      }
    }
  }
}

function clearErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(g => {
    g.classList.remove('has-error');
    const errSpan = g.querySelector('.field-error');
    if (errSpan) errSpan.style.display = 'none';
  });
}

/**
 * South African ID Autofill, Age Calculation, and Document Requirements Sync
 */
function initIDAutofill() {
  const idInput = document.getElementById('id_number');
  const dobInput = document.getElementById('dob');
  const genderSelect = document.getElementById('gender');
  const citizenInput = document.getElementById('citizenship');
  const statusBox = document.getElementById('id-validation-status');

  if (idInput) {
    idInput.addEventListener('input', () => {
      const clean = idInput.value.replace(/\D/g, '');
      idInput.value = clean;

      if (clean.length === 13) {
        const val = validateSAIDClient(clean);
        if (val.isValid) {
          if (dobInput) {
            dobInput.value = val.dob;
            updateAgeRequirementUI(val.dob);
          }
          if (genderSelect) genderSelect.value = val.gender;
          if (citizenInput) citizenInput.value = val.citizenship;

          if (statusBox) {
            statusBox.className = 'id-status-box valid';
            statusBox.style.display = 'flex';
            statusBox.innerHTML = `<span>&#10004;</span> <strong>Valid SA ID:</strong> Date of Birth (${val.dob}) and Gender (${val.gender}) auto-populated.`;
          }
          clearFieldError('id_number');
        } else {
          if (statusBox) {
            statusBox.className = 'id-status-box invalid';
            statusBox.style.display = 'flex';
            statusBox.innerHTML = `<span>&#9888;</span> ${val.error}`;
          }
          showError('id_number', `❌ ${val.error}`);
        }
      } else {
        if (statusBox) statusBox.style.display = 'none';
      }
    });
  }

  if (dobInput) {
    dobInput.addEventListener('change', () => {
      updateAgeRequirementUI(dobInput.value);
    });
  }
}

/**
 * Update Dynamic UI according to 16+ SA ID vs Under 16 Birth Certificate Rule
 */
function updateAgeRequirementUI(dobString) {
  const age = calculateAge(dobString);
  const container = document.getElementById('age-requirement-container');
  const pillText = document.getElementById('age-pill-text');
  const pillIcon = document.getElementById('age-pill-icon');
  
  const step4NoticeText = document.getElementById('step4-age-text');
  const step4NoticeIcon = document.getElementById('step4-age-icon');
  
  const cardLearnerId = document.getElementById('card-learner-id');
  const tagLearnerId = document.getElementById('tag-learner-id');
  const descLearnerId = document.getElementById('desc-learner-id');
  
  const cardBirthCert = document.getElementById('card-birth-cert');
  const tagBirthCert = document.getElementById('tag-birth-cert');
  const descBirthCert = document.getElementById('desc-birth-cert');

  if (age !== null && age >= 0) {
    if (container) container.style.display = 'block';
    
    if (age >= 16) {
      if (pillIcon) pillIcon.innerHTML = '🪪';
      if (pillText) pillText.innerHTML = `<strong>Learner Age: ${age} years old</strong> — Official South African ID Document (Smart ID Card / Green Book) is <strong>MANDATORY</strong> (Birth Certificate not required).`;
      
      if (step4NoticeIcon) step4NoticeIcon.innerHTML = '🪪';
      if (step4NoticeText) step4NoticeText.innerHTML = `<strong>Learner Age: ${age} years (16+)</strong> — As per Department of Home Affairs regulations, learners aged 16 and older <strong>must provide their official SA ID Document</strong> (Birth certificate not required).`;

      // Highlight ID Document as required
      if (cardLearnerId) {
        cardLearnerId.style.border = '2px solid #38bdf8';
        cardLearnerId.style.background = 'rgba(56, 189, 248, 0.08)';
      }
      if (tagLearnerId) tagLearnerId.style.display = 'inline';
      if (descLearnerId) descLearnerId.textContent = `MANDATORY for Age ${age}: Upload certified copy of Smart ID Card (Front & Back) or Green ID Book.`;

      // Mark Birth Cert as optional
      if (cardBirthCert) {
        cardBirthCert.style.border = '1px dashed #475569';
        cardBirthCert.style.background = 'transparent';
      }
      if (tagBirthCert) tagBirthCert.style.display = 'none';
      if (descBirthCert) descBirthCert.textContent = `Optional (Not required for applicants aged 16 and older).`;
    } else {
      if (pillIcon) pillIcon.innerHTML = '📄';
      if (pillText) pillText.innerHTML = `<strong>Learner Age: ${age} years old</strong> — Official Birth Certificate (Unabridged/Abridged) is <strong>MANDATORY</strong> (Applicant is under 16).`;
      
      if (step4NoticeIcon) step4NoticeIcon.innerHTML = '📄';
      if (step4NoticeText) step4NoticeText.innerHTML = `<strong>Learner Age: ${age} years (Under 16)</strong> — Official <strong>Birth Certificate</strong> is mandatory for learners under 16.`;

      // Highlight Birth Certificate as required
      if (cardBirthCert) {
        cardBirthCert.style.border = '2px solid #38bdf8';
        cardBirthCert.style.background = 'rgba(56, 189, 248, 0.08)';
      }
      if (tagBirthCert) tagBirthCert.style.display = 'inline';
      if (descBirthCert) descBirthCert.textContent = `MANDATORY for Age ${age}: Upload official Unabridged or Abridged Birth Certificate.`;

      // Mark ID Document as optional
      if (cardLearnerId) {
        cardLearnerId.style.border = '1px dashed #475569';
        cardLearnerId.style.background = 'transparent';
      }
      if (tagLearnerId) tagLearnerId.style.display = 'none';
      if (descLearnerId) descLearnerId.textContent = `Optional (Only if learner already has an ID).`;
    }
  }
}

/**
 * Grade and Stream Dynamic Switching
 */
function initGradeAndStream() {
  const gradeSelect = document.getElementById('grade_applied');
  const streamGroup = document.getElementById('stream-selection-group');
  const streamSelect = document.getElementById('stream');
  const homeLangSelect = document.getElementById('home_language');
  const gradeCapacityNotice = document.getElementById('grade-capacity-indicator');
  const streamHint = document.getElementById('stream-compulsory-hint');

  function updateStreamHint() {
    const lang = (homeLangSelect && homeLangSelect.value) ? homeLangSelect.value : 'Selected Home Language';
    const stream = streamSelect ? streamSelect.value : 'Science';
    if (streamHint) {
      streamHint.innerHTML = `Compulsory Core: English FAL, <strong>${lang} (Home Language)</strong>, Life Orientation + ${stream} Electives.`;
    }
  }

  if (gradeSelect) {
    gradeSelect.addEventListener('change', () => {
      const grade = parseInt(gradeSelect.value, 10);
      if (grade >= 10) {
        if (streamGroup) streamGroup.style.display = 'block';
        updateStreamHint();
      } else {
        if (streamGroup) streamGroup.style.display = 'none';
      }

      if (gradeCapacityNotice && gradeCapacities[grade]) {
        const gInfo = gradeCapacities[grade];
        gradeCapacityNotice.innerHTML = `Grade ${grade} capacity: <strong>${gInfo.availableSpace} spots remaining</strong> (< 30 learners per class limit)`;
        gradeCapacityNotice.style.display = 'block';
      } else if (gradeCapacityNotice) {
        gradeCapacityNotice.style.display = 'none';
      }
    });
  }

  if (homeLangSelect) {
    homeLangSelect.addEventListener('change', () => {
      clearFieldError('home_language');
      updateStreamHint();
    });
  }

  if (streamSelect) {
    streamSelect.addEventListener('change', () => {
      updateStreamHint();
    });
  }
}

/**
 * Address Sync: "Same as Learner" Toggle
 */
function initAddressSync() {
  const sameAddressCheckbox = document.getElementById('same_as_learner_address');
  const learnerAddressInput = document.getElementById('physical_address');
  const parentAddressInput = document.getElementById('primary_parent_address');

  if (sameAddressCheckbox && learnerAddressInput && parentAddressInput) {
    sameAddressCheckbox.addEventListener('change', () => {
      if (sameAddressCheckbox.checked) {
        parentAddressInput.value = learnerAddressInput.value;
        parentAddressInput.setAttribute('readonly', 'true');
        parentAddressInput.style.opacity = '0.7';
        clearFieldError('primary_parent_address');
      } else {
        parentAddressInput.removeAttribute('readonly');
        parentAddressInput.style.opacity = '1';
      }
    });

    learnerAddressInput.addEventListener('input', () => {
      if (sameAddressCheckbox.checked) {
        parentAddressInput.value = learnerAddressInput.value;
        clearFieldError('primary_parent_address');
      }
    });
  }

  const hasSecCheckbox = document.getElementById('has_secondary_parent');
  const secContainer = document.getElementById('secondary-parent-section');
  if (hasSecCheckbox && secContainer) {
    hasSecCheckbox.addEventListener('change', () => {
      secContainer.style.display = hasSecCheckbox.checked ? 'block' : 'none';
    });
  }
}

/**
 * File Uploads Preview Handlers
 */
function initFileUploads() {
  document.querySelectorAll('.upload-card input[type="file"]').forEach(input => {
    input.addEventListener('change', () => {
      const card = input.closest('.upload-card');
      const preview = card ? card.querySelector('.upload-preview') : null;
      if (input.files && input.files[0]) {
        const file = input.files[0];
        if (preview) {
          const sizeKb = Math.round(file.size / 1024);
          preview.textContent = `Attached: ${file.name} (${sizeKb} KB)`;
          preview.style.display = 'block';
        }
        card.style.borderColor = '#10b981';
      }
    });
  });
}

/**
 * Handle URL Resumption Token
 */
async function checkUrlForResumption() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('resume');
  if (!token) return;

  resumptionToken = token;
  const banner = document.getElementById('resume-alert-banner');
  const bannerList = document.getElementById('resume-issues-list');

  try {
    const res = await fetch(`/api/applications/resume/${token}`);
    if (!res.ok) {
      alert('Application resumption link is invalid or expired.');
      return;
    }

    const data = await res.json();
    const app = data.application;

    if (app.school_id && document.getElementById('school_id')) {
      document.getElementById('school_id').value = app.school_id;
      document.getElementById('school_id').dispatchEvent(new Event('change'));
    }
    document.getElementById('first_name').value = app.first_name || '';
    document.getElementById('surname').value = app.surname || '';
    document.getElementById('id_number').value = app.id_number || '';
    document.getElementById('dob').value = app.dob ? app.dob.split('T')[0] : '';
    document.getElementById('gender').value = app.gender || 'Other';
    document.getElementById('citizenship').value = app.citizenship || 'South Africa';
    document.getElementById('learner_phone').value = app.phone || '';
    document.getElementById('physical_address').value = app.physical_address || '';
    document.getElementById('grade_applied').value = app.grade_applied || '8';
    document.getElementById('grade_applied').dispatchEvent(new Event('change'));
    if (app.stream && document.getElementById('stream')) document.getElementById('stream').value = app.stream;
    if (app.home_language && document.getElementById('home_language')) document.getElementById('home_language').value = app.home_language;

    if (app.dob) {
      updateAgeRequirementUI(app.dob.split('T')[0]);
    }

    document.getElementById('previous_school').value = app.previous_school || '';
    document.getElementById('previous_grade').value = app.previous_grade || '';
    document.getElementById('transfer_reason').value = app.transfer_reason || '';
    document.getElementById('medical_info').value = app.medical_info || '';
    document.getElementById('special_needs').value = app.special_needs || '';

    document.getElementById('primary_parent_name').value = app.primary_parent_name || '';
    document.getElementById('primary_parent_surname').value = app.primary_parent_surname || '';
    document.getElementById('primary_parent_relationship').value = app.primary_parent_relationship || 'Mother';
    document.getElementById('primary_parent_id_number').value = app.primary_parent_id_number || '';
    document.getElementById('primary_parent_phone').value = app.primary_parent_phone || '';
    document.getElementById('primary_parent_email').value = app.primary_parent_email || '';
    document.getElementById('primary_parent_address').value = app.primary_parent_address || '';
    document.getElementById('primary_parent_occupation').value = app.primary_parent_occupation || '';
    document.getElementById('primary_parent_employer').value = app.primary_parent_employer || '';

    if (app.has_secondary_parent) {
      document.getElementById('has_secondary_parent').checked = true;
      document.getElementById('secondary-parent-section').style.display = 'block';
      document.getElementById('secondary_parent_name').value = app.secondary_parent_name || '';
      document.getElementById('secondary_parent_surname').value = app.secondary_parent_surname || '';
      document.getElementById('secondary_parent_relationship').value = app.secondary_parent_relationship || '';
      document.getElementById('secondary_parent_id_number').value = app.secondary_parent_id_number || '';
      document.getElementById('secondary_parent_phone').value = app.secondary_parent_phone || '';
      document.getElementById('secondary_parent_email').value = app.secondary_parent_email || '';
      document.getElementById('secondary_parent_address').value = app.secondary_parent_address || '';
    }

    if (banner && bannerList && app.ai_verification_notes) {
      const issues = Array.isArray(app.ai_verification_notes) ? app.ai_verification_notes : JSON.parse(app.ai_verification_notes || '[]');
      bannerList.innerHTML = issues.map(i => `<li><strong>${i.field || 'Item'}:</strong> ${i.message || i}</li>`).join('');
      banner.style.display = 'block';
    }

  } catch (err) {
    console.error('Error resuming application:', err);
  }
}

/**
 * Handle Final Form Submission
 */
function initFormSubmission() {
  const form = document.getElementById('admissionApplicationForm');
  const submitBtn = document.getElementById('btn-submit');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
        return;
      }

      const formData = new FormData(form);

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner"></span> AI Document Verification in Progress...`;
      }

      const endpoint = resumptionToken 
        ? `/api/applications/resume/${resumptionToken}`
        : `/api/applications/apply`;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Submit Application & Verify`;
        }

        handleSubmissionResult(result);

      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Submit Application & Verify`;
        }
        alert('Submission failed. Please check your internet connection: ' + err.message);
      }
    });
  }
}

/**
 * Display Decision Modal
 */
function handleSubmissionResult(result) {
  const modal = document.getElementById('resultModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalIcon = document.getElementById('modalIcon');
  const modalBody = document.getElementById('modalBody');
  const modalRef = document.getElementById('modalRef');
  const modalCta = document.getElementById('modalCta');

  if (!modal) return;

  if (result.status === 'approved') {
    modalIcon.innerHTML = '🎉';
    modalTitle.textContent = 'Application Approved!';
    modalBody.innerHTML = `
      ${result.message}
      <br><br>
      An official acceptance confirmation has been sent to your email. You may now proceed to complete parent registration and link your child.
    `;
    modalRef.innerHTML = `
      <div>Application Ref: <strong>${result.applicationNumber}</strong></div>
      <div style="margin-top: 4px; color: #10b981;">Learner No: <strong>${result.learnerNumber}</strong></div>
    `;
    modalRef.style.display = 'block';
    modalCta.style.display = 'inline-block';
    modalCta.textContent = 'Continue to Parent Registration';
    modalCta.href = result.registrationUrl || '/register';
  } else if (result.status === 'action_required') {
    modalIcon.innerHTML = '⚠️';
    modalTitle.textContent = 'Action Required';
    const issuesHtml = (result.issues || []).map(i => `<li>${i.message || i}</li>`).join('');
    modalBody.innerHTML = `
      ${result.message}
      <ul style="text-align: left; margin: 14px 0; padding-left: 20px; color: #f87171; font-size: 0.88rem;">
        ${issuesHtml}
      </ul>
      A secure resumption link has also been emailed to you so you can return to fix this at any time.
    `;
    modalRef.innerHTML = `Application Ref: <strong>${result.applicationNumber}</strong>`;
    modalRef.style.display = 'block';
    modalCta.style.display = 'none';
  } else if (result.status === 'waitlisted') {
    modalIcon.innerHTML = `<svg style="width:48px;height:48px;color:#f59e0b;margin:0 auto;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    modalTitle.textContent = 'Application Placed on Waiting List';
    modalBody.innerHTML = `
      ${result.message}
      <br><br>
      Our admissions team will notify you immediately once an opening becomes available in this class.
    `;
    modalRef.innerHTML = `Application Ref: <strong>${result.applicationNumber}</strong>`;
    modalRef.style.display = 'block';
    modalCta.style.display = 'none';
  } else {
    modalIcon.innerHTML = `<svg style="width:48px;height:48px;color:#ef4444;margin:0 auto;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;
    modalTitle.textContent = 'Validation Notice';
    modalBody.innerHTML = result.error || 'Please correct errors on the form.';
    modalRef.style.display = 'none';
    modalCta.style.display = 'none';
  }

  modal.classList.add('active');
}
