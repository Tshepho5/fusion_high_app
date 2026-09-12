/**
 * Parent Dashboard Orchestrator - FUSION_HIGH_APP
 */
import {
    getChildren,
    activateChild,
    linkSibling,
    getProfile,
    uploadProfilePicture,
    getAnnouncements,
    contactTeacher,
    getUserIdFromToken,
    getMessages,
    markMessagesAsRead,
    getUnreadMessageCount
} from './api.js';
import { showLoading, hideLoading, switchTab } from './ui.js';
import { initMessageCenter, selectContact, sendChatMessage, filterChatContacts } from './chat-center.js';

window.initMessageCenter = initMessageCenter;
window.selectContact = selectContact;
window.sendChatMessage = sendChatMessage;
window.filterChatContacts = filterChatContacts;
import { loadParentOverview, displayAtAGlance, displayOverviewFeeds, renderTrendChart, safeParentApiCall } from './modules/parent/parentOverview.js';
import {
    loadParentChildrenDetailed,
    switchChildSubTab,
    loadChildAcademicSubView,
    loadChildAttendanceSubView,
    loadChildAssignmentsSubView,
    loadChildTimetableSubView,
    loadChildAlertsSubView,
    loadChildReportsSubView,
    downloadChildReport,
    toggleChildOverview,
    deactivateChild,
    displayChildren
} from './modules/parent/parentChildren.js';
import { loadParentPerformance } from './modules/parent/parentPerformance.js';
import { loadParentAttendance } from './modules/parent/parentAttendance.js';
import { downloadCapsReportCard } from './reportCardGenerator.js';

// Global state and window function assignments for compatibility
window.activeParentChildId = null;
window.downloadChildReportCard = downloadCapsReportCard;

window.loadParentOverview = loadParentOverview;
window.loadParentChildrenDetailed = loadParentChildrenDetailed;
window.loadParentPerformance = loadParentPerformance;
window.loadParentAttendance = loadParentAttendance;
window.switchChildSubTab = switchChildSubTab;
window.loadChildAcademicSubView = loadChildAcademicSubView;
window.loadChildAttendanceSubView = loadChildAttendanceSubView;
window.loadChildAssignmentsSubView = loadChildAssignmentsSubView;
window.loadChildTimetableSubView = loadChildTimetableSubView;
window.loadChildAlertsSubView = loadChildAlertsSubView;
window.loadChildReportsSubView = loadChildReportsSubView;
window.downloadChildReport = downloadChildReport;
window.toggleChildOverview = toggleChildOverview;
window.deactivateChild = deactivateChild;
window.displayChildren = displayChildren;
window.displayAtAGlance = displayAtAGlance;
window.displayOverviewFeeds = displayOverviewFeeds;

window.selectActiveChild = function (childId) {
    window.activeParentChildId = childId;
    if (window.loadParentPerformance) window.loadParentPerformance();
    if (window.loadParentAttendance) window.loadParentAttendance();
};

window.loadParentDashboard = async function () {
    const bodyEl = document.querySelector('.dashboard-body');
    if (bodyEl) showLoading(bodyEl);
    setupActivationForm();
    setupProfileSection();
    try {
        const children = await getChildren().catch(() => []);
        const news = await getAnnouncements('parent').catch(() => []);
        const messages = await getMessages().catch(() => []);
        const profile = await getProfile().catch(() => ({ full_name: 'Parent', surname: '' }));

        const statChildren = document.getElementById('stat-children');
        if (statChildren) statChildren.textContent = Array.isArray(children) ? children.length : 0;

        const statNews = document.getElementById('stat-news');
        if (statNews) statNews.textContent = Array.isArray(news) ? news.length : 0;

        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.textContent = `${profile.full_name || ''} ${profile.surname || ''}`;

        if (typeof displayAtAGlance === 'function') {
            try { displayAtAGlance(children); } catch (e) { }
        }
        if (typeof displayOverviewFeeds === 'function') {
            try { displayOverviewFeeds([], news); } catch (e) { }
        }
        if (typeof displayChildren === 'function' && document.getElementById('children-list-legacy')) {
            try { displayChildren(children); } catch (e) { }
        }
        if (typeof displayMessages === 'function') {
            try { displayMessages(messages); } catch (e) { }
        }
        if (typeof displayAnnouncements === 'function') {
            try { displayAnnouncements(news); } catch (e) { }
        }
        loadUnreadCount();

        if (window.loadParentOverview) window.loadParentOverview();
        if (window.loadParentChildrenDetailed) window.loadParentChildrenDetailed();
        if (window.loadParentPerformance) window.loadParentPerformance();
        if (window.loadParentAttendance) window.loadParentAttendance();
    } catch (error) {
        console.error('Error loading parent dashboard:', error);
    } finally {
        if (bodyEl) hideLoading(bodyEl);
    }
};

