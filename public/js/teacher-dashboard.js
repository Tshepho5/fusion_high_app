/**
 * Teacher Dashboard Master Entry Point
 * Orchestrates modularized frontend ES-modules for Teacher Portal.
 */
import { apiCall } from './api.js';

import { 
    loadTeacherOverviewStats, 
    loadPerformanceOverview 
} from './teacher/teacher-overview.js';

import { 
    loadMySubjectsSection,
    filterTeacherSubjects,
    setSubjectView,
    toggleSubjectLearnersSection,
    openSubjectAttendance,
    openSubjectAnnouncement,
    openSubjectAIWorkspace,
    backToSubjects,
    switchSubjectSubTab,
    setAIMode,
    executeAIGeneration,
    printAILessonPlan,
    printAITestPaper,
    backToGen,
    publishAssignment,
    loadSubjectCAPSTopics,
    selectCAPSTopic
} from './teacher/teacher-workload.js';

import { 
    loadMyLearnersCards,
    filterLearnerCards,
    viewSubjectLearners,
    filterSubjectLearnerCards,
    openFullLearnersTab,
    openClassMarkSheet, 
    updateMarkSheetRowStatus,
    updateMarkSheetStats,
    saveClassMarkSheet, 
    exportClassMarkSheetCSV,
    importClassMarkSheetCSV,
    viewLearnerProgress 
} from './teacher/teacher-learners.js';

import { 
    openSubjectAttendance as openSubjAttModal,
    loadSubjectAttendanceData,
    updateSubjectAttendanceCounts,
    submitSubjectAttendanceModal,
    loadAttendanceRegister, 
    submitAttendanceRegister 
} from './teacher/teacher-attendance.js';

import { 
    loadMyTextbooks, 
    openTextbookManager, 
    handleTextbookModalUpload 
} from './teacher/teacher-textbooks.js';

import { downloadCapsReportCard } from './reportCardGenerator.js';
import { initMessageCenter, selectContact, sendChatMessage, filterChatContacts } from './chat-center.js';

// Attach global window handlers for HTML onclick bindings
window.initMessageCenter = initMessageCenter;
window.selectContact = selectContact;
window.sendChatMessage = sendChatMessage;
window.filterChatContacts = filterChatContacts;
window.downloadCapsReportCard = downloadCapsReportCard;
window.loadTeacherOverviewStats = loadTeacherOverviewStats;
window.loadPerformanceOverview = loadPerformanceOverview;
window.loadMySubjectsSection = loadMySubjectsSection;
window.filterTeacherSubjects = filterTeacherSubjects;
window.setSubjectView = setSubjectView;
window.toggleSubjectLearnersSection = toggleSubjectLearnersSection;
window.openSubjectAttendance = openSubjectAttendance;
window.loadSubjectAttendanceData = loadSubjectAttendanceData;
window.updateSubjectAttendanceCounts = updateSubjectAttendanceCounts;
window.submitSubjectAttendanceModal = submitSubjectAttendanceModal;
window.openSubjectAnnouncement = openSubjectAnnouncement;
window.openSubjectAIWorkspace = openSubjectAIWorkspace;
window.backToSubjects = backToSubjects;
window.switchSubjectSubTab = switchSubjectSubTab;
window.setAIMode = setAIMode;
window.executeAIGeneration = executeAIGeneration;
window.printAILessonPlan = printAILessonPlan;
window.printAITestPaper = printAITestPaper;
window.backToGen = backToGen;
window.publishAssignment = publishAssignment;
window.loadSubjectCAPSTopics = loadSubjectCAPSTopics;
window.selectCAPSTopic = selectCAPSTopic;
window.loadMyLearnersCards = loadMyLearnersCards;
window.filterLearnerCards = filterLearnerCards;
window.viewSubjectLearners = viewSubjectLearners;
window.filterSubjectLearnerCards = filterSubjectLearnerCards;
window.openFullLearnersTab = openFullLearnersTab;
window.openClassMarkSheet = openClassMarkSheet;
window.updateMarkSheetRowStatus = updateMarkSheetRowStatus;
window.updateMarkSheetStats = updateMarkSheetStats;
window.saveClassMarkSheet = saveClassMarkSheet;
window.exportClassMarkSheetCSV = exportClassMarkSheetCSV;
window.importClassMarkSheetCSV = importClassMarkSheetCSV;
window.viewLearnerProgress = viewLearnerProgress;
window.loadAttendanceRegister = loadAttendanceRegister;
window.submitAttendanceRegister = submitAttendanceRegister;
window.loadMyTextbooks = loadMyTextbooks;
window.openTextbookManager = openTextbookManager;
window.handleTextbookModalUpload = handleTextbookModalUpload;

