/**
 * Learner Dashboard Logic - FUSION_HIGH_APP
 */
import { getProfile, getLearnerSubjects, getLearnerProgress, getTasksDashboard, getAnnouncements, getLearnerAssignments, getAITopics, getAITask, gradeAITask, gradeAssignment, getLeaderboard, updateProfile } from './api.js';
import { showLoading, hideLoading, showSection, getColorForSubject } from './ui.js';
import { initMessageCenter, selectContact, sendChatMessage, filterChatContacts } from './chat-center.js';

window.initMessageCenter = initMessageCenter;
window.selectContact = selectContact;
window.sendChatMessage = sendChatMessage;
window.filterChatContacts = filterChatContacts;

window.loadLearnerDashboard = async function () {
  const container = document.querySelector('.dashboard');
  showLoading(container);
  try {
    // 1. Load Profile & Subjects
    const profile = await getProfile();
    const subjectData = await getLearnerSubjects();

    document.getElementById('learnerName').textContent = `${profile.full_name} ${profile.surname}`;
    document.getElementById('learnerMeta').textContent = `Grade ${profile.academic?.grade} | ${profile.academic?.stream} Stream`;

    // 2. Render Subjects as Cards (links if AI enabled)
    const subjectList = document.getElementById('subjectList');
    if (subjectList) subjectList.innerHTML = subjectData.subjects.map(sub => `
      <div class="card subject-card ${sub.aiEnabled ? 'ai-active' : ''}">
        <div class="card-body">
            <h4>${sub.name}</h4>
            ${sub.aiEnabled
        ? `<div class="d-flex" style="gap: 8px;">
                     <button onclick="openAITutor('${sub.name}')" class="btn btn-primary btn-sm">Self-Study with AI</button>
                     <button onclick="openAITutorModal('${sub.name}')" class="btn btn-success btn-sm">Ask AI Tutor</button>
                   </div>`
        : `<span class="badge bg-secondary">No AI Content Available</span>`
      }
        </div>
      </div>
    `).join('');

    // 3. Load Progress History
    const history = await getLearnerProgress(); // Own progress via learner endpoint
    displayProgressHistory(history);

    // 4. Load Home Page Tasks (Pending vs Completed tracking)
    const tasks = await getTasksDashboard();
    displayDashboardTasks(tasks);

    const announcements = await getAnnouncements('learner');
    displayAnnouncements(announcements);

    const assignments = await getLearnerAssignments();
    displayAssignments(assignments);
    loadLearnerProfile(profile);

    // Ensure the overview section is visible by default
    loadLearnerMySubjectsOverview();
    loadLearnerGradesOverview();
    loadLearnerAttendanceOverview();
    if (window.loadLearnerAnnouncementsOverview) window.loadLearnerAnnouncementsOverview();
    loadUnreadMessageBadge();

    showSection('overview-section');
    loadAndDisplayTimetable();
  } catch (error) {
    console.error('Learner Dashboard Error:', error);
  } finally {
    hideLoading(container);
  }
}

async function safeApiCall(url) {
    try {
        const endpoint = url.startsWith('/api') ? url.replace('/api', '') : url;
        return await apiCall(endpoint);
    } catch (err) {
        console.error(`safeApiCall failed for ${url}:`, err);
        return null;
    }
}

let cachedLearnerSubjectCards = [];
let currentLearnerSubjectViewMode = 'grid';