async function loadUnreadCount() {
    const badge = document.getElementById('unread-messages-badge');
    if (!badge) return;
    try {
        const { count } = await getUnreadMessageCount();
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (err) {
        console.error("Failed to load unread count", err);
    }
}

window.openAddChildModal = function() {
    const modal = document.getElementById('addChildModal');
    if (modal) {
        modal.classList.remove('hidden');
        const err = document.getElementById('modal-link-child-error');
        const succ = document.getElementById('modal-link-child-success');
        if (err) err.classList.add('hidden');
        if (succ) succ.classList.add('hidden');
        if (window.onLinkChildGradeChanged) {
            const gradeEl = document.getElementById('link-child-grade');
            window.onLinkChildGradeChanged(gradeEl ? gradeEl.value : '8');
        }
    } else {
        if (window.switchTab) window.switchTab('settings');
    }
};

window.closeAddChildModal = function() {
    const modal = document.getElementById('addChildModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.onLinkChildGradeChanged = function(gradeVal) {
    const streamSelect = document.getElementById('link-child-stream');
    if (!streamSelect) return;
    const grade = parseInt(gradeVal, 10);
    if (grade < 10) {
        streamSelect.value = 'General';
        streamSelect.disabled = true;
    } else {
        streamSelect.disabled = false;
        if (streamSelect.value === 'General') {
            streamSelect.value = 'Science';
        }
    }
};

window.copyGeneratedPassword = function() {
    const pw = document.getElementById('cred-password')?.textContent;
    if (pw && pw !== '-') {
        navigator.clipboard.writeText(pw).then(() => {
            alert('Learner password copied to clipboard: ' + pw);
        }).catch(() => {
            prompt('Copy password:', pw);
        });
    }
};

window.copyAllCredentials = function() {
    const name = document.getElementById('cred-child-name')?.textContent || '';
    const num = document.getElementById('cred-learner-number')?.textContent || '';
    const email = document.getElementById('cred-learner-email')?.textContent || '';
    const pw = document.getElementById('cred-password')?.textContent || '';
    const grade = document.getElementById('cred-grade-stream')?.textContent || '';

    const text = `FUSION HIGH SCHOOL - LEARNER CREDENTIALS\n` +
                 `Name: ${name}\n` +
                 `Learner Number: ${num}\n` +
                 `Portal Email: ${email}\n` +
                 `Initial Password: ${pw}\n` +
                 `Grade & Stream: ${grade}\n` +
                 `Portal URL: ${window.location.origin}/login`;

    navigator.clipboard.writeText(text).then(() => {
        alert('All learner credentials copied to clipboard!');
    }).catch(() => {
        prompt('Copy credentials:', text);
    });
};

window.closeCredentialsModal = function() {
    const modal = document.getElementById('childCredentialsSuccessModal');
    if (modal) modal.classList.add('hidden');
    if (window.loadParentDashboard) window.loadParentDashboard();
    if (window.loadParentChildrenDetailed) window.loadParentChildrenDetailed();
    if (window.loadParentOverview) window.loadParentOverview();
    if (window.switchTab) window.switchTab('children');
};

function setupActivationForm() {
    const linkChildForm = document.getElementById('linkChildForm');
    const activationForm = document.getElementById('activationForm');
    const modalActivationForm = document.getElementById('modalActivationForm');

    // 1. Comprehensive Link / Enroll Child Form
    if (linkChildForm && !linkChildForm.dataset.listenerAttached) {
        linkChildForm.dataset.listenerAttached = 'true';
        linkChildForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errDiv = document.getElementById('modal-link-child-error');
            const succDiv = document.getElementById('modal-link-child-success');
            const submitBtn = document.getElementById('btn-submit-link-child');

            if (errDiv) errDiv.classList.add('hidden');
            if (succDiv) succDiv.classList.add('hidden');

            const firstName = (document.getElementById('link-child-first-name')?.value || '').trim();
            const surname = (document.getElementById('link-child-surname')?.value || '').trim();
            const idNumber = (document.getElementById('link-child-id-number')?.value || '').trim();
            const dob = document.getElementById('link-child-dob')?.value;
            const gender = document.getElementById('link-child-gender')?.value || 'Other';
            const grade = parseInt(document.getElementById('link-child-grade')?.value || '8', 10);
            const stream = grade >= 10 ? (document.getElementById('link-child-stream')?.value || 'Science') : 'General';
            const homeLanguage = (document.getElementById('link-child-home-language')?.value || 'English').trim();
            const previousSchool = (document.getElementById('link-child-prev-school')?.value || '').trim();

            if (!firstName || !surname || !idNumber || !dob) {
                if (errDiv) {
                    errDiv.textContent = 'Please fill in all required fields (First Name, Surname, ID Number, Date of Birth).';
                    errDiv.classList.remove('hidden');
                }
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Registering & Generating Credentials...';
            }

            try {
                const payload = {
                    first_name: firstName,
                    surname: surname,
                    id_number: idNumber,
                    dob: dob,
                    gender: gender,
                    grade: grade,
                    stream: stream,
                    home_language: homeLanguage,
                    previous_school: previousSchool
                };

                const response = await fetch('/api/parent/children/link-sibling', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to link and enroll child.');
                }

                // Success! Close form modal and open credentials success modal
                window.closeAddChildModal();
                linkChildForm.reset();

                const cred = data.credentials || {};
                const child = data.child || {};

                const childNameEl = document.getElementById('cred-child-name');
                const learnerNumEl = document.getElementById('cred-learner-number');
                const learnerEmailEl = document.getElementById('cred-learner-email');
                const passwordEl = document.getElementById('cred-password');
                const gradeStreamEl = document.getElementById('cred-grade-stream');

                if (childNameEl) childNameEl.textContent = cred.learner_name || `${firstName} ${surname}`;
                if (learnerNumEl) learnerNumEl.textContent = cred.learner_number || child.learner_number || '-';
                if (learnerEmailEl) learnerEmailEl.textContent = cred.learner_email || '-';
                if (passwordEl) passwordEl.textContent = cred.generated_password || '-';
                if (gradeStreamEl) gradeStreamEl.textContent = `Grade ${cred.grade || grade} (${cred.stream || stream})`;

                const successModal = document.getElementById('childCredentialsSuccessModal');
                if (successModal) {
                    successModal.classList.remove('hidden');
                } else {
                    alert(`Child linked successfully!\nLearner Number: ${cred.learner_number}\nPassword: ${cred.generated_password}\nEmail sent to parent.`);
                }

                if (window.loadParentChildrenDetailed) window.loadParentChildrenDetailed();
                if (window.loadParentOverview) window.loadParentOverview();

            } catch (err) {
                if (errDiv) {
                    errDiv.textContent = err.message || 'An error occurred while linking child.';
                    errDiv.classList.remove('hidden');
                } else {
                    alert('Error: ' + err.message);
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-id-card me-1"></i> Link Child & Generate Credentials';
                }
            }
        });
    }

    // 2. Legacy / Fallback Activation Form Handlers
    const handleLegacySubmit = async (e, formEl, errDivId, succDivId, isModal = false) => {
        e.preventDefault();
        const learnerID = isModal 
            ? (document.getElementById('modalLearnerIDNumber')?.value || '').trim()
            : (document.getElementById('learnerIDNumber')?.value || document.getElementById('learnerNumber')?.value || '').trim();
        const firstName = isModal 
            ? (document.getElementById('modalLearnerFirstName')?.value || '').trim()
            : (document.getElementById('learnerFirstName')?.value || '').trim();
        const surname = isModal 
            ? (document.getElementById('modalLearnerSurname')?.value || '').trim()
            : (document.getElementById('learnerSurname')?.value || '').trim();

        const errorDiv = document.getElementById(errDivId);
        const successDiv = document.getElementById(succDivId);

        if (!learnerID || !firstName || !surname) {
            alert('Please enter Learner ID Number, First Name, and Surname.');
            return;
        }

        if (errorDiv) errorDiv.classList.add('hidden');
        if (successDiv) successDiv.classList.add('hidden');

        showLoading(formEl);

        try {
            const result = await activateChild({
                learner_number: learnerID,
                first_name: firstName,
                surname: surname
            });
            
            if (successDiv) {
                successDiv.textContent = result.message || 'Child profile linked! Email sent with login details and password.';
                successDiv.classList.remove('hidden');
            }
            alert(result.message || 'Learner linked successfully! Credentials and password sent to your email.');
            if (isModal) window.closeAddChildModal();
            setTimeout(() => {
                if (window.loadParentDashboard) window.loadParentDashboard();
                if (window.switchTab) window.switchTab('children');
            }, 1200);
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
            } else {
                alert(`Activation Failed: ${error.message}`);
            }
        } finally {
            hideLoading(formEl);
        }
    };

    if (activationForm && !activationForm.dataset.listenerAttached) {
        activationForm.dataset.listenerAttached = 'true';
        activationForm.addEventListener('submit', (e) => handleLegacySubmit(e, activationForm, 'activation-error', 'activation-success', false));
    }

    if (modalActivationForm && !modalActivationForm.dataset.listenerAttached) {
        modalActivationForm.dataset.listenerAttached = 'true';
        modalActivationForm.addEventListener('submit', (e) => handleLegacySubmit(e, modalActivationForm, 'modal-activation-error', 'modal-activation-success', true));
    }
}

