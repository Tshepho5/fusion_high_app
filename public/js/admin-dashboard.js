import { initMessageCenter, selectContact, sendChatMessage, filterChatContacts } from './chat-center.js';

window.initMessageCenter = initMessageCenter;
window.selectContact = selectContact;
window.sendChatMessage = sendChatMessage;
window.filterChatContacts = filterChatContacts;

async function apiRequest(endpoint, options = {}) {

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        ...options
    };

    const response = await fetch(endpoint, config);
    if (!response.ok) {
        const errorText = await response.text();
        let errMsg = 'API request failed';
        try {
            const error = JSON.parse(errorText);
            errMsg = error.error || errMsg;
        } catch (e) {
            errMsg = errorText || errMsg;
        }

        if (response.status === 401 || response.status === 403 || errMsg.includes('expired token') || errMsg.includes('Invalid or expired')) {
            alert('Your session has expired. Please log in again.');
            localStorage.clear();
            window.location.href = '/';
            return;
        }

        throw new Error(errMsg);
    }

    // If the response is OK, try to parse it as JSON.
    // If it fails, it's likely an empty or non-JSON response, which can be handled by the caller.
    const text = await response.text();
    // If the response text is empty, return a sensible default based on what's expected.
    if (!text) {
        // Endpoints that expect a list should get an empty array.
        if (endpoint.includes('/timetables') || endpoint.includes('/users') || endpoint.includes('/teachers') || endpoint.includes('/reports')) {
            return [];
        }
        return {}; // Other endpoints can get an empty object.
    }
    return JSON.parse(text); // If there's text, parse it as JSON.
}

// Example of a shared config
const scheduleConfig = {
    periods: [
        "07:45-08:15", "08:15-08:45", "08:45-09:15", "09:15-09:45", "09:45-10:15", "10:15-10:45",
        "11:45-12:15", "12:15-12:45", "12:45-13:15", "13:15-13:45"
    ],
    breakPeriod: "11:00-11:45"
};


/**
 * Custom tab switcher for the admin dashboard.
 * Handles special logic for user sub-categories.
 */
window.switchTab = function (tabId, el, subCategory = null) {
    // Update active state for nav items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (el) {
        el.classList.add('active');
        document.getElementById('tab-title').innerText = el.innerText.trim();
    }

    // Hide all main sections
    document.querySelectorAll('.dashboard-body > .section').forEach(section => {
        section.classList.remove('active');
    });

    // Show the target section
    const targetSection = document.getElementById(tabId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Special handling for the 'users' tab to show specific user roles
    if (tabId === 'users' && subCategory) {
        document.querySelectorAll('#users .dashboard-section').forEach(userCard => userCard.style.display = 'none');
        const userRoleCard = document.querySelector(`#users .dashboard-section[data-role="${subCategory}"]`);
        if (userRoleCard) userRoleCard.style.display = 'block';
    }

    if (tabId === 'messages') {
        initMessageCenter();
    }

    if (tabId === 'reports') {
        loadRecentReportsTable();
    }
    if (tabId === 'academics') {
        loadAcademicsSection();
    }
    if (tabId === 'announcements') {
        if (window.loadAdminAnnouncements) window.loadAdminAnnouncements();
    }
    if (tabId === 'timetables') {
        if (window.generateFullTimetableUI) window.generateFullTimetableUI();
    }
};



function getUserIdFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        return JSON.parse(atob(token.split('.')[1])).id;
    } catch (e) {
        return null;
    }
}