export async function loadLearnerMySubjectsOverview() {
    const container = document.getElementById('learner-subjects-rows-container');
    const subjectsHomeGrid = document.getElementById('learner-subjects-grid-container');

    try {
        let data = await safeApiCall('/api/learner/my-subjects-overview');
        if (!data || !data.subjects || data.subjects.length === 0) {
            const fallbackData = await safeApiCall('/api/learner/subjects');
            if (fallbackData && fallbackData.subjects) {
                const subList = Array.isArray(fallbackData.subjects) ? fallbackData.subjects : [];
                data = {
                    enrolled_subjects_count: subList.length,
                    upcoming_assessments_count: 0,
                    assignments_due_count: 0,
                    overall_average: 0,
                    subjects: subList.map(s => ({
                        name: typeof s === 'string' ? s : (s.name || s),
                        code: (typeof s === 'string' ? s : (s.name || s)).substring(0, 4).toUpperCase() + '10',
                        grade: fallbackData.grade || 10,
                        teacher: 'Subject Teacher',
                        classmates_count: 1,
                        curriculum_progress: 0,
                        progress: 0,
                        assignments_due: 0
                    }))
                };
            }
        }

        const subjects = data?.subjects || [];
        cachedLearnerSubjectCards = subjects;

        // Update Stat Cards
        const statEnrolled = document.getElementById('stat-enrolled-count');
        if (statEnrolled) statEnrolled.textContent = data?.enrolled_subjects_count || subjects.length || 0;

        const statAssess = document.getElementById('stat-assessments-count');
        if (statAssess) statAssess.textContent = data?.upcoming_assessments_count || 0;

        const statAssign = document.getElementById('stat-assignments-count');
        if (statAssign) statAssign.textContent = data?.assignments_due_count || 0;

        const statAvg = document.getElementById('stat-overall-avg');
        if (statAvg) statAvg.textContent = `${data?.overall_average || 0}%`;

        const statQuizzes = document.getElementById('stat-quizzes-count');
        if (statQuizzes) {
            const totalQuizzes = subjects.reduce((sum, s) => sum + (s.quizzes_count || 0), 0);
            statQuizzes.textContent = totalQuizzes || 0;
        }

        const syncFooter = document.getElementById('learner-subjects-sync-footer');
        if (syncFooter) {
            syncFooter.textContent = `Last synced: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        renderLearnerSubjectCards(subjects);

        // Home Page subjects list
        if (subjectsHomeGrid) {
            subjectsHomeGrid.innerHTML = subjects.map(s => `
                <div class="card subject-card ai-active" style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
                    <div class="card-body">
                        <h4 style="color:#f8fafc; font-weight:700; margin-bottom:0.5rem;">${s.name}</h4>
                        <div style="font-size:0.85rem; color:#94a3b8; margin-bottom:1rem;"><i class="fas fa-user-tie me-1" style="color:#6366f1;"></i> Teacher: ${s.teacher || 'Subject Teacher'}</div>
                        <div class="d-flex" style="gap: 8px;">
                            <button onclick="window.openSubjectWorkspace('${s.name}')" class="btn btn-primary btn-sm" style="background:#6366f1; border:none; font-weight:600;">Self-Study with AI</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

    } catch (err) {
        console.error('Error loading learner subjects overview:', err);
        if (container) container.innerHTML = `<p style="color: #ef4444; padding: 1rem;">Failed to load enrolled subjects.</p>`;
    }
}
window.loadLearnerMySubjectsOverview = loadLearnerMySubjectsOverview;

export function renderLearnerSubjectCards(cards) {
    const container = document.getElementById('learner-subjects-rows-container');
    if (!container) return;

    if (!cards || cards.length === 0) {
        container.innerHTML = `<p style="color:#94a3b8; text-align:center; grid-column: 1 / -1; padding:2rem;">No matching subjects found.</p>`;
        return;
    }

    if (currentLearnerSubjectViewMode === 'list') {
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '1rem';
        container.innerHTML = cards.map((c) => {
            const safeCode = (c.code || `${c.name.substring(0,4)}${c.grade || 10}`).replace(/[^a-zA-Z0-9]/g, '');
            const sectionId = `learner-subject-classmates-${c.grade || 10}-${safeCode}`;
            const listId = `learner-subject-classmates-list-${c.grade || 10}-${safeCode}`;

            return `
            <div class="learner-subject-row-card" style="background: #0f172a; border-radius: 14px; padding: 1.25rem; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
                <div style="position: absolute; top:0; left:0; bottom:0; width: 4px; background: linear-gradient(180deg, #6366f1, #a855f7);"></div>
                <div style="cursor: pointer;" onclick="window.openSubjectWorkspace('${c.name}')" title="Click to open ${c.name} workspace">
                    <span class="badge" style="background:#312e81; color:#a5b4fc; font-size:0.75rem; padding: 3px 8px; border-radius: 4px; font-weight: 600;">Grade ${c.grade || 10} • ${c.code || 'SUBJ10'}</span>
                    <h3 style="color:#ffffff; font-size:1.18rem; font-weight:700; margin: 0.3rem 0 0.2rem 0; display: flex; align-items: center; gap: 0.4rem;">
                        ${c.name} <i class="fas fa-external-link-alt" style="font-size: 0.8rem; color: #818cf8;"></i>
                    </h3>
                    <div style="font-size:0.85rem; color:#94a3b8;"><i class="fas fa-chalkboard-teacher me-1" style="color:#6366f1;"></i> Teacher: <strong style="color:#f8fafc;">${c.teacher || 'Subject Teacher'}</strong> • ${c.classmates_count || 1} Classmates</div>
                </div>

                <div style="display:flex; align-items:center; gap: 1rem; flex-wrap:wrap;">
                    <div style="text-align:right; margin-right: 0.5rem;">
                        <div style="font-size:0.75rem; color:#64748b; font-weight:600;">Academic Grade</div>
                        <div style="font-size:1.1rem; font-weight:800; color:#4ade80;">${c.progress || 75}%</div>
                    </div>
                    <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                        <button type="button" class="btn-secondary-card" onclick="window.openSubjectWorkspace('${c.name}')">
                            <i class="fas fa-book-reader" style="color:#6366f1;"></i> Chapters
                        </button>
                        <button type="button" class="btn-secondary-card" onclick="window.openSubjectResourcesModal('${c.name}', ${c.grade || 10})">
                            <i class="fas fa-file-pdf" style="color:#a855f7;"></i> Resources (${c.resources_count || 0})
                        </button>
                        <button type="button" class="btn-secondary-card" onclick="window.openSubjectUpdatesModal('${c.name}', ${c.grade || 10})">
                            <i class="fas fa-bullhorn" style="color:#f59e0b;"></i> Updates (${c.announcements_count || 0})
                        </button>
                        <button type="button" class="btn-secondary-card" onclick="window.openSubjectTasksModal('${c.name}', ${c.grade || 10})">
                            <i class="fas fa-clipboard-list" style="color:#60a5fa;"></i> Tasks (${c.assignments_due || 0})
                        </button>
                        <button type="button" class="btn-secondary-card" onclick="window.openSubjectGradesModal('${c.name}', ${c.grade || 10})">
                            <i class="fas fa-chart-line" style="color:#22c55e;"></i> Grades
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } else {
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(320px, 1fr))';
        container.style.gap = '1.25rem';
        container.innerHTML = cards.map((c) => {
            const safeCode = (c.code || `${c.name.substring(0,4)}${c.grade || 10}`).replace(/[^a-zA-Z0-9]/g, '');
            const sectionId = `learner-subject-classmates-${c.grade || 10}-${safeCode}`;
            const listId = `learner-subject-classmates-list-${c.grade || 10}-${safeCode}`;

            return `
            <div class="teacher-subject-card" data-subject="${c.name}" data-code="${c.code || 'SUBJ10'}" data-grade="${c.grade || 10}">
                <div class="card-subject-header">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 0.5rem; flex-wrap:wrap; gap:0.4rem;">
                        <div>
                            <span class="badge" style="background:#312e81; color:#a5b4fc; font-size:0.75rem; padding: 3px 8px; border-radius: 4px; font-weight: 600;">Grade ${c.grade || 10} • ${c.code || 'SUBJ10'}</span>
                            <h3 style="color:#ffffff; font-size:1.2rem; font-weight:700; margin: 0.4rem 0 0 0; cursor:pointer;" onclick="window.openSubjectWorkspace('${c.name}')">
                                ${c.name}
                            </h3>
                        </div>
                        <div style="display:flex; align-items:center; gap:0.4rem;">
                            ${c.assignments_due > 0 ? `<span class="badge" style="background:#dc2626; color:#ffffff; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; display:inline-flex; align-items:center; gap:4px; box-shadow: 0 0 10px rgba(220, 38, 38, 0.5);"><i class="fas fa-bell"></i> ${c.assignments_due} Work Due</span>` : ''}
                            <span class="badge" style="background:#065f46; color:#34d399; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.85rem;">Avg: ${c.progress || 75}%</span>
                        </div>
                    </div>
                </div>

                <div class="subject-details-list" style="margin-bottom: 0.25rem;">
                    <div style="display:flex; justify-content:space-between; color:#cbd5e1; font-size:0.85rem; background:#1e293b; padding:0.5rem 0.75rem; border-radius:6px; border: 1px solid #334155;">
                        <span><i class="fas fa-chalkboard-teacher me-1" style="color:#6366f1;"></i> Teacher: <strong style="color:#f8fafc;">${c.teacher || 'Subject Teacher'}</strong></span>
                        <span>Class: <strong style="color:#38bdf8;">${c.class_name || 'Grade 10A'}</strong></span>
                    </div>
                </div>

                <div class="curriculum-progress-wrapper" style="margin-bottom: 0.25rem;">
                    <div class="curriculum-progress-labels" style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; color:#cbd5e1; margin-bottom: 4px;">
                        <span>CAPS Curriculum Pace</span>
                        <span style="color:#a855f7; font-weight:700;">${c.curriculum_progress || 80}%</span>
                    </div>
                    <div class="curriculum-progress-bar-bg" style="width:100%; height:10px; background:#1e293b; border-radius:20px; overflow:hidden;">
                        <div class="curriculum-progress-bar-fill" style="width: ${c.curriculum_progress || 80}%; height:100%; background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%); border-radius:20px;"></div>
                    </div>
                </div>

                <div class="student-count-box" style="background:#1e293b; border:1px solid #334155; border-radius:8px; padding:0.6rem 0.8rem; margin-bottom: 0.25rem; cursor:pointer;" onclick="window.toggleLearnerClassmates('${c.name}', ${c.grade || 10}, '${sectionId}', '${listId}')">
                    <div class="student-count-value" style="font-size:0.85rem; font-weight:700; color:#ffffff; display:flex; align-items:center; width:100%;">
                        <i class="fas fa-users" style="color: #6366f1; margin-right: 6px;"></i> ${c.classmates_count || 1} Enrolled Classmates 
                        <span style="font-size:0.75rem; color:#38bdf8; font-weight:normal; margin-left:auto;"><i class="fas fa-chevron-down"></i> Expand Roster</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#94a3b8; margin-top:4px; border-top: 1px solid #334155; padding-top:4px;">
                        <span>Pending Tasks: <strong style="color:${c.assignments_due > 0 ? '#ef4444' : '#4ade80'};">${c.assignments_due || 0}</strong></span>
                        <span>Quizzes Done: <strong style="color:#60a5fa;">${c.quizzes_count || 0}</strong></span>
                    </div>
                </div>

                <div class="subject-card-actions" style="margin-top:auto;">
                    <button type="button" class="btn-primary-cta" onclick="window.openSubjectWorkspace('${c.name}')">
                        <i class="fas fa-book-reader"></i> Open Study Workspace <span class="cta-tag">Grade ${c.grade || 10}</span>
                    </button>
                    <div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-top:4px;">
                        <button type="button" class="btn-secondary-card" style="flex:1; min-width:110px;" onclick="window.openSubjectResourcesModal('${c.name}', ${c.grade || 10})">
                            <i class="fas fa-file-pdf" style="color:#a855f7;"></i> View Resources (${c.resources_count || 0})
                        </button>
                        <button type="button" class="btn-secondary-card" style="flex:1; min-width:110px;" onclick="window.openSubjectGradesModal('${c.name}', ${c.grade || 10})">
                            <i class="fas fa-chart-line" style="color:#22c55e;"></i> Check Grades
                        </button>
                        <button type="button" class="btn-secondary-card" style="flex:1; min-width:110px;" onclick="window.openSubjectTasksModal('${c.name}', ${c.grade || 10})">
                            <i class="fas fa-clipboard-list" style="color:#60a5fa;"></i> Tasks (${c.assignments_due || 0})
                        </button>
                        <button type="button" class="btn-secondary-card" style="flex:1; min-width:110px;" onclick="window.openSubjectUpdatesModal('${c.name}', ${c.grade || 10})">
                            <i class="fas fa-bullhorn" style="color:#f59e0b;"></i> Teacher Updates
                        </button>
                        <button type="button" class="btn-secondary-card" style="flex:1; min-width:110px;" onclick="window.openSubjectWorkspace('${c.name}')">
                            <i class="fas fa-robot" style="color:#38bdf8;"></i> AI Subject Assist
                        </button>
                        <button type="button" class="btn-secondary-card" style="flex:1; min-width:110px;" onclick="window.toggleLearnerClassmates('${c.name}', ${c.grade || 10}, '${sectionId}', '${listId}')">
                            <i class="fas fa-users" style="color:#6366f1;"></i> Classmates
                        </button>
                    </div>
                </div>

                <!-- Embedded Subject Learners Roster Section inside this Subject Card -->
                <div id="${sectionId}" class="embedded-subject-learners" style="display:none; background:#0f172a; border-radius:10px; padding:1rem; border:1px solid #334155; margin-top:0.9rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; border-bottom:1px solid #1e293b; padding-bottom:0.5rem;">
                        <h5 style="color:#f8fafc; margin:0; font-size:0.88rem; font-weight:700;">
                            <i class="fas fa-user-graduate" style="color:#6366f1; margin-right:4px;"></i> Enrolled Classmates in ${c.name} (Grade ${c.grade || 10})
                        </h5>
                    </div>
                    <div id="${listId}" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem;">
                        <div style="text-align:center; color:#94a3b8; padding:0.5rem; grid-column:1/-1;"><i class="fas fa-spinner fa-spin me-1"></i> Loading classmates...</div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }
}

window.openSubjectResourcesModal = async function(subject, grade) {
    const modal = document.getElementById('learnerSubjectResourcesModal');
    const titleEl = document.getElementById('res-modal-subject-title');
    const listEl = document.getElementById('res-modal-content-list');
    if (!modal || !listEl) {
        // Fallback to workspace subtab
        window.openSubjectSubTabWithMode(subject, 'resources');
        return;
    }

    if (titleEl) titleEl.innerHTML = `<i class="fas fa-file-pdf" style="color:#a855f7;"></i> Study Resources & Textbooks - ${subject} (Grade ${grade || 10})`;
    listEl.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:2rem;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#a855f7;"></i><p style="margin-top:0.75rem; font-weight:600;">Fetching teacher uploaded resources for ${subject}...</p></div>`;
    modal.style.display = 'flex';

    try {
        const resources = await safeApiCall(`/api/learner/subject-resources?subject=${encodeURIComponent(subject)}`);
        if (!resources || !Array.isArray(resources) || resources.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 2.5rem; color: #94a3b8; background: #1e293b; border-radius: 12px; border: 1px dashed #334155;">
                    <i class="fas fa-file-pdf fa-3x" style="color: #a855f7; margin-bottom: 0.75rem;"></i>
                    <h4 style="color: #f8fafc; margin: 0 0 0.4rem 0;">No Resources Uploaded Yet</h4>
                    <p style="margin: 0; font-size: 0.85rem; color: #94a3b8;">Your teacher has not uploaded any additional textbooks or PDF study guides for ${subject} Grade ${grade || 10} yet. Once uploaded from the teacher portal, they will automatically appear here.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = resources.map(r => {
            const fileName = r.file_path ? r.file_path.split(/[\/\\]/).pop() : 'Study Material.pdf';
            const teacher = r.teacher_surname ? `${r.teacher_name ? r.teacher_name.charAt(0) + '.' : ''} ${r.teacher_surname}` : 'Subject Teacher';
            const dateStr = r.upload_date ? new Date(r.upload_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently uploaded';

            return `
                <div style="background: #1e293b; padding: 1rem 1.25rem; border-radius: 12px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.9rem;">
                        <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(168, 85, 247, 0.2); color: #c084fc; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0;">
                            <i class="fas fa-file-pdf"></i>
                        </div>
                        <div>
                            <div style="font-weight: 700; color: #f8fafc; font-size: 0.95rem;">${fileName}</div>
                            <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">
                                <i class="fas fa-user-tie me-1" style="color: #a855f7;"></i> Uploaded by <strong style="color:#cbd5e1;">${teacher}</strong> • <i class="far fa-calendar-alt ms-1 me-1"></i> ${dateStr}
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <a href="/${r.file_path ? r.file_path.replace(/\\/g, '/') : ''}" target="_blank" class="btn btn-sm btn-primary" style="padding: 6px 14px; font-size: 0.82rem; background: #8b5cf6; border: none; font-weight: 600; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fas fa-eye"></i> View PDF
                        </a>
                        <a href="/${r.file_path ? r.file_path.replace(/\\/g, '/') : ''}" download class="btn btn-sm btn-outline-secondary" style="padding: 6px 12px; font-size: 0.82rem; border: 1px solid #475569; color: #cbd5e1; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        listEl.innerHTML = `<p style="color:#ef4444; text-align:center; padding:1.5rem;">Failed to load resources: ${err.message}</p>`;
    }
};

window.openSubjectUpdatesModal = async function(subject, grade) {
    const modal = document.getElementById('learnerSubjectUpdatesModal');
    const titleEl = document.getElementById('updates-modal-subject-title');
    const listEl = document.getElementById('updates-modal-content-list');
    if (!modal || !listEl) return;

    if (titleEl) titleEl.innerHTML = `<i class="fas fa-bullhorn" style="color:#f59e0b;"></i> Teacher Updates & Notes - ${subject} (Grade ${grade || 10})`;
    listEl.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:2rem;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#f59e0b;"></i><p style="margin-top:0.75rem; font-weight:600;">Fetching updates from your ${subject} teacher...</p></div>`;
    modal.style.display = 'flex';

    try {
        const updates = await safeApiCall(`/api/learner/subject-announcements?subject=${encodeURIComponent(subject)}`);
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 2.5rem; color: #94a3b8; background: #1e293b; border-radius: 12px; border: 1px dashed #334155;">
                    <i class="fas fa-bullhorn fa-3x" style="color: #f59e0b; margin-bottom: 0.75rem;"></i>
                    <h4 style="color: #f8fafc; margin: 0 0 0.4rem 0;">No Specific Announcements Yet</h4>
                    <p style="margin: 0; font-size: 0.85rem; color: #94a3b8;">Your ${subject} educator has not posted any announcements or notes for Grade ${grade || 10} yet.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = updates.map(u => {
            const author = u.author_surname ? `${u.author_name ? u.author_name.charAt(0) + '.' : ''} ${u.author_surname}` : 'Subject Teacher';
            const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently posted';
            const isAssignment = u.is_assignment;

            return `
                <div style="background: #1e293b; padding: 1.1rem 1.25rem; border-radius: 12px; border: 1px solid #334155; position: relative; overflow: hidden;">
                    <div style="position: absolute; top:0; left:0; bottom:0; width: 4px; background: ${isAssignment ? '#60a5fa' : '#f59e0b'};"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
                        <h4 style="color: #ffffff; font-size: 1rem; font-weight: 700; margin: 0;">${u.title}</h4>
                        <span class="badge" style="background: ${isAssignment ? 'rgba(96, 165, 250, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${isAssignment ? '#93c5fd' : '#fcd34d'}; font-size: 0.72rem; padding: 3px 8px; border-radius: 4px; font-weight: 600;">
                            ${isAssignment ? 'Assignment / Task' : (u.category || 'Teacher Update')}
                        </span>
                    </div>
                    <p style="color: #cbd5e1; font-size: 0.88rem; line-height: 1.5; margin: 0.4rem 0 0.6rem 0;">${u.content}</p>
                    <div style="font-size: 0.78rem; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(51, 65, 85, 0.5); padding-top: 0.4rem;">
                        <span><i class="fas fa-chalkboard-teacher me-1" style="color: #f59e0b;"></i> Posted by <strong>${author}</strong></span>
                        <span><i class="far fa-clock me-1"></i> ${dateStr}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        listEl.innerHTML = `<p style="color:#ef4444; text-align:center; padding:1.5rem;">Failed to load teacher updates: ${err.message}</p>`;
    }
};

window.openSubjectTasksModal = function(subject, grade) {
    window.openSubjectSubTabWithMode(subject, 'assessments');
};

window.openSubjectGradesModal = function(subject, grade) {
    window.openSubjectSubTabWithMode(subject, 'grades');
};

window.filterLearnerSubjects = function(query) {
    if (!query) {
        renderLearnerSubjectCards(cachedLearnerSubjectCards);
        return;
    }
    const q = query.toLowerCase();
    const filtered = cachedLearnerSubjectCards.filter(c => 
        (c.name || '').toLowerCase().includes(q) || 
        (c.code || '').toLowerCase().includes(q) || 
        (c.teacher || '').toLowerCase().includes(q)
    );
    renderLearnerSubjectCards(filtered);
};

window.setLearnerSubjectView = function(mode) {
    currentLearnerSubjectViewMode = mode;
    const btnGrid = document.getElementById('learner-btn-grid-view');
    const btnList = document.getElementById('learner-btn-list-view');

    if (btnGrid && btnList) {
        if (mode === 'grid') {
            btnGrid.style.background = '#6366f1';
            btnGrid.style.color = '#fff';
            btnList.style.background = 'transparent';
            btnList.style.color = '#94a3b8';
        } else {
            btnList.style.background = '#6366f1';
            btnList.style.color = '#fff';
            btnGrid.style.background = 'transparent';
            btnGrid.style.color = '#94a3b8';
        }
    }

    renderLearnerSubjectCards(cachedLearnerSubjectCards);
};

window.openSubjectSubTabWithMode = async function(subject, tabName) {
    if (window.openSubjectWorkspace) {
        await window.openSubjectWorkspace(subject);
        if (window.switchSubjectSubTab) {
            window.switchSubjectSubTab(tabName);
        }
    }
};

window.toggleLearnerClassmates = async function(subject, grade, sectionId, listId) {
    const container = document.getElementById(sectionId);
    const listEl = document.getElementById(listId);
    if (!container || !listEl) return;

    const isHidden = container.style.display === 'none' || container.style.display === '';

    if (isHidden) {
        container.style.display = 'block';
        listEl.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:0.5rem; grid-column:1/-1;"><i class="fas fa-spinner fa-spin me-1"></i> Fetching peers...</div>`;

        try {
            const contacts = await safeApiCall('/api/user/communication-contacts');
            const peers = (contacts || []).filter(c => c.role_name === 'learner' || c.role_name === 'teacher');
            if (peers.length === 0) {
                listEl.innerHTML = `<p style="color:#94a3b8; font-size:0.8rem; text-align:center; grid-column:1/-1; margin:0;">No classmates found in Grade ${grade}.</p>`;
                return;
            }

            listEl.innerHTML = peers.map(p => `
                <div style="background:#1e293b; padding:8px 10px; border-radius:6px; border:1px solid #334155; display:flex; align-items:center; gap:8px;">
                    <div style="width:28px; height:28px; border-radius:50%; background:#312e81; color:#a5b4fc; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.75rem;">
                        ${p.full_name ? p.full_name.charAt(0) : 'U'}
                    </div>
                    <div>
                        <div style="font-size:0.8rem; font-weight:600; color:#f8fafc;">${p.full_name} ${p.surname || ''}</div>
                        <div style="font-size:0.7rem; color:#94a3b8;">${p.tag_name || p.role_name}</div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            listEl.innerHTML = `<p style="color:#ef4444; font-size:0.8rem; text-align:center; grid-column:1/-1;">Error loading classmates.</p>`;
        }
    } else {
        container.style.display = 'none';
    }
};

window.loadLearnerGradesOverview = async function() {
    try {
        const data = await safeApiCall('/api/learner/grades-overview');
        if (!data) return;

        const avgEl = document.getElementById('grades-stat-avg');
        if (avgEl) avgEl.textContent = `${data.overall_average || 0}%`;

        const highestEl = document.getElementById('grades-stat-highest');
        if (highestEl) highestEl.textContent = `${data.highest_grade || 0}%`;

        const highestSubjEl = document.getElementById('grades-stat-highest-subj');
        if (highestSubjEl) highestSubjEl.textContent = data.highest_grade_subject || 'No assessments recorded';

        const passedEl = document.getElementById('grades-stat-passed');
        if (passedEl) passedEl.textContent = `${data.subjects_passed_count || 0} / ${data.total_subjects_count || 0}`;

        const creditsEl = document.getElementById('grades-stat-credits');
        if (creditsEl) creditsEl.textContent = data.total_credits || 0;

        const tbody = document.getElementById('grades-by-subject-tbody');
        if (tbody && data.grades_by_subject) {
            tbody.innerHTML = data.grades_by_subject.map(s => `
                <tr>
                    <td style="color: #f8fafc; font-weight: 600;">${s.subject}</td>
                    <td style="color: #94a3b8;">${s.teacher}</td>
                    <td style="color: #38bdf8; font-weight: 700;">${s.average}% (${s.letter})</td>
                    <td style="color: #94a3b8;">${s.average}%</td>
                    <td style="color: #4ade80;">${s.trend}</td>
                    <td>
                        <div style="background: #1e293b; border-radius: 4px; height: 8px; width: 100px; overflow: hidden;">
                            <div style="background: #6366f1; width: ${s.progress}%; height: 100%;"></div>
                        </div>
                    </td>
                    <td><button type="button" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openSubjectWorkspace('${s.subject}')">View</button></td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading learner grades overview:', err);
    }
};

window.loadLearnerAttendanceOverview = async function() {
    try {
        const data = await safeApiCall('/api/learner/attendance-overview');
        if (!data) return;

        const overallEl = document.getElementById('att-stat-overall');
        if (overallEl) overallEl.textContent = `${data.overall_attendance || 0}%`;

        const attendedEl = document.getElementById('att-stat-attended');
        if (attendedEl) attendedEl.textContent = data.classes_attended || 0;

        const totalAttendedSub = document.getElementById('att-stat-total-attended');
        if (totalAttendedSub) totalAttendedSub.textContent = `of ${data.total_classes || 0} classes`;

        const missedEl = document.getElementById('att-stat-missed');
        if (missedEl) missedEl.textContent = data.classes_missed || 0;

        const totalMissedSub = document.getElementById('att-stat-total-missed');
        if (totalMissedSub) totalMissedSub.textContent = `of ${data.total_classes || 0} classes`;

        const thisWeekEl = document.getElementById('att-stat-this-week');
        if (thisWeekEl) thisWeekEl.textContent = `${data.this_week_rate || 0}%`;
    } catch (err) {
        console.error('Error loading learner attendance overview:', err);
    }
};

function displayAssignments(data) {
  const container = document.getElementById('learnerAssignmentsList') || document.getElementById('assignmentList') || document.getElementById('assignmentsList');
  if (!container) return;

  const assignmentsList = data?.assignments || (Array.isArray(data) ? data : []);

  if (assignmentsList.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem; color:#94a3b8;">
        <i class="fas fa-clipboard-check fa-2x mb-2" style="color:#64748b;"></i>
        <p style="margin:0; font-weight:600;">No published assignments from your teachers yet.</p>
        <small style="color:#64748b;">Assignments published by your subject teachers will appear here.</small>
      </div>
    `;
    return;
  }

  container.innerHTML = assignmentsList.map(a => `
    <div class="card mb-3" style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <span class="badge bg-primary me-2" style="background:#6366f1 !important;">${a.subject || 'Subject'}</span>
          <span class="badge bg-secondary">Grade ${a.grade || ''}</span>
          <h5 style="color:#f8fafc; margin:0.4rem 0 0.2rem 0; font-weight:700;">${a.title}</h5>
          <small style="color:#94a3b8;"><i class="fas fa-chalkboard-teacher me-1"></i> Posted by ${a.teacher_name || 'Teacher'} on ${a.created_at || 'Recently'}</small>
        </div>
        <button class="btn btn-sm btn-success" onclick="window.takePublishedAssignment('${a.id}')" style="padding:8px 18px; font-weight:700; background:#10b981; border:none;">
          <i class="fas fa-edit me-1"></i> Take Assessment
        </button>
      </div>
    </div>
  `).join('');
}

window.takePublishedAssignment = async function(assignmentId) {
    if (window.startAssignment) {
        window.startAssignment(assignmentId);
    }
};

window.startAssignment = async function (assignmentId) {
  document.getElementById('tutorView').style.display = 'block';
  document.getElementById('mainDashboard').style.display = 'none';
  const lessonContentEl = document.getElementById('lessonContent');
  showLoading(lessonContentEl);

  try {
    const data = await apiCall('/api/learner/assignments');
    const assignments = data?.assignments || (await getLearnerAssignments());
    const asn = assignments.find(a => String(a.id) === String(assignmentId));
    if (!asn) return alert('Assignment not found.');

    window.currentAssessmentId = assignmentId;
    window.isTeacherAssignment = true;

    document.getElementById('tutorSubject').textContent = `${asn.subject || asn.subject_target || 'Academic'} Assessment`;
    document.getElementById('explanationArea').innerHTML = `
      <div style="background:#0f172a; padding:1.2rem; border-radius:10px; border:1px solid #334155; margin-bottom:1rem;">
        <h5 style="color:#38bdf8; margin:0 0 6px 0; font-weight:700;"><i class="fas fa-file-alt me-2"></i>${asn.title}</h5>
        <p style="color:#cbd5e1; margin:0; font-size:0.9rem;">Select the correct multiple-choice option (A, B, C, or D) for each question below and click Submit Assessment when finished.</p>
      </div>
    `;

    const rawData = asn.assignment_data || asn.questions;
    const questions = typeof rawData === 'string' ? JSON.parse(rawData) : (Array.isArray(rawData) ? rawData : []);

    document.getElementById('questionsArea').innerHTML = questions.map((q, idx) => {
      const qMarks = q.marks || 2;
      const options = Array.isArray(q.options) && q.options.length >= 4 
        ? q.options 
        : [`A) ${q.answer || 'Option A'}`, `B) Alternative 1`, `C) Alternative 2`, `D) Alternative 3`].slice(0, 4);

      return `
        <div class="question-item mb-3" style="background:#1e293b; padding:1.25rem; border-radius:10px; border:1px solid #334155;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span style="font-weight:700; color:#f8fafc; font-size:1rem;">Q${idx + 1}: ${q.question_text || q.question}</span>
            <span style="background:#312e81; color:#a5b4fc; padding:3px 10px; border-radius:12px; font-weight:700; font-size:0.8rem;">[${qMarks} Marks]</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.6rem;">
            ${options.map((opt, optIdx) => `
              <label class="mcq-option-label" style="display:flex; align-items:center; gap:10px; background:#0f172a; padding:10px 14px; border-radius:8px; border:1px solid #334155; cursor:pointer; color:#e2e8f0; transition:border-color 0.2s;">
                <input type="radio" name="mcq_q_${q.id || (idx + 1)}" class="quiz-mcq-option" data-id="${q.id || (idx + 1)}" value="${opt}" style="width:18px; height:18px; accent-color:#6366f1;">
                <span style="font-weight:600;">${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    lessonContentEl.style.display = 'block';
    document.getElementById('quizResults').innerHTML = '';
  } catch (error) {
    alert('Error loading assignment: ' + error.message);
  } finally {
    hideLoading(lessonContentEl);
  }
};

window.loadUnreadMessageBadge = async function() {
    try {
        const data = await safeApiCall('/api/messages/unread-count');
        const badgeEl = document.getElementById('learner-unread-badge');
        if (badgeEl) {
            const count = data?.count || 0;
            if (count > 0) {
                badgeEl.textContent = count;
                badgeEl.style.display = 'inline-block';
            } else {
                badgeEl.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Error loading unread messages count:', err);
    }
};

async function loadAndDisplayTimetable() {
  const container = document.getElementById('learner-timetable-container');
  if (!container) return;
  container.innerHTML = '<p style="color:#94a3b8;"><i class="fas fa-spinner fa-spin me-2"></i>Loading your timetable...</p>';

  try {
    const profile = await getProfile().catch(() => ({ academic: { class_name: 'Grade 11 Science', grade: 11, stream: 'Science' } }));
    const learnerSubjects = (profile && profile.academic && profile.academic.subjects) || ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = ["08:00 - 09:00", "09:15 - 10:15", "10:30 - 11:30", "11:45 - 12:45", "13:00 - 14:00"];

    let tableHtml = `<h4 class="card-title" style="color:#f8fafc; margin-bottom:1rem;"><i class="fas fa-clock me-2" style="color:#6366f1;"></i>Weekly Class Timetable (${(profile && profile.academic && profile.academic.class_name) || 'Grade 11 Science'})</h4><div class="table-responsive"><table class="table timetable-grid" style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden;">`;
    tableHtml += `<thead><tr style="background:#0f172a; color:#38bdf8;"><th style="padding:12px; text-align:left;">Time</th>${days.map(d => `<th style="padding:12px; text-align:left;">${d}</th>`).join('')}</tr></thead><tbody>`;

    for (let pIdx = 0; pIdx < periods.length; pIdx++) {
      const period = periods[pIdx];
      tableHtml += `<tr style="border-bottom:1px solid #334155;">`;
      tableHtml += `<td class="period-cell" style="padding:12px; font-weight:600; color:#94a3b8; background:#0f172a;">${period}</td>`;

      for (let dIdx = 0; dIdx < days.length; dIdx++) {
        const subIndex = (pIdx + dIdx) % learnerSubjects.length;
        const subject = learnerSubjects[subIndex];
        tableHtml += `<td class="timetable-slot" style="padding:12px; background: rgba(30, 41, 59, 0.7); color:#f8fafc;"><strong style="color:#60a5fa;">${subject}</strong><br><small style="color:#94a3b8;">Classroom ${pIdx + 1}A</small></td>`;
      }
      tableHtml += `</tr>`;
    }

    tableHtml += '</tbody></table></div>';
    container.innerHTML = tableHtml;
  } catch (error) {
    container.innerHTML = `<p class="text-danger">Could not load timetable: ${error.message}</p>`;
  }
}
window.loadAndDisplayTimetable = loadAndDisplayTimetable;
// AI Tutor Flow
window.openAITutor = async function (subject) {
  const tutorSubject = document.getElementById('tutorSubject');
  const tutorView = document.getElementById('tutorView');
  const mainDashboard = document.getElementById('mainDashboard');

  if (!tutorSubject || !tutorView || !mainDashboard) return console.error('Dashboard UI elements missing');

  tutorSubject.textContent = subject;
  tutorView.style.display = 'block';
  mainDashboard.style.display = 'none';

  // Reset UI from previous sessions
  document.getElementById('lessonContent').style.display = 'none';
  document.getElementById('quizResults').innerHTML = '';

  const topicSelect = document.getElementById('topicSelector');
  topicSelect.innerHTML = '<option value="">Loading topics...</option>';

  const tutorViewEl = document.getElementById('tutorView');
  showLoading(tutorViewEl);
  try {
    const topics = await getAITopics(subject);

    if (topics && topics.length > 0) {
      topicSelect.innerHTML = `<option value="">-- Select a Topic --</option>` +
        topics.map(t => `<option value="${t.id}">${t.topic}</option>`).join('');
    } else {
      topicSelect.innerHTML = `<option value="">No chapters found for this subject.</option>`;
    }
  } catch (error) {
    console.error('Error loading AI topics:', error);
    alert('Failed to load AI topics: ' + error.message);
  } finally {
    hideLoading(tutorViewEl);
  }
};

window.startLesson = async function () {
  const subject = document.getElementById('tutorSubject').textContent;
  const topicId = document.getElementById('topicSelector').value;
  if (!topicId) return alert('Please select a topic');

  const lessonContentEl = document.getElementById('lessonContent');
  showLoading(lessonContentEl);
  try {
    const task = await getAITask(subject, topicId);
    if (!task) {
      alert('No AI task content received for this topic.');
      return;
    }

    // Clear previous results
    document.getElementById('quizResults').innerHTML = '';
    window.currentAssessmentId = task.assessmentId;

    // Render Content
    const safeExplanation = (task.explanation || 'No explanation available.').replace(/\n/g, '<br>');
    const safeExamples = (task.examples || '').replace(/\n/g, '<br>');

    document.getElementById('explanationArea').innerHTML = `
      <div class="study-content">
        <div class="explanation-text"><h6>Core Concepts & Notes</h6>${safeExplanation}</div>
        ${task.formula ? `<div class="math-box">$$${task.formula}$$</div>` : ''}
        ${task.examples ? `<div class="examples-box mt-3 p-3 bg-light border-start border-4 border-primary"><h6>Worked Examples</h6>${safeExamples}</div>` : ''}
        ${task.answerInstructions ? `<div class="alert alert-warning mt-2 py-1 small"><strong>Formatting Hint:</strong> ${task.answerInstructions}</div>` : ''}
      </div>
      <div class="mt-4 p-3 border-top text-center" id="quizTransitionArea">
        <p class="mb-3 text-muted">Finished studying the examples? Test your knowledge with a quick AI-generated quiz.</p>
        <button onclick="revealQuizSection()" class="btn btn-success">Yes, I'm Ready for the Quiz!</button>
      </div>
    `;

    // Render Questions as Multiple Choice Questions
    const questionsArea = document.getElementById('questionsArea');
    questionsArea.style.display = 'none'; // Hide by default
    questionsArea.innerHTML = (task.questions || []).map((q, idx) => {
      const qId = q.id || (idx + 1);
      const qText = q.question_text || q.question || `Question ${idx + 1}`;
      const qMarks = q.marks || 2;
      let options = Array.isArray(q.options) && q.options.length >= 4 
        ? q.options.slice(0, 4) 
        : [`A) ${q.answer || 'Option A'}`, `B) Alternative Option 1`, `C) Alternative Option 2`, `D) Alternative Option 3`].slice(0, 4);

      return `
        <div class="question-item mb-3" style="background:#1e293b; padding:1.25rem; border-radius:10px; border:1px solid #334155; margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
            <span style="font-weight:700; color:#f8fafc; font-size:1rem;">Q${idx + 1}: ${qText}</span>
            <span style="background:#312e81; color:#a5b4fc; padding:3px 10px; border-radius:12px; font-weight:700; font-size:0.8rem;">[${qMarks} Marks]</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.6rem;">
            ${options.map((opt) => `
              <label class="mcq-option-label" style="display:flex; align-items:center; gap:10px; background:#0f172a; padding:10px 14px; border-radius:8px; border:1px solid #334155; cursor:pointer; color:#e2e8f0; transition:border-color 0.2s;">
                <input type="radio" name="mcq_q_${qId}" class="quiz-mcq-option" data-id="${qId}" value="${opt}" style="width:18px; height:18px; accent-color:#6366f1;">
                <span style="font-weight:600;">${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Ensure submit button is hidden initially
    if (document.getElementById('submitQuizBtn')) document.getElementById('submitQuizBtn').style.display = 'none';

    lessonContentEl.style.display = 'block';
    // Render LaTeX if KaTeX is present
    if (window.renderMathInElement) window.renderMathInElement(document.getElementById('explanationArea'));
  } catch (error) {
    console.error('Error loading AI task:', error);
    alert('Failed to load AI lesson: ' + error.message);
  } finally {
    hideLoading(lessonContentEl);
  }
};

window.revealQuizSection = function () {
  document.getElementById('quizTransitionArea').style.display = 'none';
  document.getElementById('questionsArea').style.display = 'block';
  const submitBtn = document.getElementById('submitQuizBtn');
  if (submitBtn) submitBtn.style.display = 'block';
  document.getElementById('questionsArea').scrollIntoView({ behavior: 'smooth' });
};

window.submitQuiz = async function () {
  const answers = {};
  document.querySelectorAll('.quiz-answer').forEach(input => {
    if (input.value) answers[input.dataset.id] = input.value;
  });
  document.querySelectorAll('.quiz-mcq-option:checked').forEach(radio => {
    answers[radio.dataset.id] = radio.value;
  });

  let result;
  if (window.isTeacherAssignment) {
    result = await gradeAssignment(window.currentAssessmentId, answers);
    window.isTeacherAssignment = false;
  } else {
    result = await gradeAITask(window.currentAssessmentId, answers);
  }

  document.getElementById('quizResults').innerHTML = `
    <div class="alert alert-info" style="background:#0f172a; border:1px solid #334155; color:#f8fafc; padding:1.25rem; border-radius:10px; margin-top:1rem;">
      <h4 style="color:#38bdf8; margin:0 0 8px 0;">Assessment Result: ${result.percentage}%</h4>
      <p style="margin:4px 0;"><strong>Insight:</strong> ${result.aiInsight || 'Assessment completed successfully.'}</p>
      <p style="margin:4px 0;"><strong>Feedback:</strong> ${result.feedback || 'Good effort on completing the multiple choice quiz.'}</p>
      <p style="margin:4px 0; color:#94a3b8;"><small>Time taken: ${result.timeTaken || 15} seconds</small></p>
    </div>
  `;

  // Refresh performance history after submission
  loadLearnerDashboard();
function displayAssignmentsLegacy(assignments) {
  const container = document.getElementById('assignmentsList');
  if (!container) return;
  if (!assignments || assignments.length === 0) {
    container.innerHTML = '<p class="text-muted">No pending assignments.</p>';
    return;
  }
  container.innerHTML = assignments.map(asn => `
    <div class="card mb-3">
      <div class="card-body">
        <h5>${asn.title}</h5>
        <p class="small text-muted">${asn.subject_target} | Grade ${asn.grade_target}</p>
        <button onclick="window.startAssignment(${asn.id})" class="btn btn-outline-primary btn-sm">Take Assignment</button>
      </div>
    </div>
  `).join('');
}

function displayProgressHistory(history) {
  const tbody = document.getElementById('performanceHistory');
  if (!tbody) return;
  tbody.innerHTML = history.map(p => `
    <tr>
      <td>${p.subject}</td>
      <td><span class="score-pill">${p.percentage}%</span></td>
      <td>${p.time_taken_seconds || '--'}s</td>
      <td><small>${p.aiInsight || 'No insight'}</small></td>
      <td>${new Date(p.date).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

function loadLearnerProfile(profile) {
  const form = document.getElementById('profileForm');
  if (!form) return;
  form.full_name.value = profile.full_name || '';
  form.surname.value = profile.surname || '';
  form.email.value = profile.email || '';
  form.phone.value = profile.phone || '';
  if (form.gender) form.gender.value = profile.gender || '';
  form.physical_address.value = profile.physical_address || '';
}

window.saveProfile = async function (e) {
  if (e) e.preventDefault();
  const form = document.getElementById('profileForm');
  const formData = Object.fromEntries(new FormData(form));
  showLoading(form);
  try {
    await updateProfile(formData);
    alert('Profile updated successfully!');
  } catch (error) {
    alert('Update failed: ' + error.message);
  } finally {
    hideLoading(form);
  }
};

window.loadLeaderboard = async function () {
  const subject = document.getElementById('tutorSubject').textContent;
  const board = await getLeaderboard(subject);
  const list = document.getElementById('leaderboardList');
  list.innerHTML = board.map((entry, index) => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <span>#${index + 1} Learner ${entry.rank_id}</span>
      <span class="badge bg-success rounded-pill">${entry.score}%</span>
    </li>
  `).join('') || '<li class="list-group-item">No entries yet.</li>';
};

window.closeTutor = function () {
  document.getElementById('tutorView').style.display = 'none';
  document.getElementById('mainDashboard').style.display = 'block';
  document.getElementById('lessonContent').style.display = 'none';
  document.getElementById('quizResults').innerHTML = '';
}

function displayAnnouncements(anns, containerId = 'announcementsList') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = anns.map(ann => `
    <div class="announcement">
      <h4>${ann.title}</h4>
      <p>${ann.content}</p>
      <small>${new Date(ann.created_at).toLocaleString()}</small>
    </div>
  `).join('');
}

function displayDashboardTasks(tasks) {
  // This function needs to be implemented based on your HTML structure
  // For example:
  const pendingContainer = document.getElementById('pendingTasks');
  const completedContainer = document.getElementById('completedTasks');

  if (pendingContainer) {
    const pending = tasks.filter(t => !t.is_submitted);
    pendingContainer.innerHTML = pending.length ? pending.map(t => `<div>${t.title}</div>`).join('') : '<p>No pending tasks.</p>';
  }
  if (completedContainer) {
    const completed = tasks.filter(t => t.is_submitted);
    completedContainer.innerHTML = completed.length ? completed.map(t => `<div>${t.title}</div>`).join('') : '<p>No completed tasks.</p>';
  }
}

/* =========================================================
   LEARNER REDESIGNED VIEWS (ATTENDANCE, ACHIEVEMENTS, GRADES, ANNOUNCEMENTS)
   ========================================================= */

window.loadLearnerAttendance = async function() {
    try {
        const data = await safeApiCall('/api/learner/attendance-overview');
        if (!data) return;

        // 1. Top Stat Cards
        document.getElementById('att-stat-overall').textContent = `${data.overall_attendance}%`;
        document.getElementById('att-stat-attended').textContent = data.classes_attended;
        document.getElementById('att-stat-total-attended').textContent = `of ${data.total_classes} classes`;
        document.getElementById('att-stat-missed').textContent = data.classes_missed;
        document.getElementById('att-stat-total-missed').textContent = `of ${data.total_classes} classes`;

        // 2. Calendar Month Render
        renderAttendanceCalendar(data.calendar_logs || []);

        // 3. Attendance Trends Line Chart
        renderAttendanceTrendsChart(data.overall_attendance);

        // 4. Attendance by Class List
        const byClassContainer = document.getElementById('att-by-class-list');
        if (byClassContainer && data.attendance_by_class) {
            byClassContainer.innerHTML = data.attendance_by_class.map(c => `
                <div class="class-attendance-row">
                    <div class="class-subj-info">
                        <h4>${c.subject}</h4>
                        <p>${c.teacher}</p>
                    </div>
                    <div class="class-att-progress">
                        <span style="font-size:0.85rem; font-weight:700; color:#f8fafc;">${c.attendance_rate}%</span>
                        <span style="font-size:0.75rem; color:#64748b;">${c.attended_count}/${c.total_count} classes</span>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${c.attendance_rate}%;"></div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // 5. Attendance Overview Donut Chart
        renderAttendanceOverviewChart(data.overall_attendance);

        // 6. Recent Absences & Lates
        window.currentAbsencesLogs = data.recent_absences_lates || [];
        renderRecentAbsences('absent');

    } catch (err) {
        console.error('Error loading attendance view:', err);
    }
};

let currentCalDate = new Date(); // Dynamic date instance tracking month/year
window.allLearnerAttendanceLogs = [];

function renderAttendanceCalendar(logs) {
    if (logs && Array.isArray(logs)) {
        window.allLearnerAttendanceLogs = logs;
    }
    const grid = document.getElementById('att-calendar-grid');
    if (!grid) return;

    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth(); // 0-11
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Update Header Title
    const monthTitle = document.getElementById('att-calendar-month-name');
    if (monthTitle) monthTitle.textContent = `${months[month]} ${year}`;

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = daysOfWeek.map(d => `<div class="cal-day-header">${d}</div>`).join('');

    // First day of current month & total days in current month
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    // Map logs by YYYY-MM-DD for fast lookup
    const logsMap = {};
    (window.allLearnerAttendanceLogs || []).forEach(l => {
        if (l.attendance_date) {
            const dStr = new Date(l.attendance_date).toISOString().split('T')[0];
            logsMap[dStr] = l.status;
        }
    });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 1. Render Previous Month Padding Days
    for (let p = firstDayIndex - 1; p >= 0; p--) {
        const prevDay = prevMonthTotalDays - p;
        html += `<div class="cal-day-cell" style="opacity: 0.25;">${prevDay}</div>`;
    }

    // 2. Render Current Month Days
    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dayOfWeek = dateObj.getDay();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = dateStr === todayStr;

        let statusClass = '';
        if (logsMap[dateStr]) {
            statusClass = logsMap[dateStr]; // present, absent, late, excused
        } else if (!isWeekend && dateObj < today) {
            // Default weekday status if past day and no explicit mark
            statusClass = 'present';
        }

        if (isWeekend) statusClass = ''; // No class on weekends

        html += `<div class="cal-day-cell ${statusClass} ${isToday ? 'today-highlight' : ''}" title="${months[month]} ${day}, ${year}: ${statusClass || (isWeekend ? 'Weekend' : 'Not Marked Yet')}">${day}</div>`;
    }

    // 3. Render Next Month Padding Days to complete 35 or 42 cells
    const totalCells = firstDayIndex + totalDaysInMonth;
    const remainingCells = (totalCells > 35 ? 42 : 35) - totalCells;
    for (let n = 1; n <= remainingCells; n++) {
        html += `<div class="cal-day-cell" style="opacity: 0.25;">${n}</div>`;
    }

    grid.innerHTML = html;
}

window.changeAttMonth = function(delta) {
    currentCalDate.setMonth(currentCalDate.getMonth() + delta);
    renderAttendanceCalendar();
};

function renderAttendanceTrendsChart(overallRate) {
    const ctx = document.getElementById('learnerAttendanceTrendsChart')?.getContext('2d');
    if (!ctx) return;
    if (window.attTrendsChartInstance) window.attTrendsChartInstance.destroy();

    window.attTrendsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Term 1 (2025)', 'Term 2 (2025)', 'Term 3 (2025)', 'Term 4 (2025)', 'Term 1 (2026)', 'Term 2 (2026)'],
            datasets: [{
                label: 'Attendance Rate (%)',
                data: [82, 87, 84, 89, 87, overallRate || 92],
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#a855f7'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { min: 60, max: 100, ticks: { color: '#64748b' } }, x: { ticks: { color: '#64748b' } } },
            plugins: { legend: { display: false } }
        }
    });
}

function renderAttendanceOverviewChart(overallRate) {
    const ctx = document.getElementById('learnerAttendanceOverviewChart')?.getContext('2d');
    if (!ctx) return;
    if (window.attOverviewChartInstance) window.attOverviewChartInstance.destroy();

    window.attOverviewChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Present (92%)', 'Late (4%)', 'Absent (4%)'],
            datasets: [{
                data: [overallRate || 92, 4, 4],
                backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { legend: { display: false } }
        }
    });
}

window.setAbsencesTab = function(type, btn) {
    document.querySelectorAll('.absences-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderRecentAbsences(type);
};

function renderRecentAbsences(type) {
    const container = document.getElementById('att-recent-absences-list');
    if (!container) return;

    const list = window.currentAbsencesLogs || [
        { subject: 'Physical Sciences Lab', date: '2026-05-15', status: 'absent' },
        { subject: 'English Essay Class', date: '2026-05-05', status: 'late' },
        { subject: 'Life Sciences Test', date: '2026-04-18', status: 'absent' }
    ];

    const filtered = list.filter(item => item.status === type);
    container.innerHTML = filtered.length ? filtered.map(item => `
        <div class="absence-item-row">
            <div>
                <strong style="color:#f8fafc; font-size:0.88rem;">${item.subject}</strong>
                <div style="font-size:0.75rem; color:#64748b;">${new Date(item.date).toDateString()}</div>
            </div>
            <span class="status-badge-tag ${item.status}">${item.status.toUpperCase()}</span>
        </div>
    `).join('') : '<p style="color:#64748b; font-size:0.85rem; padding:10px 0;">No records found.</p>';
}

/* --- ACHIEVEMENTS VIEW RENDER --- */
let allAchievementsData = [];

window.loadLearnerAchievements = async function() {
    try {
        const data = await safeApiCall('/api/learner/achievements-overview');
        if (!data) return;

        document.getElementById('ach-stat-total').textContent = data.total_achievements;
        document.getElementById('ach-stat-term').textContent = data.this_term_achievements;
        document.getElementById('ach-stat-points').textContent = data.points_earned.toLocaleString();
        document.getElementById('ach-stat-level').textContent = data.current_level;
        document.getElementById('ach-stat-streak').textContent = data.streak_days;

        allAchievementsData = data.achievements || [];
        window.filterAchievements('All');

        renderAchievementsProgressChart(data.completed_count, data.in_progress_count);
        renderAchievementsLeaderboard(data.leaderboard || []);

    } catch (err) {
        console.error('Error loading achievements view:', err);
    }
};

window.filterAchievements = function(category, btn) {
    if (btn) {
        document.querySelectorAll('.ach-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
    }

    const container = document.getElementById('achievements-feed-container');
    if (!container) return;

    const filtered = category === 'All' ? allAchievementsData : allAchievementsData.filter(a => a.category === category);
    container.innerHTML = filtered.map(a => `
        <div class="achievement-card-row">
            <div class="ach-icon-box"><i class="fas fa-award"></i></div>
            <div class="ach-info-body">
                <h4>${a.title}</h4>
                <p>${a.desc}</p>
                <div style="margin-top:6px;"><span class="ach-badge-tag">${a.category}</span></div>
            </div>
            <div class="ach-status-col">
                <div style="text-align:right;">
                    <div style="font-weight:700; color:#4ade80; font-size:0.9rem;">+${a.points} Points</div>
                    <div style="font-size:0.75rem; color:#64748b;">${a.date}</div>
                </div>
                ${a.earned ? '<span class="btn-earned-badge">Earned ✓</span>' : '<span class="btn-in-progress">In Progress</span>'}
            </div>
        </div>
    `).join('');
};

function renderAchievementsProgressChart(completed, inProgress) {
    const ctx = document.getElementById('learnerAchievementsProgressChart')?.getContext('2d');
    if (!ctx) return;
    if (window.achProgressChartInstance) window.achProgressChartInstance.destroy();

    window.achProgressChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed (24)', 'In Progress (4)', 'Locked (4)'],
            datasets: [{
                data: [completed || 24, inProgress || 4, 4],
                backgroundColor: ['#6366f1', '#3b82f6', '#475569'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { legend: { display: false } }
        }
    });
}

function renderAchievementsLeaderboard(leaderboard) {
    const container = document.getElementById('achievements-leaderboard-list');
    if (!container) return;

    container.innerHTML = leaderboard.map((item, idx) => `
        <div class="leaderboard-rank-item ${idx === 1 ? 'highlight' : ''}">
            <div class="rank-user-info">
                <div class="rank-avatar">${item.full_name ? item.full_name[0] : 'U'}</div>
                <div>
                    <strong style="color:#f8fafc; font-size:0.88rem;">${item.full_name} ${item.surname} ${idx === 1 ? '(You)' : ''}</strong>
                </div>
            </div>
            <span style="font-weight:700; color:#a5b4fc; font-size:0.85rem;">${item.points ? item.points.toLocaleString() : '3,250'} Points</span>
        </div>
    `).join('');
}

/* --- GRADES VIEW RENDER --- */
window.loadLearnerGrades = async function() {
    try {
        const data = await safeApiCall('/api/learner/grades-overview');
        if (!data) return;

        document.getElementById('grades-stat-avg').textContent = `${data.overall_average}%`;
        document.getElementById('grades-stat-highest').textContent = `${data.highest_grade}%`;
        document.getElementById('grades-stat-highest-subj').textContent = data.highest_grade_subject;
        document.getElementById('grades-stat-passed').textContent = `${data.subjects_passed_count} / ${data.total_subjects_count}`;

        const tbody = document.getElementById('grades-by-subject-tbody');
        if (tbody && data.grades_by_subject) {
            tbody.innerHTML = data.grades_by_subject.map(g => `
                <tr>
                    <td style="font-weight:600; color:#f8fafc;">${g.subject}</td>
                    <td style="color:#94a3b8;">${g.teacher}</td>
                    <td><span class="letter-grade-tag">${g.letter}</span></td>
                    <td style="font-weight:700; color:#f8fafc;">${g.average}%</td>
                    <td style="color:#4ade80; font-weight:600;">${g.trend}</td>
                    <td>
                        <div class="progress-bar-bg" style="width:80px;">
                            <div class="progress-bar-fill" style="width: ${g.progress}%;"></div>
                        </div>
                    </td>
                    <td><button type="button" class="btn btn-neutral" style="padding:4px 10px; font-size:0.75rem; background:#334155; color:#fff;" onclick="openSubjectWorkspace('${g.subject}')">View</button></td>
                </tr>
            `).join('');
        }

        renderGradesTrendChart();
        renderGradeDistributionChart();

        const updatesContainer = document.getElementById('grades-recent-updates-list');
        if (updatesContainer && data.recent_grade_updates) {
            updatesContainer.innerHTML = data.recent_grade_updates.map(u => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #334155;">
                    <div>
                        <strong style="color:#f8fafc; font-size:0.88rem;">${u.subject}</strong>
                        <div style="font-size:0.75rem; color:#64748b;">${new Date(u.date).toDateString()}</div>
                    </div>
                    <span class="badge" style="background:#22c55e; color:#fff; font-weight:700;">${u.grade}%</span>
                </div>
            `).join('');
        }

    } catch (err) {
        console.error('Error loading grades view:', err);
    }
};

function renderGradesTrendChart() {
    const ctx = document.getElementById('learnerGradesTrendChart')?.getContext('2d');
    if (!ctx) return;
    if (window.gradesTrendChartInstance) window.gradesTrendChartInstance.destroy();

    window.gradesTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Term 1 (2025)', 'Term 2 (2025)', 'Term 3 (2025)', 'Term 4 (2025)', 'Term 1 (2026)', 'Term 2 (2026)'],
            datasets: [{
                label: 'Grade Average (%)',
                data: [72, 74, 76, 79, 78, 85],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { min: 50, max: 100, ticks: { color: '#64748b' } }, x: { ticks: { color: '#64748b' } } },
            plugins: { legend: { display: false } }
        }
    });
}

function renderGradeDistributionChart() {
    const ctx = document.getElementById('learnerGradeDistributionChart')?.getContext('2d');
    if (!ctx) return;
    if (window.gradeDistChartInstance) window.gradeDistChartInstance.destroy();

    window.gradeDistChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['A (80-100%)', 'B (70-79%)', 'C (60-69%)', 'D (50-59%)', 'F (0-49%)'],
            datasets: [{
                data: [4, 3, 1, 0, 0],
                backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { display: false } }
        }
    });
}

/* --- ANNOUNCEMENTS VIEW RENDER --- */
let allAnnouncementsData = [];

window.loadLearnerAnnouncements = async function() {
    try {
        const data = await safeApiCall('/api/learner/announcements-overview');
        if (!data) return;

        document.getElementById('ann-stat-total').textContent = data.total_announcements;
        document.getElementById('ann-stat-unread').textContent = data.unread_announcements;
        document.getElementById('ann-stat-important').textContent = data.important_updates;

        allAnnouncementsData = data.announcements || [];
        window.filterAnnouncements('All');

        const upcomingContainer = document.getElementById('upcoming-announcements-list');
        if (upcomingContainer && data.upcoming_important) {
            upcomingContainer.innerHTML = data.upcoming_important.map(item => `
                <div style="padding:10px; background:#0f172a; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:#f8fafc; font-size:0.85rem;">${item.title}</strong>
                        <div style="font-size:0.75rem; color:#64748b;">${new Date(item.created_at).toDateString()}</div>
                    </div>
                    <span class="ann-cat-tag Important">Important</span>
                </div>
            `).join('');
        }

    } catch (err) {
        console.error('Error loading announcements view:', err);
    }
};

window.filterAnnouncements = function(category, btn) {
    if (btn) {
        document.querySelectorAll('.ach-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
    }

    const container = document.getElementById('announcements-feed-container');
    if (!container) return;

    const filtered = category === 'All' ? allAnnouncementsData : allAnnouncementsData.filter(a => a.category === category);
    container.innerHTML = filtered.map(a => `
        <div class="announcement-full-card">
            <div class="ann-card-header-bar">
                <strong style="font-size:1rem; color:#f8fafc;">${a.title}</strong>
                <span class="ann-cat-tag ${a.category}">${a.category}</span>
            </div>
            <div style="font-size:0.78rem; color:#64748b; margin-bottom:10px;">By ${a.author} • ${new Date(a.created_at).toDateString()}</div>
            <p style="color:#cbd5e1; font-size:0.88rem; line-height:1.5; margin:0;">${a.content}</p>
        </div>
    `).join('');
};

window.switchTab = function(tabId, el) {
    const sections = document.querySelectorAll('.section');
    const navItems = document.querySelectorAll('.nav-item');

    sections.forEach(s => s.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));

    const targetSection = document.getElementById(tabId);
    if (targetSection) targetSection.classList.add('active');

    const activeNav = el || Array.from(navItems).find(n => n.getAttribute('onclick')?.includes(`'${tabId}'`));
    if (activeNav) {
        activeNav.classList.add('active');
        const titleEl = document.getElementById('tab-title');
        if (titleEl) titleEl.innerText = activeNav.innerText.trim();
    }

    location.hash = tabId;
    window.scrollTo(0, 0);

    // Trigger real-time data refresh on tab switch
    if (tabId === 'home') {
        if (window.loadLearnerDashboard) window.loadLearnerDashboard();
    } else if (tabId === 'subjects') {
        if (window.loadLearnerMySubjectsOverview) window.loadLearnerMySubjectsOverview();
    } else if (tabId === 'assessments') {
        if (window.loadLearnerAssignmentsOverview) window.loadLearnerAssignmentsOverview();
    } else if (tabId === 'grades') {
        if (window.loadLearnerGradesOverview) window.loadLearnerGradesOverview();
    } else if (tabId === 'attendance') {
        if (window.loadLearnerAttendanceOverview) window.loadLearnerAttendanceOverview();
    } else if (tabId === 'timetable') {
        if (window.loadAndDisplayTimetable) window.loadAndDisplayTimetable();
    } else if (tabId === 'announcements') {
        if (window.loadLearnerAnnouncementsOverview) window.loadLearnerAnnouncementsOverview();
    } else if (tabId === 'messages') {
        if (window.initMessageCenter) window.initMessageCenter();
    } else if (tabId === 'achievements') {
        if (window.loadLearnerAchievements) window.loadLearnerAchievements();
    }
};

// Listen for hash change for deep linking in learner portal
window.addEventListener('hashchange', () => {
    const currentHash = location.hash.replace('#', '');
    if (currentHash && window.switchTab) {
        window.switchTab(currentHash);
    }
});

// Auto-trigger subject overview load as soon as script/module loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.loadLearnerMySubjectsOverview) window.loadLearnerMySubjectsOverview();
    });
} else {
    if (window.loadLearnerMySubjectsOverview) window.loadLearnerMySubjectsOverview();
}