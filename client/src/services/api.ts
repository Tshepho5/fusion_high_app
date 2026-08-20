import axios from 'axios';

const api = axios.create({
  baseURL: '', // Handled by Vite proxy in dev or Express in production
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.startsWith('/login') && 
          !window.location.pathname.startsWith('/register') &&
          !window.location.pathname.startsWith('/forgot-password')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Authentication APIs
export const authService = {
  login: (credentials: { email?: string; learnerNumber?: string; password: string }) => 
    api.post('/api/login', credentials).then(res => res.data),
  register: (userData: any) => 
    api.post('/api/register', userData).then(res => res.data),
  checkEmail: (email: string) => 
    api.post('/api/check-email', { email }).then(res => res.data),
  verifyLearner: (data: { learner_number?: string; first_name?: string; surname?: string; id_number?: string; grade?: number | string; stream?: string }) => 
    api.post('/api/verify-learner', data).then(res => res.data),
  forgotPassword: (data: { email: string }) => 
    api.post('/api/forgot-password', data).then(res => res.data),
  verifyOtp: (data: { email: string; otp?: string; code?: string }) => 
    api.post('/api/verify-otp', { email: data.email, code: data.code || data.otp }).then(res => res.data),
  resetPassword: (data: { email: string; otp?: string; code?: string; newPassword?: string; new_password?: string }) => 
    api.post('/api/reset-password', { email: data.email, code: data.code || data.otp, new_password: data.newPassword || data.new_password }).then(res => res.data),
};

// User Profile & Messages APIs (users, messages tables)
export const userService = {
  getProfile: () => api.get('/api/profile').then(res => res.data),
  updateProfile: (data: any) => api.put('/api/profile', data).then(res => res.data),
  uploadProfilePicture: (formData: FormData) => 
    api.post('/api/profile/picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
  changePassword: (passwords: { currentPassword?: string; newPassword: string }) => 
    api.post('/api/change-password', passwords).then(res => res.data),
  getMessages: () => api.get('/api/messages').then(res => res.data),
  getUnreadCount: () => api.get('/api/messages/unread-count').then(res => res.data),
  getContacts: () => api.get('/api/messages/contacts').then(res => res.data),
  getConversation: (recipientId: string | number) => 
    api.get(`/api/messages/conversation/${recipientId}`).then(res => res.data),
  sendMessage: (payload: { receiver_id?: string | number; recipient_id?: string | number; content?: string; body?: string; subject?: string }) => 
    api.post('/api/messages', {
      receiver_id: payload.receiver_id || payload.recipient_id,
      recipient_id: payload.recipient_id || payload.receiver_id,
      content: payload.content || payload.body,
      body: payload.body || payload.content,
      subject: payload.subject
    }).then(res => res.data),
  markMessagesAsRead: (payload: { sender_id: string | number }) => 
    api.post('/api/messages/read', payload).then(res => res.data),
};

// Learner Portal APIs (children, subjects, attendance, progress, announcements, textbooks)
export const learnerService = {
  getProfile: () => api.get('/api/profile').then(res => res.data),
  getSubjects: () => api.get('/api/learner/subjects').then(res => res.data),
  getMySubjectsOverview: () => api.get('/api/learner/my-subjects-overview').then(res => res.data),
  getAttendance: () => api.get('/api/learner/attendance-overview').then(res => res.data),
  getGradesOverview: () => api.get('/api/learner/grades-overview').then(res => res.data),
  getProgress: () => api.get('/api/learner/progress').then(res => res.data),
  getAnnouncements: () => api.get('/api/announcements').then(res => res.data),
  getTopics: (subject: string, grade?: string | number) => 
    api.get(`/api/learner/topics?subject=${encodeURIComponent(subject)}${grade ? `&grade=${grade}` : ''}`).then(res => res.data),
  getSubjectResources: (subject: string, grade?: string | number) =>
    api.get(`/api/learner/subject-resources?subject=${encodeURIComponent(subject)}${grade ? `&grade=${grade}` : ''}`).then(res => res.data),
  getSubjectAnnouncements: (subject: string, grade?: string | number) =>
    api.get(`/api/learner/subject-announcements?subject=${encodeURIComponent(subject)}${grade ? `&grade=${grade}` : ''}`).then(res => res.data),
  getAssignments: (params?: { subject?: string; grade?: number }) =>
    api.get(`/api/learner/assignments${params?.subject ? `?subject=${encodeURIComponent(params.subject)}` : ''}`).then(res => res.data),
  askTutor: (payload: { prompt?: string; question?: string; action?: string; topic?: string; assessmentId?: string; subject?: string; grade?: number; language?: string }) => 
    api.post('/api/learner/ask-tutor', payload).then(res => res.data),
  gradeTask: (payload: any) => api.post('/api/learner/grade-task', payload).then(res => res.data),
  gradeSubmission: (payload: { subject: string; grade: number; topic: string; question_text: string; learner_answer: string; total_marks?: number }) =>
    api.post('/api/learner/ai/grade-submission', payload).then(res => res.data),
  getGamification: () => api.get('/api/learner/gamification').then(res => res.data),
  awardXP: (payload: { action_type: string; xp_amount?: number }) => 
    api.post('/api/learner/gamification/award-xp', payload).then(res => res.data),
  getLeaderboard: () => api.get('/api/learner/leaderboard').then(res => res.data),
  getTimetable: () => api.get('/api/learner/timetable').then(res => res.data),
  updateHomeLanguage: (home_language: string) => api.put('/api/learner/home-language', { home_language }).then(res => res.data),
  getCareerPathway: () => api.get('/api/learner/career-pathway').then(res => res.data),
  simulateAps: (payload: { subject_marks: Array<{ subject: string; mark: number }> }) => api.post('/api/learner/simulate-aps', payload).then(res => res.data),
};

// Official Academic Report Card Service
export const reportService = {
  getCapsReportCard: (params?: { child_id?: string | number; term?: string }) =>
    api.get(`/api/reports/caps-report-card?child_id=${params?.child_id || ''}&term=${encodeURIComponent(params?.term || 'Term 3 2026')}`).then(res => res.data),
};

// Teacher Workspace APIs (employees, classes, attendance, marks, ai lesson planner)
export const teacherService = {
  getOverview: () => api.get('/api/teacher/overview-stats').then(res => res.data),
  getWorkload: () => api.get('/api/teacher/workload').then(res => res.data),
  getMySubjectsOverview: () => api.get('/api/teacher/my-subjects-overview').then(res => res.data),
  getClassList: () => api.get('/api/teacher/classlist').then(res => res.data),
  getClassRoster: (params?: { grade?: number; class?: string; subject?: string }) => 
    api.get(`/api/teacher/class-roster?grade=${params?.grade || ''}&class=${params?.class || ''}&subject=${encodeURIComponent(params?.subject || '')}`).then(res => res.data),
  getMyLearners: () => api.get('/api/teacher/my-learners').then(res => res.data),
  getAttendanceRoster: (params?: { grade?: number; class?: string; date?: string; subject?: string }) => 
    api.get(`/api/teacher/attendance-roster?grade=${params?.grade || ''}&class=${params?.class || ''}&date=${params?.date || ''}&subject=${params?.subject || ''}`).then(res => res.data),
  submitAttendance: (payload: any) => api.post('/api/teacher/attendance', payload).then(res => res.data),
  saveAttendance: (payload: any) => api.post('/api/teacher/attendance', payload).then(res => res.data),
  saveClassMarks: (payload: any) => api.post('/api/teacher/marks/save', payload).then(res => res.data),
  recordMark: (payload: any) => api.post('/api/teacher/record-mark', payload).then(res => res.data),
  getTimetables: () => api.get('/api/teacher/timetables').then(res => res.data),
  publishToLearners: (payload: { timetable_id: number; timetable_data?: any }) => 
    api.post('/api/teacher/publish-to-learners', payload).then(res => res.data),
  generateLessonPlan: (payload: { subject: string; grade: number; topic: string; duration?: string }) => 
    api.post('/api/teacher/ai/generate-lesson-plan', payload).then(res => res.data),
  generateTestPaper: (payload: { subject: string; grade: number; topic: string; term?: string; totalMarks?: number; difficulty?: string }) =>
    api.post('/api/teacher/ai/generate-test-paper', payload).then(res => res.data),
  generateAIQuestions: (payload: { subject: string; grade: number; topic: string; count?: number; questionCount?: number; difficulty?: string; questionType?: string; marks_per_question?: number }) =>
    api.post('/api/teacher/ai/generate-assignment-questions', payload).then(res => res.data),
  generateQuiz: (payload: any) =>
    api.post('/api/teacher/ai/generate-assignment-questions', payload).then(res => res.data),
  getMyResources: () => api.get('/api/teacher/my-resources').then(res => res.data),
  uploadResource: (formData: FormData) => 
    api.post('/api/teacher/upload-resource', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data),
  deleteResource: (id: number | string) => api.delete(`/api/teacher/resources/${id}`).then(res => res.data),
};

// Notification APIs
export const notificationService = {
  getNotifications: (limit?: number) => api.get('/api/notifications', { params: { limit } }).then(res => res.data),
  getUnreadCount: () => api.get('/api/notifications/unread-count').then(res => res.data),
  markAsRead: (id: string | number) => api.put(`/api/notifications/${id}/read`).then(res => res.data),
  markAllAsRead: () => api.put('/api/notifications/read-all').then(res => res.data),
};

// Admin Management APIs
export const adminService = {
  getOverviewStats: () => api.get('/api/admin/stats').then(res => res.data),
  getUsers: (role?: string) => role && role !== 'all' ? api.get(`/api/admin/users/${role}`).then(res => res.data) : api.get('/api/admin/users').then(res => res.data),
  deleteUser: (id: number | string) => api.delete(`/api/admin/users/${id}`).then(res => res.data),
  getAllTeachers: () => api.get('/api/admin/teachers').then(res => res.data),
  getEmployees: () => api.get('/api/admin/employees').then(res => res.data),
  createEmployee: (payload: any) => api.post('/api/admin/employees', payload).then(res => res.data),
  getLearners: () => api.get('/api/admin/learners').then(res => res.data),
  createLearner: (payload: any) => api.post('/api/admin/learners', payload).then(res => res.data),
  getSchoolMetadata: () => api.get('/api/admin/metadata').then(res => res.data),
  getTimetables: () => api.get('/api/admin/timetables').then(res => res.data),
  generateTimetable: (payload: any) => api.post('/api/admin/generate-timetable', payload).then(res => res.data),
  publishToTeachers: (payload: { timetable_id?: number; timetable_data?: any; generation_details?: any; name?: string; [key: string]: any }) => 
    api.post('/api/admin/publish-to-teachers', payload).then(res => res.data),
  publishTimetable: (payload: { timetable_id?: number; timetable_data?: any; generation_details?: any; name?: string; [key: string]: any }) => 
    api.post('/api/admin/publish-to-teachers', payload).then(res => res.data),
  getAnnouncements: () => api.get('/api/announcements').then(res => res.data),
  createAnnouncement: (payload: any) => api.post('/api/announcements', payload).then(res => res.data),
  deleteAnnouncement: (id: string | number) => api.delete(`/api/announcements/${id}`).then(res => res.data),
  getAdmissions: (params?: any) => api.get('/api/admin/admissions', { params }).then(res => res.data),
  getAdmissionById: (id: string | number) => api.get(`/api/admin/admissions/${id}`).then(res => res.data),
  updateAdmissionStatus: (id: string | number, payload: any) => api.patch(`/api/admin/admissions/${id}`, payload).then(res => res.data),
};

// Parent Portal APIs (children, progress, attendance, messages)
export const parentService = {
  getOverview: () => api.get('/api/parent/overview').then(res => res.data),
  getChildren: () => api.get('/api/parent/children').then(res => res.data),
  getChildrenDetailed: () => api.get('/api/parent/children-detailed').then(res => res.data),
  getChildOverview: (childId: string | number) => api.get(`/api/parent/child-overview/${childId}`).then(res => res.data),
  getChildPerformance: (childId: string | number) => api.get(`/api/parent/child-performance?childId=${childId}`).then(res => res.data),
  getChildAttendance: (childId: string | number) => api.get(`/api/parent/child-attendance?childId=${childId}`).then(res => res.data),
  getChildTimetable: (childId?: string | number) => api.get(`/api/parent/child-timetable${childId ? `?child_id=${childId}` : ''}`).then(res => res.data),
  getChildProgress: (childId: string | number) => api.get(`/api/progress/${childId}`).then(res => res.data),
};

// School & Class Event Calendar APIs
export const eventService = {
  getEvents: () => api.get('/api/events').then(res => res.data),
  createEvent: (payload: any) => api.post('/api/events', payload).then(res => res.data),
  deleteEvent: (id: string | number) => api.delete(`/api/events/${id}`).then(res => res.data),
};

// Teacher-to-Teacher Timetable Slot Swap APIs
export const timetableSwapService = {
  createSwapRequest: (payload: any) => api.post('/api/teacher/timetable/swap-request', payload).then(res => res.data),
  getSwapRequests: () => api.get('/api/teacher/timetable/swap-requests').then(res => res.data),
  respondToSwap: (id: number | string, action: 'accepted' | 'declined') => 
    api.post(`/api/teacher/timetable/swap-requests/${id}/respond`, { action }).then(res => res.data),
};

// Parent-Teacher Conference (PTC) Booking APIs
export const ptcService = {
  createSlots: (payload: { date: string; start_time: string; end_time: string; slot_duration_minutes?: number; meeting_type?: string; meeting_location_or_link?: string }) =>
    api.post('/api/ptc/slots', payload).then(res => res.data),
  getTeacherSlots: () => api.get('/api/ptc/teacher-slots').then(res => res.data),
  deleteSlot: (id: number | string) => api.delete(`/api/ptc/slots/${id}`).then(res => res.data),
  getAvailableSlots: (params?: { teacher_id?: number | string; subject?: string }) =>
    api.get('/api/ptc/available-slots', { params }).then(res => res.data),
  bookSlot: (payload: { slot_id: number; child_id: number; subject: string; parent_notes?: string }) =>
    api.post('/api/ptc/book', payload).then(res => res.data),
  getParentBookings: () => api.get('/api/ptc/parent-bookings').then(res => res.data),
  cancelBooking: (id: number | string) => api.patch(`/api/ptc/cancel/${id}`).then(res => res.data),
};

// Merit & Disciplinary Conduct Management APIs
export const conductService = {
  awardMerit: (payload: { child_id: number; category: string; title: string; description?: string; points?: number; badge_icon?: string }) =>
    api.post('/api/conduct/merit', payload).then(res => res.data),
  recordIncident: (payload: { child_id: number; category: string; severity?: string; description: string; action_taken?: string; detention_date?: string }) =>
    api.post('/api/conduct/incident', payload).then(res => res.data),
  getLearnerConduct: () => api.get('/api/conduct/learner').then(res => res.data),
  getChildConductForParent: (childId: number | string) => api.get(`/api/conduct/child/${childId}`).then(res => res.data),
  getTeacherConductLogs: () => api.get('/api/conduct/teacher-logs').then(res => res.data),
  updateDetentionStatus: (id: number | string, detention_status: string) => api.patch(`/api/conduct/detention/${id}`, { detention_status }).then(res => res.data),
};

// Examination Seating & Candidate Allocation APIs
export const examSeatingService = {
  getSessions: (grade?: number | string) => api.get('/api/exam-seating/sessions', { params: { grade } }).then(res => res.data),
  createSession: (payload: any) => api.post('/api/exam-seating/sessions', payload).then(res => res.data),
  generateSeating: (sessionId: number | string, payload?: any) => api.post(`/api/exam-seating/sessions/${sessionId}/generate`, payload || {}).then(res => res.data),
  getSessionSeating: (sessionId: number | string) => api.get(`/api/exam-seating/sessions/${sessionId}/seating`).then(res => res.data),
  getMySeats: () => api.get('/api/exam-seating/my-seats').then(res => res.data),
  updateAttendance: (allocationId: number | string, attendance_status: string) => 
    api.patch(`/api/exam-seating/allocations/${allocationId}/attendance`, { attendance_status }).then(res => res.data),
};

// Sports & Extracurricular Activities APIs
export const extracurricularService = {
  getActivities: (category?: string) => api.get('/api/extracurricular/activities', { params: { category } }).then(res => res.data),
  getActivityDetails: (id: number | string) => api.get(`/api/extracurricular/activities/${id}`).then(res => res.data),
  getMyActivities: () => api.get('/api/extracurricular/my-activities').then(res => res.data),
  joinActivity: (payload: { activity_id: number; child_id?: number; role?: string; jersey_number?: string }) => 
    api.post('/api/extracurricular/join', payload).then(res => res.data),
  createActivity: (payload: any) => api.post('/api/extracurricular/activities', payload).then(res => res.data),
  createEvent: (payload: any) => api.post('/api/extracurricular/events', payload).then(res => res.data),
  updateEventScore: (id: number | string, payload: { result_score: string; notes?: string }) => 
    api.patch(`/api/extracurricular/events/${id}/score`, payload).then(res => res.data),
};

// Textbook & Learning Asset Tracking APIs
export const textbookService = {
  getInventory: (params?: { grade?: number; subject?: string }) => api.get('/api/textbooks/inventory', { params }).then(res => res.data),
  addInventory: (payload: any) => api.post('/api/textbooks/inventory', payload).then(res => res.data),
  issueTextbook: (payload: { inventory_id: number; child_id: number; condition_on_issue?: string }) => 
    api.post('/api/textbooks/issue', payload).then(res => res.data),
  returnTextbook: (id: number | string, payload: { condition_on_return: string; replacement_fee?: number }) => 
    api.patch(`/api/textbooks/return/${id}`, payload).then(res => res.data),
  getMyBooks: () => api.get('/api/textbooks/my-books').then(res => res.data),
};

// Educator Leave & Relief Scheduler APIs
export const leaveReliefService = {
  applyLeave: (payload: any) => api.post('/api/leave-relief/apply', payload).then(res => res.data),
  getMyLeave: () => api.get('/api/leave-relief/my-leave').then(res => res.data),
  getLeaveRequests: (status?: string) => api.get('/api/leave-relief/requests', { params: { status } }).then(res => res.data),
  updateLeaveStatus: (id: number | string, payload: { status: string; admin_notes?: string }) => 
    api.patch(`/api/leave-relief/requests/${id}/status`, payload).then(res => res.data),
  getAvailableTeachers: (params: { date: string; period_number: number; absent_teacher_id?: number }) => 
    api.get('/api/leave-relief/available-teachers', { params }).then(res => res.data),
  assignRelief: (payload: any) => api.post('/api/leave-relief/assign-relief', payload).then(res => res.data),
  getDailyRoster: (date?: string) => api.get('/api/leave-relief/daily-roster', { params: { date } }).then(res => res.data),
};

// Matric Candidate Examination Readiness & Pass Rate Projector APIs
export const matricAnalyticsService = {
  getProjectorStats: () => api.get('/api/matric-analytics/projector').then(res => res.data),
};