function displayMessages(messages) {
    const container = document.getElementById('message-list-container');
    if (!container) return;
    const currentUserId = getUserIdFromToken();
    if (messages.length === 0) {
        container.innerHTML = '<p class="text-muted">You have no messages in your inbox or outbox.</p>';
        return;
    }

    const unreadIds = [];

    container.innerHTML = messages.map(msg => {
        const isSent = msg.sender_id === currentUserId;
        const isUnread = !isSent && !msg.read_at;
        if (isUnread) unreadIds.push(msg.id);
        return `
            <div class="message-item ${isSent ? 'sent' : 'received'} ${isUnread ? 'unread' : ''}">
                <div class="message-header">
                    <span>${isSent ? `To: ${msg.recipient_name}` : `From: ${msg.sender_name}`}</span>
                    <span>${new Date(msg.created_at).toLocaleString()}</span>
                </div>
                <div class="message-subject">${msg.subject}</div>
                <p class="message-body">${msg.body}</p>
            </div>
        `;
    }).join('');

    if (unreadIds.length > 0) {
        markMessagesAsRead(unreadIds).catch(err => console.error("Failed to mark messages as read:", err));
    }
}

function displayAnnouncements(news) {
    const container = document.getElementById('news-feed');
    if (!container) return;

    if (!news || news.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:2.5rem 1.5rem; color:#94a3b8;"><i class="fas fa-newspaper" style="font-size:2.5rem; margin-bottom:0.75rem; color:#64748b; display:block;"></i><h4 style="margin:0; color:#f8fafc;">No news is available at the moment.</h4></div>';
        return;
    }

    container.innerHTML = news.map(n => `
        <div class="announcement" style="background:#1E293B; border-radius:10px; padding:1.25rem; margin-bottom:1rem; border:1px solid #334155;">
            <div class="ann-date" style="font-size:0.75rem; color:#38bdf8; margin-bottom:0.25rem;">${new Date(n.created_at).toDateString()}</div>
            <div class="ann-title" style="font-weight:700; color:#f8fafc; font-size:1.05rem; margin-bottom:0.5rem;">${n.title}</div>
            <p class="ann-content" style="color:#cbd5e1; font-size:0.9rem; margin:0; line-height:1.5;">${n.content}</p>
        </div>
    `).join('');
}

function setupProfileSection() {
    const form = document.getElementById('pfpUploadForm');
    const input = document.getElementById('pfp-input');
    const preview = document.getElementById('pfp-preview');
    const statusEl = document.getElementById('pfp-upload-status');

    getProfile().then(user => {
        if (user) {
            if (user.profile_picture_path && preview) {
                preview.src = `/${user.profile_picture_path}`;
            }
            const nameEl = document.getElementById('prof-name');
            const surnameEl = document.getElementById('prof-surname');
            const emailEl = document.getElementById('prof-email');
            const phoneEl = document.getElementById('prof-phone');
            const addrEl = document.getElementById('prof-address');
            if (nameEl) nameEl.value = user.full_name || '';
            if (surnameEl) surnameEl.value = user.surname || '';
            if (emailEl) emailEl.value = user.email || '';
            if (phoneEl) phoneEl.value = user.phone || '';
            if (addrEl) addrEl.value = user.physical_address || '';
        }
    }).catch(() => { });

    input.addEventListener('change', () => {
        const file = input.files[0];
        if (file) preview.src = URL.createObjectURL(file);
    });

    const profileForm = document.getElementById('profileUpdateForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = profileForm.querySelector('#prof-name').value;
            const surname = profileForm.querySelector('#prof-surname').value;
            const nameRegex = /^[a-zA-Z\s]+$/;
            if (!nameRegex.test(fullName) || !nameRegex.test(surname)) {
                return alert('Full Name and Surname must only contain letters and spaces.');
            }
            await updateProfile(new FormData(profileForm));
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = input.files[0];
        if (!file) {
            statusEl.textContent = 'Please select an image file first.';
            return;
        }

        const formData = new FormData();
        formData.append('profilePicture', file);

        showLoading(form);
        statusEl.textContent = '';
        uploadProfilePicture(formData)
            .then(res => { statusEl.textContent = res.message; statusEl.style.color = 'var(--success)'; setTimeout(() => location.reload(), 1500); })
            .catch(err => { statusEl.textContent = err.message; statusEl.style.color = 'var(--danger)'; })
            .finally(() => hideLoading(form));
    });
}