// Tab Switching & Navigation Handler
window.switchTab = function(tabId, el) {
    const tab = tabId || 'overview';
    
    // Normalize tab alias IDs
    let resolvedTabId = tab;
    if (tab === 'workload' || tab === 'subjects') resolvedTabId = 'my-subjects';
    if (tab === 'learners') resolvedTabId = 'my-learners';

    const sections = document.querySelectorAll('.section, .dashboard-tab');
    const navItems = document.querySelectorAll('.nav-item, .sidebar-nav li, .nav-list li');

    // Hide all sections and reset inline display styles
    sections.forEach(t => {
        t.classList.remove('active');
        t.style.display = 'none';
    });

    // Reset active class on all nav items
    navItems.forEach(l => l.classList.remove('active'));

    // Display active tab section only
    const activeTab = document.getElementById(resolvedTabId) || document.getElementById(tab);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.display = 'block';
    }

    // Highlight active nav element
    const activeNav = el || Array.from(navItems).find(n => 
        n.getAttribute('onclick')?.includes(`'${tab}'`) ||
        n.getAttribute('onclick')?.includes(`'${resolvedTabId}'`) ||
        n.querySelector(`a[href="#${tab}"]`) ||
        n.querySelector(`a[href="#${resolvedTabId}"]`)
    );

    if (activeNav) {
        const targetEl = activeNav.tagName === 'A' ? activeNav.parentElement : activeNav;
        targetEl.classList.add('active');

        const titleEl = document.getElementById('tab-title');
        if (titleEl) {
            titleEl.innerText = targetEl.innerText.trim();
        }
    }

    location.hash = resolvedTabId;

    // Reset scroll position to top when switching tabs
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;
    window.scrollTo(0, 0);

    // Trigger tab-specific loaders
    if (resolvedTabId === 'overview') {
        loadTeacherOverviewStats();
        loadPerformanceOverview();
    } else if (resolvedTabId === 'my-subjects') {
        loadMySubjectsSection();
    } else if (resolvedTabId === 'my-learners') {
        loadMyLearnersCards();
    } else if (resolvedTabId === 'attendance') {
        loadAttendanceRegister();
    } else if (resolvedTabId === 'messages') {
        if (window.initMessageCenter) window.initMessageCenter();
    }
};


async function loadTeacherData() {
    try {
        const profile = await apiCall('/profile');
        if (profile) {
            const nameEl = document.getElementById('top-teacher-name');
            if (nameEl) nameEl.innerText = `${profile.full_name || ''} ${profile.surname || ''}`.trim() || 'Teacher';
        }

        const workload = await apiCall('/teacher/workload');
        if (workload) {
            localStorage.setItem('teacherWorkload', JSON.stringify(workload));
            renderWorkloadSummary(workload);
        }
    } catch (err) {
        console.error('Error loading teacher profile/workload:', err);
    }
}

function renderWorkloadSummary(workload) {
    const container = document.getElementById('workload-summary');
    if (!container || !workload) return;

    const subjects = workload.subjects || ['Mathematics', 'Physical Sciences', 'Life Sciences'];
    const codes = workload.subject_codes || ['MATH10S', 'PHSC11', 'LFSC12'];
    const grades = workload.grades_taught || [10, 11, 12];
    const classes = workload.classes_taught || ['10A', '11A', '12A'];

    container.innerHTML = `
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; color:#f8fafc; font-size:0.85rem;">
                <thead>
                    <tr style="background:#0f172a; color:#94a3b8; text-align:left; border-bottom:1px solid #334155;">
                        <th style="padding:10px;">Subject Name</th>
                        <th style="padding:10px;">Subject Code</th>
                        <th style="padding:10px;">Grades Taught</th>
                        <th style="padding:10px;">Classes Taught</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjects.map((subj, idx) => `
                        <tr style="border-bottom:1px solid #1e293b;">
                            <td style="padding:10px; font-weight:700; color:#38bdf8;">
                                <i class="fas fa-book me-1" style="color:#6366f1;"></i> ${subj}
                            </td>
                            <td style="padding:10px; color:#cbd5e1;">${codes[idx] || 'CAPS'}</td>
                            <td style="padding:10px; color:#cbd5e1;">Grade ${Array.isArray(grades) ? grades.join(', Grade ') : grades}</td>
                            <td style="padding:10px; color:#4ade80; font-weight:600;">${Array.isArray(classes) ? classes.join(', ') : classes}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function setupAnnouncementForm() {
    const form = document.getElementById('annForm');
    if (form && !form.dataset.listenerAttached) {
        form.dataset.listenerAttached = 'true';
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('annTitle')?.value?.trim();
            const content = document.getElementById('annContent')?.value?.trim();
            const role_target = document.getElementById('annTarget')?.value || 'all';
            const grade_target = document.getElementById('annGrade')?.value ? parseInt(document.getElementById('annGrade').value, 10) : null;
            const stream_target = document.getElementById('annStream')?.value || null;
            const subject_target = document.getElementById('annSubject')?.value || null;

            if (!title || !content) {
                alert('Please enter both title and content for the announcement.');
                return;
            }

            try {
                await apiCall('/announcements', {
                    method: 'POST',
                    body: JSON.stringify({
                        title,
                        content,
                        role_target,
                        grade_target,
                        stream_target,
                        subject_target
                    })
                });

                alert(`Announcement posted successfully to destination: ${role_target.toUpperCase()}!`);
                form.reset();
                refreshAnnouncements();
            } catch (err) {
                alert('Failed to post announcement: ' + err.message);
            }
        });
    }
}