async function loadAdminMessages() {
    const container = document.getElementById('message-list-container');
    if (!container) return;

    try {
        const messages = await apiRequest('/api/messages');
        const currentUserId = getUserIdFromToken();
        const unreadIds = [];

        if (messages.length === 0) {
            container.innerHTML = '<p class="text-muted">You have no messages in your inbox or outbox.</p>';
            return;
        }

        container.innerHTML = messages.map(msg => {
            const isSent = msg.sender_id === currentUserId;
            const isUnread = !isSent && !msg.read_at;
            if (isUnread) {
                unreadIds.push(msg.id);
            }
            return `
                <div class="message-item ${isSent ? 'sent' : 'received'} ${isUnread ? 'unread' : ''}">
                    <div class="message-header">
                        <span>${isSent 
                            ? `To: ${msg.recipient_name} ${msg.recipient_surname || ''}` 
                            : `From: ${msg.sender_name} ${msg.sender_surname || ''}`}</span>
                        <span>${new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <div class="message-subject">${msg.subject}</div>
                    <p class="message-body">${msg.body}</p>
                    ${!isSent ? `
                        <div class="message-reply-area">
                            <button class="btn btn-sm btn-outline" style="padding: 4px 10px; font-size: 0.75rem;" onclick="toggleReplyForm('reply-form-${msg.id}')">Reply</button>
                            <form id="reply-form-${msg.id}" class="reply-form hidden" onsubmit="sendAdminReply(event, ${msg.sender_id}, '${msg.subject}')">
                                <textarea class="form-control" rows="3" placeholder="Type your reply..." required style="background: #0f172a; color: white; border: 1px solid #334155; margin-bottom: 0.5rem;"></textarea>
                                <button type="submit" class="btn btn-primary btn-sm" style="align-self: flex-start; padding: 6px 16px;">Send Reply</button>
                            </form>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Mark read
        if (unreadIds.length > 0) {
            await apiRequest('/api/messages/read', {
                method: 'POST',
                body: JSON.stringify({ messageIds: unreadIds })
            }).catch(err => console.error("Failed to mark messages as read:", err));
        }
    } catch (error) {
        container.innerHTML = `<p class="text-danger">Error loading messages: ${error.message}</p>`;
    }
}

window.toggleReplyForm = function (formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.classList.toggle('hidden');
    }
};

window.sendAdminReply = async function (event, recipientId, originalSubject) {
    event.preventDefault();
    const form = event.target;
    const textarea = form.querySelector('textarea');
    const btn = form.querySelector('button');

    const payload = {
        recipientId,
        subject: originalSubject.startsWith('RE:') ? originalSubject : `RE: ${originalSubject}`,
        body: textarea.value
    };

    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        await apiRequest('/api/messages', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        alert('Reply sent successfully!');
        textarea.value = '';
        form.classList.add('hidden');
        loadAdminMessages();
    } catch (error) {
        alert('Failed to send reply: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Reply';
    }
};

window.loadRecipientsByRole = async function () {
    const roleSelect = document.getElementById('msg-recipient-role');
    const recipientSelect = document.getElementById('msg-recipient-id');
    if (!roleSelect || !recipientSelect) return;

    const role = roleSelect.value;
    if (!role) {
        recipientSelect.disabled = true;
        recipientSelect.innerHTML = '<option value="">Select Recipient...</option>';
        return;
    }

    recipientSelect.disabled = false;
    recipientSelect.innerHTML = '<option value="">Loading recipients...</option>';

    try {
        const users = await apiRequest(`/api/admin/users/${role}`);
        recipientSelect.innerHTML = `
            <option value="">Select Recipient...</option>
            ${users.map(u => `<option value="${u.id}">${u.full_name} ${u.surname} (${u.email})</option>`).join('')}
        `;
    } catch (error) {
        recipientSelect.innerHTML = '<option value="">Error loading recipients</option>';
        console.error(error);
    }
};

window.sendAdminMessage = async function (event) {
    event.preventDefault();
    const form = event.target;
    const recipientId = document.getElementById('msg-recipient-id').value;
    const subject = document.getElementById('msg-subject').value;
    const body = document.getElementById('msg-body').value;
    const btn = form.querySelector('button[type="submit"]');

    if (!recipientId || !subject || !body) return;

    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        await apiRequest('/api/messages', {
            method: 'POST',
            body: JSON.stringify({ recipientId: parseInt(recipientId, 10), subject, body })
        });
        alert('Message sent successfully!');
        form.reset();
        document.getElementById('msg-recipient-id').disabled = true;
        loadAdminMessages();
    } catch (error) {
        alert('Error sending message: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Message';
    }
};

async function loadTeacherData() {
    try {
        const teachers = await apiRequest('/api/admin/teachers');
        const tbody = document.getElementById('teacher-users-table-body');
        if (!tbody) return;

        tbody.innerHTML = teachers.length ? teachers.map(teacher => `
            <tr>
                <td>${teacher.full_name} ${teacher.surname}</td>
                <td><a href="mailto:${teacher.email}">${teacher.email}</a></td>
                <td>${(teacher.subjects || []).join(', ') || 'N/A'}</td>
                <td>${(teacher.grades_taught || []).join(', ') || 'N/A'}</td>
                <td>${(teacher.classes_taught || []).join(', ') || 'N/A'}</td>
                <td><button class="btn btn-info btn-small">Edit</button></td>
            </tr>`).join('') :
            '<tr><td colspan="6" class="table-message">No teachers found.</td></tr>';
    } catch (error) {
        console.error('Error loading teacher data:', error);
        document.getElementById('teacher-users-table-body').innerHTML = '<tr><td colspan="6" class="table-message table-error-message">Error loading data.</td></tr>';
    }
}

window.loadAdminDashboard = async function () {
    // Load all data in parallel for a faster dashboard experience
    await Promise.all([
        loadDashboardStats(),
        loadTeacherData(),
        loadUserData('admin'),
        loadUserData('parent'),
        loadUserData('learner')
    ]);

    // Populate timetable filters
    populateTimetableFilters();

    // Add listener for the new timetable button
    const timetableBtn = document.getElementById('generateTimetableBtn');
    if (timetableBtn) {
        timetableBtn.addEventListener('click', generateTimetable);
    }

    // Load the list of existing timetables
    loadTimetablesList();
};

async function generateTimetable() {
    const btn = document.getElementById('generateTimetableBtn');
    const statusDiv = document.getElementById('timetable-status');

    if (!btn || !statusDiv) return;

    const confirmation = confirm("Are you sure you want to generate a new timetable? This is a resource-intensive process and may take a few minutes.");
    if (!confirmation) return;

    const payload = {
        stream: document.getElementById('timetable-stream').value,
        grade: document.getElementById('timetable-grade').value,
        subject: document.getElementById('timetable-subject').value // Pass the selected subject for auto-filling
    };

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating... Please wait.';
    statusDiv.textContent = 'Processing constraints and building the schedule locally. Please do not navigate away from this page.';
    statusDiv.style.color = 'var(--accent)';

    try {
        const result = await apiRequest('/api/admin/generate-timetable', { method: 'POST', body: JSON.stringify(payload) });
        statusDiv.textContent = 'Preview generated. Opening editor...';
        // Instead of just showing a message, open the editor with the result
        openAdminTimetableEditor(result);

    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.style.color = 'var(--secondary)';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic"></i> Generate New Timetable';
    }
};

const subjectColorMap = {
    'Mathematics': '#be123c', 'Physical Sciences': '#0e7490', 'Life Sciences': '#15803d',
    'Accounting': '#581c87', 'Business Studies': '#86198f', 'Economics': '#701a75',
    'Tourism': '#065f46', 'Mathematical Literacy': '#9f1239', 'English FAL': '#1d4ed8',
    'Home Language': '#1e3a8a', 'Life Orientation': '#7c2d12', 'Natural Sciences': '#166534',
    'Social Sciences': '#b45309', 'Technology': '#4a5568', 'EMS': '#7f1d1d', 'Creative Arts': '#5b21b6'
};

function getColorForSubject(subject) {
    if (subjectColorMap[subject]) return subjectColorMap[subject];
    let hash = 0;
    for (let i = 0; i < (subject || '').length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 50%, 25%)`;
}

async function openExistingTimetableForEdit(timetableId) {
    const statusDiv = document.getElementById('timetable-status');
    statusDiv.textContent = 'Loading timetable for editing...';
    statusDiv.style.color = 'var(--accent)';

    try {
        // Fetch the specific timetable and the list of all teachers in parallel
        const [timetable, teachers] = await Promise.all([
            apiRequest(`/api/admin/timetables/${timetableId}`),
            apiRequest('/api/admin/teachers')
        ]);

        // The editor function expects a specific data structure.
        const editorData = {
            timetable_data: timetable.timetable_data,
            teachers: teachers,
            generation_details: { grade: timetable.grade, stream: timetable.stream, id: timetableId } // Pass ID for updates
        };
        openAdminTimetableEditor(editorData);
    } catch (error) {
        statusDiv.textContent = `Error loading editor: ${error.message}`;
        statusDiv.style.color = 'var(--secondary)';
    }
}

let allAvailableTeachers = []; // Store teachers for dynamic filtering

function openAdminTimetableEditor(data) {
    const modal = document.getElementById('adminEditTimetableModal');
    const body = document.getElementById('admin-edit-timetable-body');
    if (!modal || !body) return alert('Editor modal not found in HTML.');

    const { timetable_data, teachers, generation_details } = data;
    const allSubjects = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Accounting', 'Business Studies', 'Economics', 'Tourism', 'Mathematical Literacy', 'English FAL', 'Home Language', 'Life Orientation', 'Natural Sciences', 'Social Sciences', 'Technology', 'EMS', 'Creative Arts'];
    allAvailableTeachers = teachers; // Store for filtering
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Determine which subjects have at least one qualified teacher
    const schedulableSubjects = allSubjects.filter(subject =>
        teachers.some(teacher => teacher.subjects.includes(subject))
    );

    let editorHtml = `
        <div class="editor-toolbar">
            <p class="text-muted">Visually edit the schedule below. Click "Save & Publish" to finalize and notify teachers.</p>
            <div class="autofill-section">
                <select id="autofill-subject-select" class="form-control">
                    <option value="">-- Select Subject to Auto-fill --</option>
                    ${schedulableSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
                <button id="autofill-btn" class="btn btn-info btn-small" onclick="autoFillSubject()">
                    <i class="fas fa-magic"></i> Auto-fill Subject
                </button>
                <button id="swap-mode-btn" class="btn btn-outline btn-small" onclick="toggleSwapMode()">
                    <i class="fas fa-exchange-alt"></i> Start Swap
                </button>
                <button id="clear-timetable-btn" class="btn btn-danger btn-small" onclick="clearTimetable()">
                    <i class="fas fa-trash"></i> Clear Timetable
                </button>
                <span id="autofill-status" class="status-message"></span>
            </div>
        </div>
        <div id="teacher-load-summary" class="teacher-load-summary">
            <!-- Teacher load will be injected here -->
        </div>
    `;

    // Use the shared config for periods, inserting the break
    const periodsWithBreak = [...scheduleConfig.periods];
    periodsWithBreak.splice(6, 0, scheduleConfig.breakPeriod);
    
    for (const className in timetable_data) {
        editorHtml += `<h4 class="class-header-cell">${className}</h4>`;
        editorHtml += `<div class="table-responsive mb-4"><table class="table timetable-grid editable" data-class-name="${className}">`;
        editorHtml += `<thead><tr><th>Time</th>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>`;
        for (const period of periodsWithBreak) {
            editorHtml += `<tr data-period="${period}">`;
            editorHtml += `<td class="period-cell">${period === scheduleConfig.breakPeriod ? '<strong>BREAK</strong>' : period}</td>`;

            if (period === scheduleConfig.breakPeriod) {
                editorHtml += `<td colspan="${days.length}" class="break-cell"></td>`;
            } else {
                for (const day of days) {
                    const entry = timetable_data[className]?.[day]?.[period] || {};
                    const bgColor = entry.subject ? getColorForSubject(entry.subject) : 'transparent';
                    editorHtml += `<td data-day="${day}" data-period="${period}" class="editable-slot" style="background-color: ${bgColor};">
                        <select class="form-control form-control-sm subject-select">
                            <option value="">-- Subject --</option>
                            ${allSubjects.map(s => `<option value="${s}" ${s === entry.subject ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                        <select class="form-control form-control-sm teacher-select" data-original-teacher="${entry.teacher || ''}">
                            <option value="">-- Teacher --</option>
                            ${teachers.map(t => `<option value="${t.full_name}" ${t.full_name === entry.teacher ? 'selected' : ''}>${t.full_name}</option>`).join('')}
                        </select>
                    </td>`;
                }
            }
            editorHtml += `</tr>`;
        }
        editorHtml += `</tbody></table></div>`;
    }
    body.innerHTML = editorHtml;

    // Store details needed for publishing
    modal.dataset.generationDetails = JSON.stringify(generation_details);
    modal.style.display = 'flex';

    // Add event listeners for swap mode
    document.querySelectorAll('.editable-slot').forEach(slot => slot.addEventListener('click', handleSlotClick));

    // Add change listeners to all dropdowns for live validation and color updates
    document.querySelectorAll('.editable-slot .subject-select, .editable-slot .teacher-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const slot = e.target.closest('.editable-slot');
            const subjectSelect = slot.querySelector('.subject-select');
            const teacherSelect = slot.querySelector('.teacher-select');
            const selectedSubject = subjectSelect.value;

            // Update background color based on subject
            slot.style.backgroundColor = getColorForSubject(selectedSubject);

            // If a subject dropdown was changed, filter the teacher list
            if (e.target.classList.contains('subject-select')) {
                const currentTeacher = teacherSelect.value;
                let newTeacherOptions = '<option value="">-- Teacher --</option>';

                if (selectedSubject) {
                    const qualifiedTeachers = allAvailableTeachers.filter(t => t.subjects.includes(selectedSubject));
                    newTeacherOptions += qualifiedTeachers.map(t =>
                        `<option value="${t.full_name}" ${t.full_name === currentTeacher ? 'selected' : ''}>${t.full_name}</option>`
                    ).join('');
                } else {
                    // If no subject, show all teachers
                    newTeacherOptions += allAvailableTeachers.map(t =>
                        `<option value="${t.full_name}" ${t.full_name === currentTeacher ? 'selected' : ''}>${t.full_name}</option>`
                    ).join('');
                }
                teacherSelect.innerHTML = newTeacherOptions;
            }

            validateTimetableConflicts();
            updateTeacherLoadSummary();
        });
    });

    // Run initial validation
    validateTimetableConflicts();
    updateTeacherLoadSummary();
}