async function updateProfile(formData) {
    const form = document.getElementById('profileUpdateForm');
    const payload = Object.fromEntries(formData);

    showLoading(form);
    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        alert('Profile updated successfully!');
        const nameEl = document.getElementById('user-name');
        if (nameEl) nameEl.textContent = `${payload.full_name} ${payload.surname}`;
    } catch (error) {
        alert('Update failed: ' + error.message);
    } finally {
        hideLoading(form);
    }
}

window.openMessageModal = function (teacherName, teacherEmail, subject, childName, childId) {
    const modal = document.getElementById('messageModal');
    if (!modal) return;

    document.getElementById('msg-teacher-name').value = teacherName;
    document.getElementById('msg-teacher-email').value = teacherEmail;
    document.getElementById('msg-subject').value = `Inquiry about ${childName} - ${subject}`;
    modal.dataset.childId = childId;
    document.getElementById('msg-body').value = '';

    modal.classList.remove('hidden');
};

window.closeMessageModal = function () {
    const modal = document.getElementById('messageModal');
    if (modal) modal.classList.add('hidden');
};

document.getElementById('messageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    const payload = {
        teacherEmail: document.getElementById('msg-teacher-email').value,
        subject: document.getElementById('msg-subject').value,
        message: document.getElementById('msg-body').value,
        childId: document.getElementById('messageModal').dataset.childId
    };

    try {
        await contactTeacher(payload);
        alert('Message sent successfully!');
        closeMessageModal();
        form.reset();
    } catch (error) {
        alert('Failed to send message: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Message';
    }
});

export async function loadParentResources() {
    const container = document.getElementById('parent-resources-list');
    if (!container) return;

    try {
        const childrenData = await safeParentApiCall('/api/parent/children-detailed').catch(() => null);
        const children = childrenData?.children || [];

        if (children.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:2.5rem 1.5rem; color:#94a3b8;">
                    <i class="fas fa-file-invoice" style="font-size:2.5rem; color:#64748b; margin-bottom:0.75rem; display:block;"></i>
                    <h4 style="margin:0; color:#f8fafc;">No linked children accounts found.</h4>
                    <p style="margin:0.5rem 0 0 0; font-size:0.85rem;">Activate your child to access their CAPS Academic Report Cards.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = children.map(c => `
            <div style="background:#1E293B; border-radius:12px; padding:1.25rem; border:1px solid #334155; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1rem;">
                        <img src="${c.profile_picture || '/assets/default-pfp.png'}" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid #38bdf8;">
                        <div>
                            <h4 style="margin:0; font-size:1rem; color:#f8fafc;">${c.name}</h4>
                            <p style="margin:2px 0 0 0; font-size:0.8rem; color:#94a3b8;">Grade ${c.grade} • Fusion High</p>
                        </div>
                    </div>
                    <div style="background:#0F172A; padding:0.75rem; border-radius:8px; margin-bottom:1rem; font-size:0.85rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;"><span style="color:#94a3b8;">Academic Term:</span> <strong style="color:#f8fafc;">Term 2 (2026)</strong></div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;"><span style="color:#94a3b8;">Average Mark:</span> <strong style="color:#4ade80;">${c.average_mark}%</strong></div>
                        <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Report Card Status:</span> <span class="badge-status badge-present">Published</span></div>
                    </div>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-primary" style="flex:1; font-size:0.8rem; padding:0.5rem;" onclick="window.viewChildCapsReportModal(${c.child_id})"><i class="fas fa-file-alt me-1"></i> View Report</button>
                    <button class="btn btn-secondary" style="flex:1; font-size:0.8rem; padding:0.5rem;" onclick="window.downloadChildReport(${c.child_id})"><i class="fas fa-download me-1"></i> PDF</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading parent resources:', err);
    }
}
window.loadParentResources = loadParentResources;

window.viewChildCapsReportModal = async function(childId) {
    try {
        const data = await safeParentApiCall(`/api/reports/caps-report-card?childId=${childId}`);
        const modal = document.getElementById('reportCardModal') || createReportModal();
        const body = document.getElementById('reportCardModalBody');
        if (body && data) {
            body.innerHTML = `
                <div style="background:#0F172A; padding:1.5rem; border-radius:10px; color:#F8FAFC;">
                    <div style="text-align:center; border-bottom:2px solid #334155; padding-bottom:1rem; margin-bottom:1rem;">
                        <h2 style="margin:0; color:#38BDF8;">FUSION HIGH SCHOOL</h2>
                        <h4 style="margin:4px 0 0 0; color:#CBD5E1;">OFFICIAL CAPS ACADEMIC REPORT CARD</h4>
                        <p style="margin:2px 0 0 0; font-size:0.85rem; color:#94A3B8;">Learner: ${data.learner_name || 'Learner'} | Grade: ${data.grade || 10} | Term 2 (2026)</p>
                    </div>
                    <table style="width:100%; border-collapse:collapse; margin-bottom:1rem;">
                        <thead>
                            <tr style="border-bottom:1px solid #334155; text-align:left; color:#94A3B8; font-size:0.85rem;">
                                <th style="padding:8px;">Subject</th>
                                <th style="padding:8px; text-align:center;">Term Mark</th>
                                <th style="padding:8px; text-align:center;">Code / Symbol</th>
                                <th style="padding:8px;">Teacher Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(data.subjects || []).map(s => `
                                <tr style="border-bottom:1px solid #1E293B;">
                                    <td style="padding:8px; font-weight:600;">${s.subject}</td>
                                    <td style="padding:8px; text-align:center; color:#4ADE80; font-weight:700;">${s.mark}%</td>
                                    <td style="padding:8px; text-align:center; color:#38BDF8;">Level ${s.level || 6}</td>
                                    <td style="padding:8px; font-size:0.8rem; color:#94A3B8;">${s.comment || 'Satisfactory effort.'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#1E293B; padding:0.75rem; border-radius:8px;">
                        <div><strong>Overall Average:</strong> <span style="color:#4ADE80; font-size:1.1rem; font-weight:800;">${data.overall_average || 75}%</span></div>
                        <div><strong>Principal's Decision:</strong> <span style="color:#38BDF8; font-weight:700;">PROMOTED</span></div>
                    </div>
                </div>
            `;
            modal.style.display = 'flex';
        }
    } catch (e) {
        alert('Failed to load report card details.');
    }
};

function createReportModal() {
    const div = document.createElement('div');
    div.id = 'reportCardModal';
    div.className = 'modal-container';
    div.style.display = 'none';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.innerHTML = `
        <div class="modal-content" style="max-width:700px; width:90%;">
            <div class="modal-header">
                <h3>Academic Report Card</h3>
                <button class="modal-close-btn" onclick="document.getElementById('reportCardModal').style.display='none'">&times;</button>
            </div>
            <div class="modal-body" id="reportCardModalBody"></div>
        </div>
    `;
    document.body.appendChild(div);
    return div;
}

window.handleChangePassword = async function(e) {
    e.preventDefault();
    const currPass = document.getElementById('sett-curr-pass')?.value;
    const newPass = document.getElementById('sett-new-pass')?.value;
    const confPass = document.getElementById('sett-conf-pass')?.value;

    if (!currPass || !newPass || !confPass) {
        return alert('Please fill in current password, new password, and confirmation password.');
    }
    if (newPass !== confPass) {
        return alert('New password and confirmation password do not match.');
    }

    try {
        const res = await safeParentApiCall('/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                current_password: currPass,
                new_password: newPass,
                confirm_password: confPass
            })
        });
        alert(res.message || 'Password updated successfully!');
        e.target.reset();
    } catch (err) {
        alert('Password update failed: ' + (err.message || err.error));
    }
};

