// Main App Logic - FUSION_HIGH_APP

import { getProfile } from './api.js';

// Check if logged in on load
document.addEventListener('DOMContentLoaded', checkAuth);

function checkAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    getProfile().then(user => {
      loadDashboard(user.role);
    }).catch(() => {
      localStorage.removeItem('token');
    });
  }
}

export function loadDashboard(role) {
  window.location.href = `/dashboard/${role}`;
}

// Sidebar navigation for Subjects
window.viewSubjects = function () {
  showSection('subjects-section');
  loadLearnerDashboard(); // Ensure subjects are loaded and AI-ready
};

// Dashboard loader (used in dashboard.html)
window.loadDashboardContent = async function () {
  const role = localStorage.getItem('userRole');
  document.body.classList.add('dashboard');
  document.querySelector('.dashboard-header h1').textContent = `Welcome to Dashboard - ${role.charAt(0).toUpperCase() + role.slice(1)}`;
  document.querySelector('.role-badge').textContent = role.toUpperCase();

  switch (role) {
    case 'parent':
      if (window.loadParentDashboard) await window.loadParentDashboard();
      break;
    case 'teacher':
      if (window.loadTeacherDashboard) await window.loadTeacherDashboard();
      break;
    case 'admin':
      if (window.loadAdminDashboard) await window.loadAdminDashboard();
      break;
    case 'learner':
      if (window.loadLearnerDashboard) await window.loadLearnerDashboard();
      break;
  }
}

// Logout
window.logout = function () {
  localStorage.clear();
  window.location.href = '/';
};
