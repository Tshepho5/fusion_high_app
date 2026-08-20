/**
 * Parent Dashboard Orchestrator - FUSION_HIGH_APP
 */
import {
    getChildren,
    activateChild,
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

function setupActivationForm() {
    const activationForm = document.getElementById('activationForm');
    const modalActivationForm = document.getElementById('modalActivationForm');

    const handleFormSubmit = async (e, formEl, errDivId, succDivId, isModal = false) => {
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
        activationForm.addEventListener('submit', (e) => handleFormSubmit(e, activationForm, 'activation-error', 'activation-success', false));
    }

    if (modalActivationForm && !modalActivationForm.dataset.listenerAttached) {
        modalActivationForm.dataset.listenerAttached = 'true';
        modalActivationForm.addEventListener('submit', (e) => handleFormSubmit(e, modalActivationForm, 'modal-activation-error', 'modal-activation-success', true));
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
    originalSwitchTab(tabId, el);
};

window.logout = function () {
    localStorage.clear();
    window.location.href = '/';
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof window.loadParentDashboard === 'function') window.loadParentDashboard();
    });
} else {
    if (typeof window.loadParentDashboard === 'function') window.loadParentDashboard();
}