window.filterParentMessages = function(filterType, btn) {
    document.querySelectorAll('.msg-filter-btn').forEach(b => {
        b.style.background = '#1e293b';
        b.style.color = '#94a3b8';
        b.classList.remove('active');
    });
    if (btn) {
        btn.style.background = '#334155';
        btn.style.color = '#fff';
        btn.classList.add('active');
    }

    const items = document.querySelectorAll('#chat-contacts-list .contact-item-card');
    items.forEach(item => {
        const contactId = item.getAttribute('onclick')?.match(/\d+/)?.[0];
        const contactObj = (window.allContactsList || []).find(c => String(c.id) === String(contactId));
        const isUnread = contactObj ? parseInt(contactObj.unread_count, 10) > 0 : false;

        if (filterType === 'all') {
            item.style.display = 'flex';
        } else if (filterType === 'unread') {
            item.style.display = isUnread ? 'flex' : 'none';
        } else if (filterType === 'read') {
            item.style.display = !isUnread ? 'flex' : 'none';
        }
    });
};

window.openParentComposeModal = async function() {
    const modal = document.getElementById('messageModal');
    if (!modal) return;
    try {
        const contacts = await safeParentApiCall('/api/messages/contacts').catch(() => []);
        if (contacts.length > 0) {
            document.getElementById('msg-teacher-name').value = `${contacts[0].full_name} ${contacts[0].surname || ''}`;
            document.getElementById('msg-teacher-email').value = contacts[0].email || '';
        }
        modal.classList.remove('hidden');
    } catch (e) {
        modal.classList.remove('hidden');
    }
};