async function refreshAnnouncements() {
    const listEl = document.getElementById('recent-announcements-list') || document.getElementById('announcementsList');
    if (!listEl) return;
    try {
        const announcements = await apiCall('/announcements');
        if (!announcements || !Array.isArray(announcements) || announcements.length === 0) {
            listEl.innerHTML = `<p style="color:#94a3b8; padding:1rem; text-align:center;">No active announcements.</p>`;
            return;
        }
        listEl.innerHTML = announcements.slice(0, 5).map(a => `
            <div style="background:#1e293b; padding:0.75rem 1rem; border-radius:8px; margin-bottom:0.5rem; border:1px solid #334155;">
                <strong style="color:#f8fafc; font-size:0.95rem;">${a.title}</strong>
                <span style="display:inline-block; font-size:0.7rem; background:#312e81; color:#a5b4fc; padding:2px 6px; border-radius:4px; margin-left:6px;">Target: ${(a.role_target || 'all').toUpperCase()}</span>
                <p style="color:#cbd5e1; font-size:0.85rem; margin:0.25rem 0 0 0;">${a.content}</p>
                <small style="color:#94a3b8; font-size:0.75rem;">${new Date(a.created_at).toLocaleDateString()}</small>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error refreshing announcements:', err);
    }
}

async function loadTeacherProfileDetails() {
    try {
        const details = await apiCall('/teacher/profile-details');
        if (!details) return;

        const displayName = document.getElementById('prof-display-name');
        if (displayName) displayName.textContent = `${details.full_name || ''} ${details.surname || ''}`.trim() || 'Teacher';

        const displayEmp = document.getElementById('prof-display-emp');
        if (displayEmp) displayEmp.textContent = `Employee Number: ${details.employee_number || 'EMP-001'}`;

        const displaySubjects = document.getElementById('prof-display-subjects');
        if (displaySubjects && Array.isArray(details.subjects)) {
            displaySubjects.innerHTML = details.subjects.map(s => 
                `<span style="background:#312e81; color:#a5b4fc; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;"><i class="fas fa-book me-1"></i> ${s}</span>`
            ).join('');
        }

        if (document.getElementById('prof-name')) document.getElementById('prof-name').value = details.full_name || '';
        if (document.getElementById('prof-surname')) document.getElementById('prof-surname').value = details.surname || '';
        if (document.getElementById('prof-email')) document.getElementById('prof-email').value = details.email || '';
        if (document.getElementById('prof-phone')) document.getElementById('prof-phone').value = details.phone || '';
        if (document.getElementById('prof-address')) document.getElementById('prof-address').value = details.physical_address || '';
    } catch (err) {
        console.error('Error loading teacher profile details:', err);
    }
}

window.logout = function() {
    const modal = document.getElementById('logoutConfirmModal');
    if (modal) modal.style.display = 'flex';
    else window.executeLogout();
};

window.executeLogout = function() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
};

function initTeacherDashboard() {
    loadTeacherOverviewStats();
    loadTeacherData();
    setupAnnouncementForm();
    refreshAnnouncements();
    loadMyLearnersCards();
    loadTeacherProfileDetails();
    if (window.initMessageCenter) window.initMessageCenter();
    const currentHash = location.hash.replace('#', '') || 'overview';
    window.switchTab(currentHash);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initTeacherDashboard();
} else {
    window.addEventListener('DOMContentLoaded', initTeacherDashboard);
    window.addEventListener('load', initTeacherDashboard);
}
window.addEventListener('hashchange', () => window.switchTab(location.hash.replace('#', '')));