import { initMessageCenter } from './chat-center.js';

/**
 * UI Helper Functions - FUSION_HIGH_APP
 */

/**
 * Shows a loading spinner on a given element.
 * @param {HTMLElement} el The element to show the spinner on. Defaults to document.body.
 */
export function showLoading(el = document.body) {
  if (!el) return;
  el.classList.add('loading');
  if (!el.querySelector('.spinner')) {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    el.appendChild(spinner);
  }
}

/**
 * Hides the loading spinner from a given element.
 * @param {HTMLElement} el The element to hide the spinner from. Defaults to document.body.
 */
export function hideLoading(el = document.body) {
  if (!el) return;
  el.classList.remove('loading');
  const spinner = el.querySelector('.spinner');
  if (spinner) spinner.remove();
}

/**
 * Switches the active view/tab in a dashboard.
 * @param {string} tabId The ID of the section to show.
 * @param {HTMLElement} [el] The navigation element that was clicked.
 */
export function switchTab(tabId, el) {
  if ((tabId === 'assessments' || tabId === 'grades') && !document.getElementById(tabId)) {
    return switchTab('subjects', el);
  }

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const targetSection = document.getElementById(tabId);
  if (targetSection) targetSection.classList.add('active');
  if (el) {
    el.classList.add('active');
    document.getElementById('view-title').innerText = el.innerText;
  }
  location.hash = tabId;

  if (tabId === 'messages') {
    if (window.initMessageCenter) window.initMessageCenter();
  } else if (tabId === 'resources') {
    if (window.loadParentResources) window.loadParentResources();
  } else if (tabId === 'settings') {
    if (window.loadParentSettings) window.loadParentSettings();
  }
}


/**
 * Shows a specific section and hides others.
 * @param {string} sectionId The ID of the section to show.
 */
export function showSection(sectionId) {
  // Hide all sections marked with 'dashboard-section' class
  document.querySelectorAll('.dashboard-section').forEach(section => {
    section.style.display = 'none';
  });
  // Show the target section
  const target = document.getElementById(sectionId);
  if (target) target.style.display = 'block';

  // Focus on first editable field
  const firstInput = target.querySelector('input:not([disabled]):not([readonly]), select:not([disabled])');
  if (firstInput) firstInput.focus();
}

/**
 * Generates a consistent color for a given subject name.
 * @param {string} subject The name of the subject.
 * @returns {string} A hex or hsl color string.
 */
export function getColorForSubject(subject) {
    const subjectColorMap = {
        'Mathematics': '#be123c', 'Physical Sciences': '#0e7490', 'Life Sciences': '#15803d',
        'Accounting': '#581c87', 'Business Studies': '#86198f', 'Economics': '#701a75',
        'Tourism': '#065f46', 'Mathematical Literacy': '#9f1239', 'English FAL': '#1d4ed8',
        'Home Language': '#1e3a8a', 'Life Orientation': '#7c2d12', 'Natural Sciences': '#166534',
        'Social Sciences': '#b45309', 'Technology': '#4a5568', 'EMS': '#7f1d1d', 'Creative Arts': '#5b21b6'
    };
    if (subjectColorMap[subject]) return subjectColorMap[subject];
    let hash = 0;
    for (let i = 0; i < (subject || '').length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 50%, 25%)`;
}