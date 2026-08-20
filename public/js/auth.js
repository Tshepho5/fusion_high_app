
// Auth Logic - FUSION_HIGH_APP

import { login } from './api.js';
import { showLoading, hideLoading } from './ui.js';
import { loadDashboard } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  // On page load, check for a redirect parameter and store it
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get('redirect');
  if (redirectUrl) {
    sessionStorage.setItem('loginRedirect', redirectUrl);
  }

  // Password eye toggles
  const setupToggle = (toggleId, inputId) => {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (toggle && input) {
      toggle.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        // Toggle between eye and eye-slash icons from Font Awesome
        if (toggle.tagName === 'I') {
          if (isPassword) {
            toggle.classList.remove('fa-eye');
            toggle.classList.add('fa-eye-slash');
          } else {
            toggle.classList.remove('fa-eye-slash');
            toggle.classList.add('fa-eye');
          }
        }
      });
    }
  };
  setupToggle('toggleLoginPassword', 'loginPassword');

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading(loginForm);
    clearError(loginError);

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const data = await login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.role);

      // Check for a stored redirect URL after successful login
      const storedRedirectUrl = sessionStorage.getItem('loginRedirect');
      if (storedRedirectUrl) {
        sessionStorage.removeItem('loginRedirect'); // Clean up
        window.location.href = storedRedirectUrl;
      } else {
        loadDashboard(data.role); // Fallback to default dashboard
      }
    } catch (error) {
      showError(loginError, error.message);
    } finally {
      hideLoading(loginForm);
    }
  });

  function clearError(errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('show');
  }

  function showError(errorEl, message) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }

});

// Register handled in registrationForm.js for better separation of concerns