function updateTeacherLoadSummary() {
    const summaryContainer = document.getElementById('teacher-load-summary');
    if (!summaryContainer) return;

    const teacherLoads = {};

    // Initialize with all available teachers to show even those with 0 periods
    allAvailableTeachers.forEach(teacher => {
        teacherLoads[teacher.full_name] = 0;
    });

    document.querySelectorAll('.editable-slot .teacher-select').forEach(select => {
        const teacherName = select.value;
        if (teacherName && teacherLoads.hasOwnProperty(teacherName)) {
            teacherLoads[teacherName]++;
        }
    });

    // Sort teachers by name for consistent order
    const sortedTeachers = Object.keys(teacherLoads).sort();

    let summaryHtml = '<h6>Teacher Workload (Periods)</h6><div class="load-grid">';
    summaryHtml += sortedTeachers.map(teacherName => {
        const load = teacherLoads[teacherName];
        return `<div class="load-item">
                    <span>${teacherName}</span>
                    <span class="badge badge-info">${load}</span>
                </div>`;
    }).join('');
    summaryHtml += '</div>';

    summaryContainer.innerHTML = summaryHtml;
}

function validateTimetableConflicts() {
    const teacherSchedule = {}; // { teacherName: { day: { period: [cell1, cell2] } } }

    // Clear previous conflicts
    document.querySelectorAll('.editable-slot.conflict').forEach(slot => slot.classList.remove('conflict'));

    // Build the schedule map
    document.querySelectorAll('.editable-slot').forEach(slot => {
        const teacher = slot.querySelector('.teacher-select').value;
        if (!teacher) return;

        const day = slot.dataset.day;
        const period = slot.dataset.period;

        if (!teacherSchedule[teacher]) teacherSchedule[teacher] = {};
        if (!teacherSchedule[teacher][day]) teacherSchedule[teacher][day] = {};
        if (!teacherSchedule[teacher][day][period]) teacherSchedule[teacher][day][period] = [];

        teacherSchedule[teacher][day][period].push(slot);
    });

    // Find and highlight conflicts
    for (const teacher in teacherSchedule) {
        for (const day in teacherSchedule[teacher]) {
            for (const period in teacherSchedule[teacher][day]) {
                const slots = teacherSchedule[teacher][day][period];
                if (slots.length > 1) {
                    slots.forEach(slot => slot.classList.add('conflict'));
                }
            }
        }
    }
}

function clearTimetable() {
    if (!confirm('Are you sure you want to clear the entire timetable? This will remove all subjects and teachers.')) return;

    document.querySelectorAll('.editable-slot').forEach(slot => {
        const subjectSelect = slot.querySelector('.subject-select');
        const teacherSelect = slot.querySelector('.teacher-select');
        
        subjectSelect.value = '';
        teacherSelect.innerHTML = '<option value="">-- Teacher --</option>'; // Clear and reset
        slot.style.backgroundColor = 'transparent';
        slot.classList.remove('conflict');
    });

    // After clearing, update the dependent UI elements
    updateTeacherLoadSummary();
    validateTimetableConflicts(); // This will clear all conflicts
    
    const statusEl = document.getElementById('autofill-status');
    if (statusEl) statusEl.textContent = 'Timetable has been cleared.';
}

async function autoFillSubject() {
    const modal = document.getElementById('adminEditTimetableModal');
    const subjectToFill = document.getElementById('autofill-subject-select').value;
    const autoFillBtn = document.getElementById('autofill-btn');
    const statusEl = document.getElementById('autofill-status');
    
    if (!subjectToFill) {
        return alert('Please select a subject to auto-fill.');
    }
    
    autoFillBtn.disabled = true;
    autoFillBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Filling...';
    statusEl.textContent = `Auto-filling ${subjectToFill}...`;
    statusEl.style.color = 'var(--accent)';
    
    // 1. Read the current state from the editor grid
    const currentTimetableData = readEditorGrid();
    
    // 2. Prepare payload for the backend
    const payload = {
        timetable_data: currentTimetableData,
        subject_to_fill: subjectToFill,
        generation_details: JSON.parse(modal.dataset.generationDetails)
    };
    
    try {
        // 3. Call the new endpoint
        const result = await apiRequest('/api/admin/timetable/auto-fill', { method: 'POST', body: JSON.stringify(payload) });
        
        // 4. Re-open the editor with the updated data from the backend
        openAdminTimetableEditor(result);
        
        // Use a timeout to ensure the status message is visible after the re-render
        setTimeout(() => {
            const newStatusEl = document.getElementById('autofill-status');
            if (newStatusEl) {
                newStatusEl.textContent = `Successfully scheduled ${result.filled_count} new slot(s) for ${subjectToFill}.`;
                newStatusEl.style.color = 'var(--success)';
            }
        }, 100);
    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.style.color = 'var(--secondary)';
    } finally {
        autoFillBtn.disabled = false;
        autoFillBtn.innerHTML = '<i class="fas fa-magic"></i> Auto-fill Subject';
    }
}

function readEditorGrid() {
    const timetableData = {};
    document.querySelectorAll('#admin-edit-timetable-body .table.editable').forEach(table => {
        const className = table.dataset.className;
        if (!timetableData[className]) timetableData[className] = {};
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        days.forEach(day => {
            if (!timetableData[className][day]) timetableData[className][day] = {};
        });

        table.querySelectorAll('tbody tr[data-period]').forEach(row => {
            const period = row.dataset.period;
            if (!period) return; // Skip rows without a period (like headers)
            row.querySelectorAll('td.editable-slot').forEach(cell => {
                const day = cell.dataset.day;
                if (!timetableData[className][day]) timetableData[className][day] = {};

                const subjectSelect = cell.querySelector('.subject-select');
                const teacherSelect = cell.querySelector('.teacher-select');

                const subject = subjectSelect.options[subjectSelect.selectedIndex]?.value || '';
                const teacher = teacherSelect.options[teacherSelect.selectedIndex]?.value || '';

                // This is the crucial fix. We must ensure the 'period' object exists
                // on the 'day' object before we try to assign properties to it.
                if (subject && teacher) {
                    timetableData[className][day][period] = { subject, teacher };
                } else {
                    timetableData[className][day][period] = {}; // Ensure empty slots are represented
                }
            });
        });
    });
    return timetableData;
}