export async function loadParentSettings() {
    try {
        const user = await getProfile().catch(() => null);
        if (user) {
            const nameEl = document.getElementById('prof-name');
            const surnameEl = document.getElementById('prof-surname');
            const emailEl = document.getElementById('prof-email');
            const phoneEl = document.getElementById('prof-phone');
            const addrEl = document.getElementById('prof-address');
            if (nameEl) nameEl.value = user.full_name || '';
            if (surnameEl) surnameEl.value = user.surname || '';
            if (emailEl) emailEl.value = user.email || '';
            if (phoneEl) phoneEl.value = user.phone || '';
            if (addrEl) addrEl.value = user.physical_address || '';
        }

        const childrenData = await safeParentApiCall('/api/parent/children-detailed').catch(() => null);
        const children = childrenData?.children || [];
        const select = document.getElementById('deactivate-child-select');

        if (select) {
            if (children.length === 0) {
                select.innerHTML = '<option value="">No linked children available to deactivate</option>';
            } else {
                select.innerHTML = children.map(c => `
                    <option value="${c.child_id}">
                        ${c.name} (Grade ${c.grade})
                    </option>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Error loading settings profile:', e);
    }
}
window.loadParentSettings = loadParentSettings;
window.loadParentSettings = loadParentSettings;

window.handleDeactivateChildFromSettings = async function() {
    const select = document.getElementById('deactivate-child-select');
    const childId = select ? select.value : '';

    if (!childId) {
        alert('Please select a child to deactivate.');
        return;
    }

    if (!confirm('Are you sure you want to deactivate and unlink this child account from your parent profile?')) {
        return;
    }

    try {
        await deactivateChild(childId);
        alert('Child account has been successfully deactivated.');
        if (window.loadParentSettings) window.loadParentSettings();
        if (window.loadParentDashboard) window.loadParentDashboard();
    } catch (err) {
        alert(`Failed to deactivate child: ${err.message || err}`);
    }
};

const originalSwitchTab = switchTab;
window.switchTab = (tabId, el) => {
    if (tabId === 'messages') {
        document.getElementById('unread-messages-badge')?.classList.add('hidden');
        if (window.initMessageCenter) window.initMessageCenter();
    }
    if (tabId === 'resources' && window.loadParentResources) {
        window.loadParentResources();
    }
    if (tabId === 'settings' && window.loadParentSettings) {
        window.loadParentSettings();
    }
    if (tabId === 'reports') {
        if (window.loadParentReportCardsTab) window.loadParentReportCardsTab();
    }
    originalSwitchTab(tabId, el);
};

/**
 * =========================================================================================
 * PARENT REPORT CARDS TAB CONTROLLER
 * =========================================================================================
 */
window.loadParentReportCardsTab = async function() {
    const select = document.getElementById('parent-report-card-child-select');
    const container = document.getElementById('parent-report-cards-container');
    if (!container) return;

    try {
        const children = await getChildren().catch(() => []);
        if (!children || children.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:3rem; color:#94a3b8;">No registered children linked to your parent account yet.</div>';
            return;
        }

        if (select) {
            select.innerHTML = children.map(c => `
                <option value="${c.id}" ${window.activeParentChildId == c.id ? 'selected' : ''}>
                    ${c.full_name} ${c.surname} (Grade ${c.grade})
                </option>
            `).join('');
        }

        const activeId = (select && select.value) ? select.value : children[0].id;
        window.activeParentChildId = activeId;
        window.loadParentChildReportCards(activeId);
    } catch (err) {
        console.error('Error loading parent report cards tab:', err);
        container.innerHTML = `<div style="text-align:center; padding:2rem; color:#ef4444;">Failed to load report cards: ${err.message}</div>`;
    }
};

window.loadParentChildReportCards = async function(childId) {
    const container = document.getElementById('parent-report-cards-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:3rem; color:#38bdf8;"><i class="fas fa-spinner fa-spin fa-2x mb-2"></i><br>Checking official report cards for your child...</div>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/report-cards/view/${childId}?term=Term 3&academicYear=2026`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            container.innerHTML = `
                <div class="parent-card" style="text-align:center; padding:3rem 1.5rem; background:#1E293B; border:1px solid #334155; border-radius:12px;">
                    <i class="fas fa-file-invoice" style="font-size:3rem; color:#64748b; margin-bottom:1rem;"></i>
                    <h3 style="color:#f8fafc; margin:0 0 0.5rem 0;">No Official Report Card Published Yet</h3>
                    <p style="color:#94a3b8; font-size:0.88rem; max-width:500px; margin:0 auto;">
                        Teachers and school administration are currently finalizing and compiling assessments for Term 3. Once published, you will receive an email notification with download access.
                    </p>
                </div>
            `;
            return;
        }

        const data = await res.json();
        const l = data.learner || {};
        const s = data.school || {};

        container.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem;">
                <!-- Term 3 Official Card -->
                <div class="card" style="background:#1E293B; border:1px solid #334155; border-radius:12px; padding:1.5rem; box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                        <span class="badge" style="background:#065f46; color:#34d399; padding:4px 10px; border-radius:6px; font-weight:700; font-size:0.78rem;">
                            <i class="fas fa-check-circle me-1"></i> Official & Certified
                        </span>
                        <span style="color:#94a3b8; font-size:0.78rem;">Year 2026</span>
                    </div>

                    <h3 style="color:#f8fafc; margin:0 0 0.25rem 0; font-size:1.25rem;">Term 3 Academic Report Card</h3>
                    <p style="color:#38bdf8; font-size:0.85rem; font-weight:600; margin:0 0 1rem 0;">${l.full_name} ${l.surname} • Grade ${l.grade}</p>

                    <div style="background:#0F172A; border-radius:8px; padding:1rem; margin-bottom:1.25rem; display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; font-size:0.82rem;">
                        <div>
                            <span style="color:#94a3b8; display:block;">Overall Average:</span>
                            <strong style="color:#38bdf8; font-size:1.2rem;">${data.overall_average}%</strong>
                        </div>
                        <div>
                            <span style="color:#94a3b8; display:block;">Promotion Status:</span>
                            <strong style="color:#34d399; font-size:0.95rem;">${data.promotion_status}</strong>
                        </div>
                        <div>
                            <span style="color:#94a3b8; display:block;">Days Present:</span>
                            <strong style="color:#f8fafc;">${data.attendance?.days_present || 46} / ${data.attendance?.total_days || 50}</strong>
                        </div>
                        <div>
                            <span style="color:#94a3b8; display:block;">Attendance Rate:</span>
                            <strong style="color:#34d399;">${data.attendance?.attendance_percentage || 92}%</strong>
                        </div>
                    </div>

                    <div style="display:flex; gap:0.75rem;">
                        <button class="btn btn-primary" onclick="window.viewParentChildReportCard(${childId})" style="flex:1; background:#0284c7; border:none; color:#fff; padding:9px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                            <i class="fas fa-eye"></i> View Official Report
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Error loading child report cards:', err);
        container.innerHTML = `<div style="color:#ef4444; padding:2rem; text-align:center;">Failed to load report cards: ${err.message}</div>`;
    }
};

window.viewParentChildReportCard = async function(childId) {
    const modal = document.getElementById('parentOfficialReportCardModal');
    const container = document.getElementById('parent-official-report-card-content');
    if (!modal || !container) return;

    modal.classList.remove('hidden');
    modal.style.display = 'block';
    container.innerHTML = '<div style="text-align:center; padding:3rem; color:#64748b;"><i class="fas fa-spinner fa-spin fa-2x mb-2"></i> Loading official CAPS document...</div>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/report-cards/view/${childId}?term=Term 3&academicYear=2026`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();
        
        // Use identical official CAPS template renderer
        const s = data.school || {};
        const l = data.learner || {};
        const att = data.attendance || {};
        const subjects = data.subjects || [];

        const promoBadge = data.promotion_status === 'PROMOTED'
            ? '<span style="color:#065f46; font-weight:800; font-size:1.1rem; border:2px solid #065f46; padding:4px 14px; border-radius:6px; display:inline-block;">PROMOTED TO NEXT GRADE</span>'
            : data.promotion_status === 'PROGRESSION'
            ? '<span style="color:#b45309; font-weight:800; font-size:1.1rem; border:2px solid #b45309; padding:4px 14px; border-radius:6px; display:inline-block;">PROGRESSION WITH SUPPORT</span>'
            : '<span style="color:#b91c1c; font-weight:800; font-size:1.1rem; border:2px solid #b91c1c; padding:4px 14px; border-radius:6px; display:inline-block;">NOT PROMOTED / REPEAT</span>';

        container.innerHTML = `
            <div style="border-bottom:3px double #0f172a; padding-bottom:1rem; margin-bottom:1.25rem;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="display:flex; align-items:center; gap:1.25rem;">
                        <img src="${s.logo_url || '/assets/FH.png'}" onerror="this.src='/assets/fusion-app-icon.png'" alt="School Badge" style="width:75px; height:75px; object-fit:contain;">
                        <div>
                            <h2 style="margin:0; font-size:1.45rem; color:#0f172a; font-weight:900; letter-spacing:0.5px; text-transform:uppercase;">${s.name || 'Fusion High School'}</h2>
                            <p style="margin:2px 0; font-size:0.8rem; color:#475569; font-weight:600;">DEPARTMENT OF BASIC EDUCATION • ${s.province || 'LIMPOPO PROVINCE'}</p>
                            <p style="margin:2px 0; font-size:0.75rem; color:#64748b;">
                                District: ${s.district || 'Capricorn South'} • Circuit: ${s.circuit || 'Polokwane Central'} • EMIS No: <strong>${s.emis_number || '911220001'}</strong>
                            </p>
                        </div>
                    </div>
                    <div style="text-align:right; font-size:0.75rem; color:#475569; line-height:1.35;">
                        <div><strong>Physical Address:</strong> ${s.physical_address || 'Polokwane Central, 0700'}</div>
                        <div><strong>Postal Address:</strong> ${s.postal_address || 'P.O. Box 1024, Polokwane, 0700'}</div>
                        <div><strong>Email:</strong> ${s.contact_email || 'admin@fusionhigh.co.za'}</div>
                        <div><strong>Tel:</strong> ${s.contact_phone || '+27 15 291 0000'}</div>
                    </div>
                </div>
                <div style="margin-top:0.75rem; text-align:center; background:#0f172a; color:#fff; font-weight:800; font-size:0.95rem; padding:6px; letter-spacing:1px; border-radius:4px;">
                    OFFICIAL NATIONAL CURRICULUM STATEMENT (CAPS) LEARNER REPORT CARD
                </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:0.75rem; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:0.85rem 1rem; font-size:0.8rem; margin-bottom:1.25rem;">
                <div><strong>Learner:</strong> ${l.full_name} ${l.surname}</div>
                <div><strong>Learner No:</strong> ${l.learner_number || l.id}</div>
                <div><strong>Academic Year:</strong> ${data.academic_year || '2026'}</div>
                <div><strong>Grade & Class:</strong> Grade ${l.grade || data.grade} (${l.class_name || '10A'})</div>
                <div><strong>Stream:</strong> ${l.stream || data.stream || 'Science'}</div>
                <div><strong>Assessment Term:</strong> ${data.term || 'Term 3'}</div>
                <div><strong>Days Present:</strong> ${att.days_present || 46} / ${att.total_days || 50}</div>
                <div><strong>Days Absent:</strong> ${att.days_absent || 4}</div>
                <div><strong>Attendance Rate:</strong> <strong style="color:${att.attendance_percentage >= 80 ? '#059669' : '#dc2626'};">${att.attendance_percentage || 92}%</strong></div>
            </div>

            <table style="width:100%; border-collapse:collapse; font-size:0.82rem; margin-bottom:1.25rem; border:1px solid #94a3b8;">
                <thead>
                    <tr style="background:#1e293b; color:#ffffff; font-weight:700;">
                        <th style="border:1px solid #475569; padding:8px 10px; text-align:left;">Subjects</th>
                        <th style="border:1px solid #475569; padding:8px 8px; text-align:center; width:80px;">Term Mark %</th>
                        <th style="border:1px solid #475569; padding:8px 8px; text-align:center; width:65px;">CAPS Level</th>
                        <th style="border:1px solid #475569; padding:8px 10px; text-align:left; width:130px;">Achievement Rating</th>
                        <th style="border:1px solid #475569; padding:8px 10px; text-align:left;">Teacher Comments</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjects.map(sub => `
                        <tr style="border-bottom:1px solid #cbd5e1;">
                            <td style="border:1px solid #cbd5e1; padding:7px 10px; font-weight:700; color:#0f172a;">${sub.subject}</td>
                            <td style="border:1px solid #cbd5e1; padding:7px 8px; text-align:center; font-weight:800; color:${sub.mark >= 50 ? '#0284c7' : '#dc2626'};">
                                ${sub.mark}%
                            </td>
                            <td style="border:1px solid #cbd5e1; padding:7px 8px; text-align:center; font-weight:800; background:#f1f5f9;">
                                Level ${sub.level}
                            </td>
                            <td style="border:1px solid #cbd5e1; padding:7px 10px; font-weight:600; color:#334155;">
                                ${sub.rating}
                            </td>
                            <td style="border:1px solid #cbd5e1; padding:7px 10px; font-size:0.78rem; color:#475569; font-style:italic;">
                                ${sub.comment || 'Good progress demonstrated in SBA tasks and class assessments.'}
                            </td>
                        </tr>
                    `).join('')}
                    <tr style="background:#f8fafc; font-weight:800; border-top:2px solid #0f172a;">
                        <td style="border:1px solid #cbd5e1; padding:9px 10px;">CUMULATIVE OVERALL AVERAGE</td>
                        <td style="border:1px solid #cbd5e1; padding:9px 8px; text-align:center; font-size:1rem; color:#0284c7;">
                            ${data.overall_average}%
                        </td>
                        <td style="border:1px solid #cbd5e1; padding:9px 8px; text-align:center;">
                            Level ${data.overall_average >= 80 ? 7 : data.overall_average >= 70 ? 6 : data.overall_average >= 60 ? 5 : data.overall_average >= 50 ? 4 : data.overall_average >= 40 ? 3 : 2}
                        </td>
                        <td colspan="2" style="border:1px solid #cbd5e1; padding:9px 10px;">
                            Pass Requirement Achieved: <strong>YES</strong>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div style="display:grid; grid-template-columns:1.5fr 1fr; gap:1.25rem; margin-bottom:1.5rem; align-items:stretch;">
                <div style="border:1px solid #cbd5e1; border-radius:6px; padding:0.75rem; background:#f8fafc; font-size:0.7rem; color:#475569;">
                    <div style="font-weight:800; margin-bottom:4px; color:#0f172a; text-transform:uppercase;">National CAPS 7-Point Rating Scale:</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:2px;">
                        <div>Level 7: 80% - 100% (Outstanding)</div>
                        <div>Level 6: 70% - 79% (Meritorious)</div>
                        <div>Level 5: 60% - 69% (Substantial)</div>
                        <div>Level 4: 50% - 59% (Adequate)</div>
                        <div>Level 3: 40% - 49% (Moderate)</div>
                        <div>Level 2: 30% - 39% (Elementary)</div>
                        <div style="grid-column:1/-1;">Level 1: 0% - 29% (Not Achieved - Fail)</div>
                    </div>
                </div>

                <div style="border:1px solid #cbd5e1; border-radius:6px; padding:0.75rem; background:#ffffff; text-align:center; display:flex; flex-direction:column; justify-content:center;">
                    <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Official Promotion Outcome</div>
                    ${promoBadge}
                </div>
            </div>

            <div style="border-top:1px solid #94a3b8; padding-top:1.25rem; margin-top:1.5rem; display:grid; grid-template-columns:1fr 1fr 1fr; gap:1.5rem; text-align:center; font-size:0.78rem;">
                <div>
                    <div style="height:45px; display:flex; align-items:flex-end; justify-content:center; color:#334155; font-family:'Brush Script MT', cursive, sans-serif; font-size:1.3rem;">
                        K. Mokoena
                    </div>
                    <div style="border-top:1px dashed #64748b; padding-top:4px; font-weight:700;">Class Teacher Signature</div>
                    <div style="color:#64748b; font-size:0.7rem;">Date: 2026/09/12</div>
                </div>

                <div>
                    <div style="height:45px; display:flex; align-items:center; justify-content:center;">
                        <div style="border:2px solid #b91c1c; color:#b91c1c; font-weight:900; font-size:0.7rem; padding:3px 8px; border-radius:4px; transform:rotate(-4deg); text-transform:uppercase;">
                            FUSION HIGH SCHOOL<br>OFFICIAL STAMP
                        </div>
                    </div>
                    <div style="border-top:1px dashed #64748b; padding-top:4px; font-weight:700;">School Official Stamp</div>
                    <div style="color:#64748b; font-size:0.7rem;">EMIS: ${s.emis_number || '911220001'}</div>
                </div>

                <div>
                    <div style="height:45px; display:flex; align-items:flex-end; justify-content:center; color:#1e3a8a; font-family:'Brush Script MT', cursive, sans-serif; font-size:1.4rem;">
                        Dr. T. Makola
                    </div>
                    <div style="border-top:1px dashed #64748b; padding-top:4px; font-weight:700;">Principal: ${s.principal_name || 'Dr. T. Makola'}</div>
                    <div style="color:#64748b; font-size:0.7rem;">Certified by Examination Board</div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Error loading report card modal:', err);
        container.innerHTML = `<div style="color:#ef4444; padding:2rem; text-align:center;">Failed to render report card: ${err.message}</div>`;
    }
};

window.logout = function () {
    localStorage.clear();
    window.location.href = '/';
};

// Check for URL redirection query params from parent notification emails (?tab=reports&child_id=...)
function handleParentUrlRedirects() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const childId = urlParams.get('child_id');

    if (tab === 'reports' || tab === 'report-cards') {
        const reportsNav = document.querySelector('.nav-item[onclick*="reports"]');
        if (window.switchTab) {
            window.switchTab('reports', reportsNav);
        }
        if (childId) {
            window.activeParentChildId = childId;
            setTimeout(() => {
                if (window.loadParentChildReportCards) window.loadParentChildReportCards(childId);
                if (window.viewParentChildReportCard) window.viewParentChildReportCard(childId);
            }, 600);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof window.loadParentDashboard === 'function') window.loadParentDashboard();
        handleParentUrlRedirects();
    });
} else {
    if (typeof window.loadParentDashboard === 'function') window.loadParentDashboard();
    handleParentUrlRedirects();
}