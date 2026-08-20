// API Helper - FUSION_HIGH_APP
const API_BASE = '/api';

/**
 * Decodes the JWT from localStorage to get the user ID.
 */
export function getUserIdFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1])).id;
  } catch (e) { return null; }
}

/**
 * A public API call helper that does not require authentication.
 * Used for login, registration, etc.
 */
export async function publicApiCall(endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { error: 'Invalid response from server.' };
  }

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}



export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return; // Prevent further execution if no token
  }
  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    ...options
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  if (!response.ok) {
    // Read the body as text once, then try to parse it.
    const errorText = await response.text();
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.error || 'API request failed');
    } catch (e) {
      // If parsing fails, the errorText itself is the message.
      throw new Error(errorText || 'API request failed with non-JSON response.');
    }
  }
  const text = await response.text();
  if (!text) {
    if (endpoint.includes('/children') || endpoint.includes('/assignments') || endpoint.includes('/announcements') || endpoint.includes('/messages')) {
      return [];
    }
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn(`[API WARN] Non-JSON response for ${endpoint}:`, text.substring(0, 100));
    if (endpoint.includes('/children') || endpoint.includes('/assignments') || endpoint.includes('/announcements') || endpoint.includes('/messages')) {
      return [];
    }
    return {};
  }
}

// Auth
export async function register(userData) {
  return publicApiCall('/register', { method: 'POST', body: JSON.stringify(userData) });
}

export async function login(credentials) {
  return publicApiCall('/login', { method: 'POST', body: JSON.stringify(credentials) });
}

// Profile
export async function getProfile() {
  return apiCall('/profile');
}

export async function updateProfile(profileData) {
  return apiCall('/profile', { method: 'PUT', body: JSON.stringify(profileData) });
}

export async function getChildren() {
  return apiCall('/parent/children');
}

export async function activateChild(activationData) {
  return apiCall('/children/activate', { method: 'POST', body: JSON.stringify(activationData) });
}

export async function deactivateChild(childId) {
  return apiCall(`/children/deactivate/${childId}`, { method: 'POST' });
}

export async function getChildrensAssignments() {
  return apiCall('/parent/assignments');
}

export async function getChildOverview(childId) {
  return apiCall(`/parent/child-overview/${childId}`);
}

export async function contactTeacher(messageData) {
  return apiCall('/parent/contact-teacher', { method: 'POST', body: JSON.stringify(messageData) });
}

export async function getMessages() {
  return apiCall('/messages');
}

export async function markMessagesAsRead(messageIds) {
  return apiCall('/messages/read', { method: 'POST', body: JSON.stringify({ messageIds }) });
}

export async function getUnreadMessageCount() {
  return apiCall('/messages/unread-count');
}

// Progress
export async function getProgress(childId) {
  return apiCall(`/progress/${childId}`);
}

export async function getLearnerProgress() {
  return apiCall('/learner/progress');
}

export async function addProgress(progressData) {
  return apiCall('/progress', { method: 'POST', body: JSON.stringify(progressData) });
}

// Announcements
export async function createAnnouncement(annData) {
  return apiCall('/announcements', { method: 'POST', body: JSON.stringify(annData) });
}

export async function getAnnouncements(roleTarget) {
  return apiCall(`/announcements?role_target=${roleTarget}`);
}

// AI Tutor Endpoints
export async function getLearnerSubjects() {
  return apiCall('/learner/subjects');
}

export async function getLearnerAssignments() {
  return apiCall('/learner/assignments');
}

export async function getAITopics(subject) {
  return apiCall(`/learner/topics?subject=${encodeURIComponent(subject)}`);
}

export async function getAITask(subject, topicId) {
  return apiCall(`/ai/task?subject=${encodeURIComponent(subject)}&topicId=${topicId}`);
}

export async function gradeAITask(assessmentId, answers) {
  return apiCall('/ai/grade-task', { method: 'POST', body: JSON.stringify({ assessmentId, answers }) });
}

export async function gradeAssignment(assessmentId, answers) {
  return apiCall('/learner/grade-assignment', { method: 'POST', body: JSON.stringify({ assessmentId, answers }) });
}

export async function getLeaderboard(subject) {
  return apiCall(`/ai/leaderboard?subject=${encodeURIComponent(subject)}`);
}

export async function getTasksDashboard() {
  return apiCall('/tasks/dashboard');
}

export async function submitHomeTask(taskId) {
  return apiCall('/tasks/submit', { method: 'POST', body: JSON.stringify({ taskId }) });
}

export async function uploadProfilePicture(formData) {
  // Use the main apiCall helper for consistency and to avoid conflicts.
  // The helper handles the token and base URL automatically.
  // We set Content-Type to null to let the browser set the correct multipart/form-data boundary.
  return apiCall('/profile/picture', {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': null } // Let browser set Content-Type for FormData
  });
}

export async function getTeacherMessages() {
  return apiCall('/teacher/messages');
}

export async function replyToParent(replyData) {
  return apiCall('/teacher/reply', { method: 'POST', body: JSON.stringify(replyData) });
}