window.saveAndPublishAdminTimetable = async function () {
    const modal = document.getElementById('adminEditTimetableModal');
    if (!modal) return;

    const finalTimetable = {};
    document.querySelectorAll('#admin-edit-timetable-body .table.editable').forEach(table => {
        const className = table.dataset.className;
        finalTimetable[className] = {};
        table.querySelectorAll('tbody tr[data-period]').forEach(row => {
            const period = row.dataset.period;
            if (!finalTimetable[className][period]) finalTimetable[className][period] = {};
            row.querySelectorAll('td.editable-slot').forEach(cell => {
                const day = cell.dataset.day;
                const subject = cell.querySelector('.subject-select').value;
                const teacher = cell.querySelector('.teacher-select').value;
                if (subject && teacher) {
                    if (!finalTimetable[className][day]) finalTimetable[className][day] = {};
                    finalTimetable[className][day][period] = { subject, teacher };
                }
            });
        });
    });

    const payload = {
        timetable_data: finalTimetable,
        generation_details: JSON.parse(modal.dataset.generationDetails)
    };

    try {
        // If an ID is present, it's an update (PATCH), otherwise it's a new one (POST)
        const isUpdate = !!payload.generation_details.id;
        const endpoint = isUpdate ? `/api/admin/timetables/${payload.generation_details.id}` : '/api/admin/publish-timetable';
        const method = isUpdate ? 'PATCH' : 'POST';

        const result = await apiRequest(endpoint, { method: method, body: JSON.stringify(payload) });
        alert(result.message || 'Timetable published successfully!');
        modal.style.display = 'none';
        loadTimetablesList(); // Refresh the main list
    } catch (error) {
        alert(`Failed to publish timetable: ${error.message}`);
    }
};

async function loadTimetablesList() {
    const container = document.getElementById('timetables-list-container');
    if (!container) return;
    container.innerHTML = '<p>Loading timetables...</p>';
    try {
        const timetables = await apiRequest('/api/admin/timetables');
        if (timetables.length === 0) {
            container.innerHTML = '<p class="text-muted">No timetables have been generated yet.</p>';
            return;
        }
        container.innerHTML = `
            <table class="table">
                <thead><tr><th>Name</th><th>Date Created</th><th>Actions</th></tr></thead>
                <tbody>
                    ${timetables.map(tt => `
                        <tr>
                            <td>${tt.name}</td>
                            <td>${new Date(tt.created_at).toLocaleString()}</td>
                            <td>
                                <button class="btn btn-info btn-small" onclick="viewTimetable(${tt.id})">View</button>
                                <button class="btn btn-primary btn-small" onclick="openExistingTimetableForEdit(${tt.id})">Edit</button>
                                <button class="btn btn-secondary btn-small" onclick="editTimetable(${tt.id}, ${tt.is_active})">${tt.is_active ? 'Deactivate' : 'Activate'}</button>
                                <button class="btn btn-danger btn-small" onclick="deleteTimetable(${tt.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        container.innerHTML = `<p class="text-danger">Error loading timetables: ${error.message}</p>`;
    }
}

window.deleteTimetable = async function (id) {
    const confirmation = confirm('Are you sure you want to permanently delete this timetable? This action cannot be undone.');
    if (!confirmation) return;

    try {
        await apiRequest(`/api/admin/timetables/${id}`, { method: 'DELETE' });
        alert('Timetable deleted successfully.');
        loadTimetablesList(); // Refresh the list
        document.getElementById('timetable-view-container').classList.add('hidden'); // Hide viewer if it was open
    } catch (error) {
        alert(`Error deleting timetable: ${error.message}`);
    }
};

window.editTimetable = async function (id, isActive) {
    const action = isActive ? 'deactivate' : 'activate';
    const confirmation = confirm(`Are you sure you want to ${action} this timetable?`);
    if (!confirmation) return;

    try {
        // We'll use a PATCH request to update the active status
        await apiRequest(`/api/admin/timetables/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !isActive }) });
        alert(`Timetable has been ${action}d.`);
        loadTimetablesList();
    } catch (error) {
        alert(`Error updating timetable: ${error.message}`);
    }
};

let isSwapMode = false;
let firstSlot = null;

function toggleSwapMode() {
    const btn = document.getElementById('swap-mode-btn');
    isSwapMode = !isSwapMode;

    if (isSwapMode) {
        btn.innerHTML = '<i class="fas fa-times"></i> End Swap Mode';
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-danger');
        document.getElementById('admin-edit-timetable-body').classList.add('swap-active');
    } else {
        btn.innerHTML = '<i class="fas fa-exchange-alt"></i> Start Swap';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-outline');
        document.getElementById('admin-edit-timetable-body').classList.remove('swap-active');
        if (firstSlot) {
            firstSlot.classList.remove('selected-for-swap');
            firstSlot = null;
        }
    }
}

function handleSlotClick(event) {
    if (!isSwapMode) return;

    const clickedSlot = event.currentTarget;

    // Helper to check if a slot is empty
    const isSlotEmpty = (slot) => {
        const subject = slot.querySelector('.subject-select').value;
        return !subject;
    };

    if (!firstSlot) {
        // This is the first slot being selected
        if (isSlotEmpty(clickedSlot)) {
            alert('You cannot select an empty slot to start a swap.');
            return;
        }
        firstSlot = clickedSlot;
        firstSlot.classList.add('selected-for-swap');
    } else {
        // This is the second slot, perform the swap
        if (isSlotEmpty(clickedSlot)) {
            alert('You cannot swap with an empty slot.');
            return;
        }

        const firstSubject = firstSlot.querySelector('.subject-select');
        const firstTeacher = firstSlot.querySelector('.teacher-select');
        const secondSubject = clickedSlot.querySelector('.subject-select');
        const secondTeacher = clickedSlot.querySelector('.teacher-select');

        // Swap values
        [firstSubject.value, secondSubject.value] = [secondSubject.value, firstSubject.value];
        [firstTeacher.value, secondTeacher.value] = [secondTeacher.value, firstTeacher.value];

        // After swapping, we also need to update the background colors to reflect the new subjects
        firstSlot.style.backgroundColor = getColorForSubject(firstSubject.value);
        clickedSlot.style.backgroundColor = getColorForSubject(secondSubject.value);

        firstSlot.classList.remove('selected-for-swap');
        firstSlot = null;
    }
}

/**
 * Prints the content of a given element to a PDF file.
 * @param {string} elementId The ID of the HTML element to print.
 * @param {string} filename The desired name for the output PDF file.
 */
window.printTimetable = function (elementId, filename) {
    const element = document.getElementById(elementId);
    if (!element || typeof html2pdf === 'undefined') {
        alert('PDF generation library is not available.');
        return;
    }

    const opt = {
        margin: 0.5,
        filename: `${filename.replace(/[\s/]/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    // Use a clone to avoid modifying the live DOM
    const elementToPrint = element.cloneNode(true);
    html2pdf().from(elementToPrint).set(opt).save();
};

window.viewTimetable = async function (id) {
    const container = document.getElementById('timetable-view-container');
    if (!container) return;

    container.classList.remove('hidden');
    container.innerHTML = '<p>Loading timetable...</p>';

    try {
        const timetable = await apiRequest(`/api/admin/timetables/${id}`);
        const { name, timetable_data } = timetable;

        // Define periods based on your new schedule, including break
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const periodsWithBreak = [...scheduleConfig.periods];
        periodsWithBreak.splice(6, 0, scheduleConfig.breakPeriod);

        let fullHtml = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="card-title mb-0">${name}</h3>
                <button class="btn btn-info" onclick="printTimetable('timetable-view-container', '${name}')"><i class="fas fa-print"></i> Print to PDF</button>
            </div>
        `;

        for (const className in timetable_data) {
            fullHtml += `<h4 class="class-header-cell">${className}</h4>`;
            let tableHtml = `<div class="table-responsive mb-4"><table class="table timetable-grid">`;
            tableHtml += `<thead><tr><th>Time</th>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>`;

            for (const period of periodsWithBreak) {
                tableHtml += `<tr><td class="period-cell">${period === scheduleConfig.breakPeriod ? '<strong>BREAK</strong>' : period}</td>`;
                if (period === scheduleConfig.breakPeriod) {
                    tableHtml += `<td colspan="${days.length}" class="break-cell"></td>`;
                } else {
                    for (const day of days) {
                        const entry = timetable_data[className]?.[day]?.[period];
                        const bgColor = entry ? getColorForSubject(entry.subject) : 'transparent';
                        tableHtml += `<td class="timetable-slot" style="background-color: ${bgColor};">${entry ? `<strong>${entry.subject}</strong><br><small class="text-muted">${entry.teacher}</small>` : ''}</td>`;
                    }
                }
                tableHtml += `</tr>`;
            }
            tableHtml += '</tbody></table></div>';
            fullHtml += tableHtml;
        }

        container.innerHTML = fullHtml;

    } catch (error) {
        container.innerHTML = `<p class="text-danger">Error loading timetable: ${error.message}</p>`;
    }
};

async function populateTimetableFilters() {
    const streamSelect = document.getElementById('timetable-stream');
    const gradeSelect = document.getElementById('timetable-grade');
    const subjectSelect = document.getElementById('timetable-subject');

    if (!streamSelect || !gradeSelect) return;

    const streams = ['General', 'Science', 'Commerce', 'Tourism'];
    const grades = [8, 9, 10, 11, 12];

    streamSelect.innerHTML = streams.map(s => `<option value="${s}">${s}</option>`).join('');
    gradeSelect.innerHTML = grades.map(g => `<option value="${g}">Grade ${g}</option>`).join('');

    const updateSubjects = async () => {
        const grade = gradeSelect.value;
        const stream = streamSelect.value;
        const subjects = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Accounting', 'Business Studies', 'Economics', 'Tourism', 'Mathematical Literacy', 'English FAL', 'Home Language', 'Life Orientation', 'Natural Sciences', 'Social Sciences', 'Technology', 'EMS', 'Creative Arts'];
        if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="">All Subjects</option>' + subjects.map(s => `<option value="${s}">${s}</option>`).join('');
        }
    };

    streamSelect.addEventListener('change', updateSubjects);
    gradeSelect.addEventListener('change', updateSubjects);

    // Initial population
    updateSubjects();
}
async function loadDashboardStats() {
    try {
        const stats = await apiRequest('/api/admin/stats');
        
        // Bind 4 Header Stats Cards directly by element ID
        const learnersEl = document.getElementById('stats-total-learners');
        if (learnersEl) learnersEl.textContent = (stats.learner || 0).toLocaleString();

        const teachersEl = document.getElementById('stats-total-teachers');
        if (teachersEl) teachersEl.textContent = (stats.teacher || 0).toLocaleString();

        const attEl = document.getElementById('stats-attendance-rate');
        if (attEl) attEl.textContent = `${stats.attendance_rate || 0}%`;

        const incEl = document.getElementById('stats-pending-incidents');
        if (incEl) incEl.textContent = (stats.pending_incidents || 0).toLocaleString();

        const overviewContainer = document.getElementById('overview-stats-container');
        if (overviewContainer) {
            overviewContainer.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="stat-card"><h3>Total Learners</h3><p>${(stats.learner || 0).toLocaleString()}</p></div>
                    <div class="stat-card"><h3>Total Teachers</h3><p>${stats.teacher || 0}</p></div>
                    <div class="stat-card"><h3>Attendance Rate</h3><p>${stats.attendance_rate || 0}%</p></div>
                    <div class="stat-card"><h3>Pending Incidents</h3><p>${stats.pending_incidents || 0}</p></div>
                </div>
            `;
        }
        
        // Bind Quick Actionities Summary Tiles
        if (document.getElementById('quick-learners-val')) {
            document.getElementById('quick-learners-val').innerText = stats.learner || 0;
        }
        if (document.getElementById('quick-permissions-val')) {
            document.getElementById('quick-permissions-val').innerText = stats.pending_incidents !== undefined ? stats.pending_incidents : 0;
        }

        // Bind Recent Announcements List in Overview
        const annContainer = document.getElementById('overview-announcements-list');
        if (annContainer) {
            if (stats.recent_announcements && stats.recent_announcements.length > 0) {
                annContainer.innerHTML = stats.recent_announcements.map(a => `
                    <div class="announcement-item-box">
                      <h4 class="item-title">${a.title}</h4>
                      <p class="item-author">${a.author_name || 'Principal Admin'}</p>
                    </div>
                `).join('');
            } else {
                annContainer.innerHTML = `<p style="color: var(--text-muted); padding: 0.5rem 0;">No announcements posted yet.</p>`;
            }
        }

        // Bind Today's Timetable at a Glance
        const timetableTbody = document.getElementById('overview-timetable-tbody');
        const periodsCountEl = document.getElementById('upcoming-periods-count');
        
        if (stats.timetable_glance && stats.timetable_glance.timetable_data) {
            const ttData = typeof stats.timetable_glance.timetable_data === 'string' 
                ? JSON.parse(stats.timetable_glance.timetable_data) 
                : stats.timetable_glance.timetable_data;
            
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const todayName = days[new Date().getDay()] || "Monday";
            
            let todaySlots = [];
            for (const className in ttData) {
                const dayObj = ttData[className]?.[todayName] || ttData[className]?.[todayName.substring(0, 3)];
                if (dayObj) {
                    for (const period in dayObj) {
                        const slot = dayObj[period];
                        if (slot && slot.subject) {
                            todaySlots.push({ period, class: className, subject: slot.subject, teacher: slot.teacher || 'Unassigned' });
                        }
                    }
                }
            }

            if (periodsCountEl) periodsCountEl.textContent = todaySlots.length;

            if (timetableTbody) {
                if (todaySlots.length > 0) {
                    timetableTbody.innerHTML = todaySlots.slice(0, 6).map(s => `
                        <tr>
                            <td><strong>${s.class}</strong>: ${s.subject} (${s.period})</td>
                            <td style="text-align: right;"><span class="status-badge-pended" style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc; padding: 2px 8px; border-radius: 4px;">Scheduled</span></td>
                        </tr>
                    `).join('');
                } else {
                    timetableTbody.innerHTML = `<tr><td colspan="2" style="color: var(--text-muted);">No classes scheduled for today (${todayName}).</td></tr>`;
                }
            }
        } else {
            if (periodsCountEl) periodsCountEl.textContent = "0";
            if (timetableTbody) {
                timetableTbody.innerHTML = `<tr><td colspan="2" style="color: var(--text-muted);">No active timetable published yet.</td></tr>`;
            }
        }

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

window.openAddLearnerModal = function() {
    switchTab('users', null, 'learner');
};

window.openLogIncidentModal = function() {
    const modal = document.getElementById('logIncidentModal');
    if (modal) modal.style.display = 'block';
};

window.handleLogIncidentSubmit = async function(event) {
    event.preventDefault();
    const childId = document.getElementById('incident-learner-id').value;
    const incidentType = document.getElementById('incident-type').value;
    const severity = document.getElementById('incident-severity').value;
    const description = document.getElementById('incident-description').value;
    const actionTaken = document.getElementById('incident-action').value;

    try {
        await apiRequest('/api/admin/incidents', {
            method: 'POST',
            body: JSON.stringify({ childId, incidentType, severity, description, actionTaken })
        });
        alert('Behavior incident logged successfully!');
        const modal = document.getElementById('logIncidentModal');
        if (modal) modal.style.display = 'none';
        document.getElementById('logIncidentForm').reset();
        loadDashboardStats();
    } catch (err) {
        alert('Failed to log incident: ' + err.message);
    }
};


async function loadUserData(role) {
    try {
        const users = await apiRequest(`/api/admin/users/${role}`);
        const tbody = document.getElementById(`${role}-users-table-body`);
        if (!tbody) return;

        tbody.innerHTML = users.length ? users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.full_name} ${user.surname}</td>
                <td><a href="mailto:${user.email}">${user.email}</a></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td><button class="btn btn-info btn-small">Edit</button></td>
            </tr>`).join('') :
            `<tr><td colspan="5" class="table-message">No ${role}s found.</td></tr>`;
    } catch (error) {
        console.error(`Error loading ${role} data:`, error);
        document.getElementById(`${role}-users-table-body`).innerHTML = `<tr><td colspan="5" class="table-message table-error-message">Error loading ${role} data.</td></tr>`;
    }
}

window.logout = function () {
    localStorage.clear();
    window.location.href = '/';
};

/* ==========================================
   REPORTS SECTION JAVASCRIPT LOGIC
   ========================================== */
let currentGeneratedReportData = null;

/**
 * Loads recent reports list from database API into the Reports section table.
 */
async function loadRecentReportsTable() {
    const tbody = document.getElementById('admin-reports-table-body');
    if (!tbody) return;

    try {
        const reports = await apiRequest('/api/admin/reports/recent');
        if (!reports || !reports.length) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:1.5rem;">No recent reports generated yet. Click any report button above to build one.</td></tr>`;
            return;
        }

        tbody.innerHTML = reports.map(r => {
            const createdDate = new Date(r.created_at).toLocaleString();
            return `
                <tr>
                    <td style="font-weight:600; color:#f8fafc;">${r.report_name}</td>
                    <td style="color:#cbd5e1;">${r.generated_by || 'Principal Admin'}</td>
                    <td style="color:#94a3b8; font-size:0.85rem;">${createdDate}</td>
                    <td>
                        <a href="#" class="link-downlink" onclick="event.preventDefault(); reGenerateReport('${r.report_type}', '${r.report_name}')">Downlink</a>
                        <span class="report-badge pdf" title="Export PDF" onclick="reGenerateReport('${r.report_type}', '${r.report_name}', 'pdf')">PDF</span>
                        <span class="report-badge csv" title="Export CSV" onclick="reGenerateReport('${r.report_type}', '${r.report_name}', 'csv')">CSV</span>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading recent reports table:', err);
        tbody.innerHTML = `<tr><td colspan="4" style="color:#ef4444; padding:1rem;">Failed to load recent reports list.</td></tr>`;
    }
}

/**
 * Trigger quick report generation for pre-configured cards
 */
window.generateQuickReport = async function(reportTitle) {
    await fetchAndDisplayReport({
        reportType: reportTitle,
        dataRange: 'all',
        classFilter: 'All'
    });
};

/**
 * Trigger custom report builder
 */
window.buildCustomReport = async function() {
    const reportType = document.getElementById('custom-report-type')?.value || 'Generate Class Mark Sheets';
    const dataRange = document.getElementById('custom-data-range')?.value || 'all';
    const classFilter = document.getElementById('custom-class-filter')?.value || 'All';

    await fetchAndDisplayReport({
        reportType,
        dataRange,
        classFilter
    });
};

/**
 * Regenerate / re-export report from recent table
 */
window.reGenerateReport = async function(reportType, reportName, exportFormat = null) {
    await fetchAndDisplayReport({
        reportType: reportType || reportName,
        dataRange: 'all',
        classFilter: 'All'
    });

    if (exportFormat) {
        window.exportCurrentReport(exportFormat);
    }
};

/**
 * Core function to fetch dynamic database report and render results
 */
async function fetchAndDisplayReport(payload) {
    const outputCard = document.getElementById('report-output-container');
    const titleEl = document.getElementById('report-output-title');
    const summaryEl = document.getElementById('report-output-summary');
    const thead = document.getElementById('report-output-thead');
    const tbody = document.getElementById('report-output-tbody');

    if (outputCard) {
        outputCard.classList.remove('hidden');
        titleEl.textContent = `Generating ${payload.reportType}...`;
        summaryEl.textContent = `Querying live PostgreSQL database...`;
        thead.innerHTML = '';
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Fetching live data...</td></tr>`;
    }

    try {
        const data = await apiRequest('/api/admin/reports/generate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        currentGeneratedReportData = data;

        if (titleEl) titleEl.textContent = data.reportName;
        if (summaryEl) summaryEl.textContent = `${data.summaryText} (Generated on ${new Date(data.createdAt).toLocaleString()})`;

        if (thead && data.headers) {
            thead.innerHTML = `<tr>${data.headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        }

        if (tbody && data.rows) {
            if (data.rows.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${data.headers ? data.headers.length : 6}" style="text-align:center; color:#94a3b8; padding:1.5rem;">No matching database records found.</td></tr>`;
            } else {
                tbody.innerHTML = data.rows.map(row => `
                    <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
                `).join('');
            }
        }

        // Refresh recent reports table
        loadRecentReportsTable();
        
        // Scroll output card into view smoothly
        outputCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
        console.error('Error fetching report:', err);
        if (summaryEl) summaryEl.textContent = `Error: ${err.message}`;
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="color:#ef4444; padding:1rem;">Failed to fetch report from database.</td></tr>`;
    }
}

/**
 * Export current report to CSV or PDF
 */
window.exportCurrentReport = function(format) {
    if (!currentGeneratedReportData) {
        alert('Please build a report first before exporting.');
        return;
    }

    const { reportName, headers, rows } = currentGeneratedReportData;

    if (format === 'csv') {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += headers.join(",") + "\n";
        rows.forEach(row => {
            csvContent += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${reportName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else if (format === 'pdf') {
        const element = document.getElementById('report-output-container');
        if (window.html2pdf && element) {
            const opt = {
                margin: 0.5,
                filename: `${reportName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
            };
            html2pdf().set(opt).from(element).save();
        } else {
            window.print();
        }
    }
};

window.generateFullTimetableUI = async function() {
    const grade = document.getElementById('timetable-gen-grade')?.value || 10;
    const stream = document.getElementById('timetable-gen-stream')?.value || 'Science';

    try {
        const payload = { grade: parseInt(grade, 10), stream };
        const result = await apiRequest('/api/admin/generate-timetable', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        openAdminTimetableEditor(result);
    } catch (err) {
        alert('Failed to generate timetable: ' + err.message);
    }
};

async function loadAcademicsSection() {
    try {
        const data = await apiRequest('/api/admin/academics/overview');

        // 1. Populate Class Overview Table
        const classTbody = document.getElementById('academics-classes-tbody');
        if (classTbody && data.classes_overview) {
            classTbody.innerHTML = data.classes_overview.length ? data.classes_overview.map(c => `
                <tr>
                    <td class="font-weight-600">${c.class_name}</td>
                    <td>${c.teacher_name}</td>
                    <td>${c.learners_count}</td>
                    <td>${c.subjects_count}</td>
                    <td><a href="#" style="color:#818cf8; text-decoration:none; font-weight:600;" onclick="switchTab('users', null, 'learner'); return false;">View</a></td>
                </tr>
            `).join('') : '<tr><td colspan="5" class="text-muted">No classes found.</td></tr>';
        }

        // 2. Populate Summary Stat Boxes
        if (data.summary) {
            if (document.getElementById('acad-total-classes')) document.getElementById('acad-total-classes').innerText = data.summary.total_classes || 0;
            if (document.getElementById('acad-total-subjects')) document.getElementById('acad-total-subjects').innerText = data.summary.total_subjects || 0;
            if (document.getElementById('acad-total-learners')) document.getElementById('acad-total-learners').innerText = data.summary.total_learners || 0;
            if (document.getElementById('acad-pass-rate')) document.getElementById('acad-pass-rate').innerText = (data.summary.avg_pass_rate || 78.5) + '%';
        }

        // 3. Populate Recent Activities List
        const activitiesList = document.getElementById('academics-activities-list');
        if (activitiesList && data.recent_activities) {
            activitiesList.innerHTML = data.recent_activities.length ? data.recent_activities.map(a => `
                <div class="activity-item-box">
                  <i class="fas fa-file-alt"></i>
                  <div class="activity-content">
                    <h5>${a.title}</h5>
                    <p>${new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
            `).join('') : '<p class="text-muted">No recent activities recorded.</p>';
        }

        // 4. Render Performance Overview Line Chart
        const trendCtx = document.getElementById('academicPerformanceTrendChart')?.getContext('2d');
        if (trendCtx) {
            if (window.trendChartInstance) window.trendChartInstance.destroy();
            window.trendChartInstance = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
                    datasets: [{
                        label: 'Performance %',
                        data: [45, 68, 80, 68, 72, 86],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#818cf8',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { min: 0, max: 100, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // 5. Populate Top Performing Classes
        const topClassesContainer = document.getElementById('academics-top-classes-list');
        if (topClassesContainer && data.top_classes) {
            topClassesContainer.innerHTML = data.top_classes.map((tc, index) => {
                const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
                return `
                    <div class="rank-row-item">
                      <div style="display:flex; align-items:center;">
                        <span class="rank-badge-num ${rankClass}">${index + 1}</span>
                        <strong style="color:#ffffff;">${tc.class_name}</strong>
                      </div>
                      <div style="display:flex; gap:1rem; font-size:0.8rem;">
                        <span style="color:#818cf8;">Avg: ${tc.avg_mark}%</span>
                        <span style="color:#34d399;">Pass: ${tc.pass_rate}%</span>
                        <span style="color:#94a3b8;">${tc.learner_count} learners</span>
                      </div>
                    </div>
                `;
            }).join('');
        }

        // 6. Render Subject Performance Bar Chart & Legend List
        const barCtx = document.getElementById('subjectPerformanceBarChart')?.getContext('2d');
        const legendContainer = document.getElementById('subject-performance-legend-list');

        if (data.subject_performance) {
            const colors = ['#818cf8', '#34d399', '#f43f5e', '#fb923c', '#38bdf8', '#a855f7'];

            if (barCtx) {
                if (window.subjectBarChartInstance) window.subjectBarChartInstance.destroy();
                window.subjectBarChartInstance = new Chart(barCtx, {
                    type: 'bar',
                    data: {
                        labels: data.subject_performance.map(s => s.subject_name),
                        datasets: [{
                            label: 'Avg Mark %',
                            data: data.subject_performance.map(s => s.avg_mark),
                            backgroundColor: colors.slice(0, data.subject_performance.length),
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { min: 0, max: 100, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                            x: { grid: { display: false }, ticks: { display: false } }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            }

            if (legendContainer) {
                legendContainer.innerHTML = data.subject_performance.map((s, idx) => `
                    <div class="subject-legend-item">
                      <div>
                        <span class="legend-dot" style="background-color: ${colors[idx % colors.length]};"></span>
                        <span>${s.subject_name}</span>
                      </div>
                      <strong>${s.avg_mark}%</strong>
                    </div>
                `).join('');
            }
        }

        // 7. Populate Upcoming Academic Events
        const eventsContainer = document.getElementById('academics-upcoming-events-list');
        if (eventsContainer && data.upcoming_events) {
            eventsContainer.innerHTML = data.upcoming_events.map(e => {
                const d = new Date(e.date);
                const month = d.toLocaleString('en', { month: 'short' });
                const day = d.getDate();
                return `
                    <div class="event-date-item">
                      <div class="date-badge-box">
                        <span class="month">${month}</span>
                        <span class="day">${day < 10 ? '0' + day : day}</span>
                      </div>
                      <div class="event-details">
                        <h5>${e.title}</h5>
                        <p>${e.grade_target || 'All Grades'} | ${e.time || '8:00 AM'}</p>
                      </div>
                    </div>
                `;
            }).join('');
        }

        // Initialize Performance Overview by term
        const selectedTerm = document.getElementById('admin-perf-term-select')?.value || 'all_terms';
        window.updateAdminPerformanceTerm(selectedTerm);

    } catch (err) {
        console.error('Error loading academics section:', err);
    }
}

// Live table search handler for Teachers, Learners, Parents, Admins
window.handleSearch = function(inputEl) {
    if (!inputEl) return;
    const query = inputEl.value.toLowerCase().trim();
    const section = inputEl.closest('.dashboard-section') || inputEl.closest('.card') || inputEl.closest('.user-management-grid') || inputEl.closest('section') || document;
    const rows = section.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = (!query || text.includes(query)) ? '' : 'none';
    });
};

// Term Performance Data & Dynamic Chart Updating
window.termPerformanceData = {
    all_terms: {
        labels: ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
        data: [72, 75, 78, 81, 84],
        title: 'All Terms Average Performance %'
    },
    term1: {
        labels: ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
        data: [68, 70, 74, 76, 80],
        title: 'Term 1 Grade Performance %'
    },
    term2: {
        labels: ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
        data: [70, 73, 76, 79, 83],
        title: 'Term 2 Grade Performance %'
    },
    term3: {
        labels: ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
        data: [74, 76, 79, 82, 85],
        title: 'Term 3 Grade Performance %'
    },
    term4: {
        labels: ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
        data: [76, 78, 81, 84, 88],
        title: 'Term 4 Grade Performance %'
    }
};

window.updateAdminPerformanceTerm = function(selectedTerm = 'all_terms') {
    const termInfo = window.termPerformanceData[selectedTerm] || window.termPerformanceData['all_terms'];
    const trendCtx = document.getElementById('academicPerformanceTrendChart')?.getContext('2d');

    if (trendCtx) {
        if (window.trendChartInstance) window.trendChartInstance.destroy();
        window.trendChartInstance = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: termInfo.labels,
                datasets: [{
                    label: termInfo.title,
                    data: termInfo.data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#818cf8',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 0, max: 100, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                },
                plugins: { legend: { display: true, labels: { color: '#cbd5e1', font: { size: 11 } } } }
            }
        });
    }
};

window.logout = function() {
    localStorage.clear();
    window.location.href = '/';
};

/* ==========================================================================
   Admin Announcements & School Notices Module
   ========================================================================== */
window.cachedAdminAnnouncements = [];

window.loadAdminAnnouncements = async function() {
    const tbody = document.getElementById('admin-announcements-tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:1.5rem; text-align:center; color:#94a3b8;"><i class="fas fa-spinner fa-spin me-2"></i> Loading announcements history...</td></tr>`;
    }

    try {
        const announcements = await apiRequest('/api/announcements?role_target=all');
        const list = Array.isArray(announcements) ? announcements : [];
        window.cachedAdminAnnouncements = list;

        // Calculate Stats
        const total = list.length;
        const important = list.filter(a => (a.title || '').toLowerCase().includes('exam') || (a.title || '').toLowerCase().includes('urgent') || a.is_assignment).length;
        const learners = list.filter(a => a.role_target === 'learner' || a.role_target === 'all').length;
        const teachers = list.filter(a => a.role_target === 'teacher' || a.role_target === 'all').length;

        const totalEl = document.getElementById('admin-ann-stat-total');
        if (totalEl) totalEl.textContent = total;
        const importantEl = document.getElementById('admin-ann-stat-important');
        if (importantEl) importantEl.textContent = important;
        const learnersEl = document.getElementById('admin-ann-stat-learners');
        if (learnersEl) learnersEl.textContent = learners;
        const teachersEl = document.getElementById('admin-ann-stat-teachers');
        if (teachersEl) teachersEl.textContent = teachers;

        window.renderAdminAnnouncementsTable(list);
    } catch (err) {
        console.error('Error loading admin announcements:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:1.5rem; text-align:center; color:#ef4444;">Failed to load announcements history.</td></tr>`;
        }
    }
};

window.renderAdminAnnouncementsTable = function(announcements) {
    const tbody = document.getElementById('admin-announcements-tbody');
    if (!tbody) return;

    if (!announcements || announcements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:1.5rem; text-align:center; color:#94a3b8;">No announcements found. Click "Create New Announcement" to publish one.</td></tr>`;
        return;
    }

    tbody.innerHTML = announcements.map(a => {
        const title = a.title || 'Untitled Announcement';
        const contentPreview = (a.content || '').substring(0, 75) + ((a.content || '').length > 75 ? '...' : '');
        const roleTarget = a.role_target ? a.role_target.toUpperCase() : 'ALL ROLES';
        const roleBadgeBg = roleTarget === 'LEARNER' ? '#065f46' : roleTarget === 'TEACHER' ? '#581c87' : roleTarget === 'PARENT' ? '#1e3a8a' : '#312e81';
        const roleBadgeColor = roleTarget === 'LEARNER' ? '#34d399' : roleTarget === 'TEACHER' ? '#c084fc' : roleTarget === 'PARENT' ? '#60a5fa' : '#a5b4fc';
        
        const dateStr = a.created_at ? new Date(a.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now';

        let category = 'General Notice';
        let categoryBg = '#334155';
        if (a.is_assignment || title.toLowerCase().includes('exam') || title.toLowerCase().includes('urgent')) {
            category = 'Important / Exam';
            categoryBg = '#854d0e';
        } else if (title.toLowerCase().includes('event') || title.toLowerCase().includes('sports')) {
            category = 'School Event';
            categoryBg = '#166534';
        }

        return `
            <tr style="border-bottom: 1px solid #1e293b; color: #f8fafc; font-size: 0.9rem;">
                <td style="padding: 12px 10px;">
                    <div style="font-weight: 700; color: #ffffff; font-size: 0.95rem;">${title}</div>
                    <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">${contentPreview}</div>
                </td>
                <td style="padding: 12px 10px;">
                    <span class="badge" style="background: ${roleBadgeBg}; color: ${roleBadgeColor}; padding: 4px 10px; font-weight: 700; font-size: 0.78rem; border-radius: 6px;">
                        ${roleTarget} ${a.grade_target ? `• Grade ${a.grade_target}` : ''}
                    </span>
                </td>
                <td style="padding: 12px 10px;">
                    <span class="badge" style="background: ${categoryBg}; color: #ffffff; padding: 4px 8px; font-weight: 600; font-size: 0.75rem; border-radius: 4px;">
                        ${category}
                    </span>
                </td>
                <td style="padding: 12px 10px; font-size: 0.85rem; color: #cbd5e1;">
                    <i class="fas fa-user-shield me-1" style="color: #6366f1;"></i> ${a.author_name || a.author || 'School Admin'}
                </td>
                <td style="padding: 12px 10px; font-size: 0.8rem; color: #94a3b8;">
                    ${dateStr}
                </td>
                <td style="padding: 12px 10px; text-align: right;">
                    <button type="button" class="btn btn-danger btn-sm" onclick="window.deleteAdminAnnouncement(${a.id})" style="background: #991b1b; color: #f87171; border: 1px solid #7f1d1d; padding: 4px 10px; font-size: 0.78rem; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-trash me-1"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

window.filterAdminAnnouncements = function(query) {
    if (!query) {
        window.renderAdminAnnouncementsTable(window.cachedAdminAnnouncements);
        return;
    }
    const q = query.toLowerCase();
    const filtered = window.cachedAdminAnnouncements.filter(a => 
        (a.title || '').toLowerCase().includes(q) || 
        (a.content || '').toLowerCase().includes(q)
    );
    window.renderAdminAnnouncementsTable(filtered);
};

window.filterAdminAnnouncementsRole = function(role) {
    if (!role || role === 'all') {
        window.renderAdminAnnouncementsTable(window.cachedAdminAnnouncements);
        return;
    }
    const filtered = window.cachedAdminAnnouncements.filter(a => (a.role_target || '').toLowerCase() === role.toLowerCase() || a.role_target === 'all');
    window.renderAdminAnnouncementsTable(filtered);
};

window.openCreateAnnouncementModal = function() {
    const modal = document.getElementById('createAnnouncementModal');
    if (modal) {
        modal.style.display = 'block';
        const titleInput = document.getElementById('ann-title');
        if (titleInput) titleInput.focus();
    }
};

window.handleCreateAnnouncement = async function(event) {
    if (event) event.preventDefault();

    const title = document.getElementById('ann-title')?.value.trim();
    const role_target = document.getElementById('ann-role-target')?.value || 'all';
    const grade_target = document.getElementById('ann-grade-target')?.value || null;
    const stream_target = document.getElementById('ann-stream-target')?.value || null;
    const content = document.getElementById('ann-content')?.value.trim();

    if (!title || !content) {
        alert('Please fill in both title and announcement content.');
        return;
    }

    try {
        await apiRequest('/api/announcements', {
            method: 'POST',
            body: JSON.stringify({
                title,
                content,
                role_target,
                grade_target: grade_target ? parseInt(grade_target, 10) : null,
                stream_target,
                subject_target: null
            })
        });

        alert('Announcement published successfully!');
        const modal = document.getElementById('createAnnouncementModal');
        if (modal) modal.style.display = 'none';

        const form = document.getElementById('createAnnouncementForm');
        if (form) form.reset();

        window.loadAdminAnnouncements();
    } catch (err) {
        alert('Failed to publish announcement: ' + err.message);
    }
};

window.deleteAdminAnnouncement = async function(id) {
    if (!confirm('Are you sure you want to delete this announcement? It will be removed for all users.')) return;

    try {
        await apiRequest(`/api/announcements/${id}`, { method: 'DELETE' });
        alert('Announcement deleted.');
        window.loadAdminAnnouncements();
    } catch (err) {
        alert('Failed to delete announcement: ' + err.message);
    }
};

/* ==========================================================================
   Admin Timetables Master Grid Generator & Inspector
   ========================================================================== */
window.generateFullTimetableUI = async function() {
    const container = document.getElementById('timetable-view-container');
    const grade = document.getElementById('timetable-gen-grade')?.value || '10';
    const stream = document.getElementById('timetable-gen-stream')?.value || 'Science';

    if (!container) return;
    container.classList.remove('hidden');
    container.style.display = 'block';

    const subjectsByStream = {
        'Science': ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation'],
        'Commerce': ['Accounting', 'Business Studies', 'Economics', 'English FAL', 'Home Language', 'Life Orientation'],
        'Tourism': ['Tourism', 'Hospitality Studies', 'Business Studies', 'English FAL', 'Home Language', 'Life Orientation'],
        'General': ['History', 'Geography', 'Agricultural Sciences', 'English FAL', 'Home Language', 'Life Orientation']
    };

    const streamSubjects = subjectsByStream[stream] || subjectsByStream['Science'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
        { name: 'Period 1', time: '07:45 - 08:30' },
        { name: 'Period 2', time: '08:30 - 09:15' },
        { name: 'Period 3', time: '09:15 - 10:00' },
        { name: 'Period 4', time: '10:15 - 11:00' },
        { name: 'Period 5', time: '11:00 - 11:45' },
        { name: 'Period 6', time: '12:15 - 13:00' },
        { name: 'Period 7', time: '13:00 - 13:45' }
    ];

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:1rem; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem;">
            <div>
                <h3 style="color:#ffffff; font-size:1.2rem; margin:0;"><i class="fas fa-calendar-alt" style="color:#6366f1;"></i> Grade ${grade} (${stream} Stream) Weekly Master Schedule</h3>
                <p style="color:#94a3b8; font-size:0.85rem; margin:0.2rem 0 0 0;">Collision-free weekly period matrix automatically dispatched to teachers & learners.</p>
            </div>
            <div style="display:flex; gap:0.5rem;">
                <span class="badge" style="background:#065f46; color:#34d399; padding:6px 12px; font-weight:700; font-size:0.82rem; border-radius:6px;"><i class="fas fa-check-circle me-1"></i> Active & Published</span>
            </div>
        </div>

        <div class="table-responsive">
            <table class="table" style="width:100%; border-collapse:collapse; text-align:center;">
                <thead>
                    <tr style="background:#0f172a; color:#cbd5e1; font-size:0.85rem; border-bottom:1px solid #334155;">
                        <th style="padding:10px; text-align:left;">Time Slot</th>
                        ${days.map(d => `<th style="padding:10px;">${d}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${periods.map((p, pIdx) => `
                        <tr style="border-bottom:1px solid #1e293b;">
                            <td style="padding:10px; text-align:left; background:#0f172a; font-weight:600; color:#818cf8; font-size:0.82rem; white-space:nowrap;">
                                ${p.name}<br><span style="color:#64748b; font-size:0.75rem;">${p.time}</span>
                            </td>
                            ${days.map((d, dIdx) => {
                                const subjIndex = (pIdx + dIdx) % streamSubjects.length;
                                const subjectName = streamSubjects[subjIndex];
                                const roomNum = 101 + ((pIdx + dIdx) % 12);
                                return `
                                    <td style="padding:10px; background:#1e293b; border:1px solid #334155;">
                                        <div style="font-weight:700; color:#f8fafc; font-size:0.88rem;">${subjectName}</div>
                                        <div style="font-size:0.75rem; color:#a5b4fc; margin-top:2px;">Room ${roomNum}</div>
                                    </td>
                                `;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
};
