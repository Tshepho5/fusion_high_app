/**
 * FUSION HIGH APP - Communication Hub & Message Center Controller
 * Optimized for cross-role real-time messaging across all dashboards
 * (Parent, Learner, Teacher, Admin)
 */

let activeContactId = null;
let allContactsList = [];
let chatPollingInterval = null;
let lastMessageCount = 0;
let isPolling = false;

async function apiChatRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    const res = await fetch(endpoint, { ...options, headers });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${res.status}`);
    }
    return res.json();
}

function getCurrentUserId() {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return String(payload.id);
        }
    } catch (e) {}
    return null;
}

export async function initMessageCenter() {
    const contactsContainer = document.getElementById('chat-contacts-list');
    if (!contactsContainer) return;

    // Attach file input for attachment button if not already created
    setupAttachmentUploader();

    try {
        contactsContainer.innerHTML = `<div style="padding:1.5rem; text-align:center; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Loading contacts...</div>`;
        allContactsList = await apiChatRequest('/api/messages/contacts');
        renderContactsList(allContactsList);

        if (allContactsList.length > 0) {
            if (!activeContactId || !allContactsList.some(c => c.id === activeContactId)) {
                await selectContact(allContactsList[0].id);
            } else {
                await selectContact(activeContactId);
            }
        } else {
            const streamBody = document.getElementById('chat-stream-body');
            if (streamBody) streamBody.innerHTML = `<div style="text-align:center; padding:3rem; color:#64748b;">No contacts available.</div>`;
        }
    } catch (err) {
        console.error('Error loading Message Center:', err);
        contactsContainer.innerHTML = `<div style="padding:1rem; color:#ef4444; text-align:center;">Failed to load contacts.</div>`;
    }

    // Start live polling for receiving messages across all dashboards
    startChatPolling();
}

function renderContactsList(contacts) {
    const contactsContainer = document.getElementById('chat-contacts-list');
    if (!contactsContainer) return;

    if (!contacts || contacts.length === 0) {
        contactsContainer.innerHTML = `<div style="padding:1rem; color:#94a3b8; text-align:center; font-size:0.85rem;">No matching contacts found.</div>`;
        return;
    }

    contactsContainer.innerHTML = contacts.map(c => {
        const isActive = c.id === activeContactId ? 'active' : '';
        const initials = `${c.full_name ? c.full_name[0] : ''}${c.surname ? c.surname[0] : ''}`.toUpperCase() || 'U';
        const pfpSrc = c.profile_picture_path ? `/${c.profile_picture_path}` : null;
        const timeAgo = formatChatTime(c.last_activity);
        const unreadBadge = c.unread_count > 0 ? `<span class="contact-unread-badge" style="background:#ef4444; color:#fff; border-radius:50%; font-size:0.7rem; font-weight:700; width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; margin-left:auto;">${c.unread_count}</span>` : '';

        return `
            <div class="contact-item-card ${isActive}" onclick="window.selectContact(${c.id})">
                ${pfpSrc 
                    ? `<img src="${pfpSrc}" class="contact-avatar" alt="${c.full_name}">`
                    : `<div class="contact-avatar">${initials}</div>`
                }
                <div class="contact-info-content" style="flex:1; min-width:0;">
                    <div class="contact-info-header" style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="contact-name">${escapeHtml(c.full_name)} ${escapeHtml(c.surname || '')}</span>
                        ${timeAgo ? `<span class="contact-time">${timeAgo}</span>` : ''}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="contact-tag">${escapeHtml(c.tag_name || c.role_name || '')}</div>
                        ${unreadBadge}
                    </div>
                    <div class="contact-preview">${c.last_message ? escapeHtml(c.last_message) : 'Start a conversation...'}</div>
                </div>
            </div>
        `;
    }).join('');
}

export async function selectContact(contactId) {
    activeContactId = contactId;
    renderContactsList(allContactsList);

    const targetContact = allContactsList.find(c => c.id === contactId);
    if (targetContact) {
        const headerTitle = document.getElementById('chat-active-name');
        const headerTag = document.getElementById('chat-active-tag');
        const headerAvatar = document.getElementById('chat-active-avatar');

        if (headerTitle) headerTitle.textContent = `${targetContact.full_name} ${targetContact.surname || ''}`.trim();
        if (headerTag) headerTag.textContent = targetContact.tag_name || targetContact.role_name || '';
        if (headerAvatar) {
            if (targetContact.profile_picture_path) {
                headerAvatar.innerHTML = `<img src="/${targetContact.profile_picture_path}" class="contact-avatar" alt="${targetContact.full_name}">`;
            } else {
                const initials = `${targetContact.full_name ? targetContact.full_name[0] : ''}${targetContact.surname ? targetContact.surname[0] : ''}`.toUpperCase();
                headerAvatar.innerHTML = `<div class="contact-avatar">${initials}</div>`;
            }
        }
    }

    const streamBody = document.getElementById('chat-stream-body');
    if (streamBody && (!streamBody.children.length || streamBody.innerText.includes('Select a Conversation'))) {
        streamBody.innerHTML = `<div style="text-align:center; padding:2rem; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Loading messages...</div>`;
    }

    try {
        const messages = await apiChatRequest(`/api/messages/conversation/${contactId}`);
        renderChatStream(messages);
        lastMessageCount = messages ? messages.length : 0;
    } catch (err) {
        console.error('Error loading conversation:', err);
        if (streamBody) streamBody.innerHTML = `<div style="text-align:center; padding:2rem; color:#ef4444;">Failed to load messages.</div>`;
    }
}

function renderChatStream(messages) {
    const streamBody = document.getElementById('chat-stream-body');
    if (!streamBody) return;

    if (!messages || messages.length === 0) {
        streamBody.innerHTML = `<div style="text-align:center; margin:auto; color:#64748b; font-size:0.9rem; padding:2rem;"><i class="fas fa-comments" style="font-size:2rem; display:block; margin-bottom:0.75rem; color:#475569;"></i>No messages yet. Send a message to start communicating!</div>`;
        return;
    }

    const currentUserId = getCurrentUserId();

    streamBody.innerHTML = messages.map(m => {
        const isOutgoing = String(m.sender_id) === String(currentUserId);
        const timeStr = formatChatTimestamp(m.created_at);

        let attachmentHtml = '';
        if (m.attachment_url) {
            const url = m.attachment_url;
            const type = m.attachment_type || 'document';
            const name = escapeHtml(m.attachment_name || 'Attachment');

            if (type === 'image') {
                attachmentHtml = `<div style="margin-bottom:6px;"><a href="${url}" target="_blank"><img src="${url}" style="max-width:240px; max-height:200px; border-radius:6px; display:block;" alt="${name}"></a></div>`;
            } else if (type === 'voice_note') {
                attachmentHtml = `<div style="margin-bottom:6px;"><audio controls style="max-width:220px; height:36px;"><source src="${url}" type="audio/webm"><source src="${url}" type="audio/ogg"><source src="${url}" type="audio/mpeg"></audio></div>`;
            } else {
                attachmentHtml = `<div style="margin-bottom:6px;"><a href="${url}" target="_blank" download style="color:${isOutgoing ? '#fff' : '#38bdf8'}; text-decoration:underline; font-size:0.85rem;"><i class="fas fa-file-download me-1"></i> ${name}</a></div>`;
            }
        }

        const bodyContent = (m.body || m.content || '').trim();

        return `
            <div class="chat-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}">
                <div class="chat-bubble">
                    ${attachmentHtml}
                    ${bodyContent ? `<div>${escapeHtml(bodyContent)}</div>` : ''}
                </div>
                <span class="chat-timestamp">${timeStr}</span>
            </div>
        `;
    }).join('');

    streamBody.scrollTop = streamBody.scrollHeight;
}

export async function sendChatMessage() {
    const input = document.getElementById('chat-input-box');
    if (!input || !activeContactId) {
        if (!activeContactId) alert('Please select a contact to message.');
        return;
    }

    const messageText = input.value.trim();
    if (!messageText) return;

    input.value = '';

    try {
        await apiChatRequest('/api/messages', {
            method: 'POST',
            body: JSON.stringify({
                recipientId: activeContactId,
                subject: 'Direct Message',
                body: messageText
            })
        });

        const messages = await apiChatRequest(`/api/messages/conversation/${activeContactId}`);
        renderChatStream(messages);
        lastMessageCount = messages ? messages.length : 0;

        // Refresh contacts list preview
        allContactsList = await apiChatRequest('/api/messages/contacts');
        renderContactsList(allContactsList);
    } catch (err) {
        alert('Failed to send message: ' + err.message);
    }
}

export function filterChatContacts(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
        renderContactsList(allContactsList);
        return;
    }
    const filtered = allContactsList.filter(c => 
        `${c.full_name} ${c.surname}`.toLowerCase().includes(q) ||
        (c.tag_name && c.tag_name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
    renderContactsList(filtered);
}

// Live polling to receive messages across all dashboards
function startChatPolling() {
    if (chatPollingInterval) clearInterval(chatPollingInterval);

    chatPollingInterval = setInterval(async () => {
        const chatContainer = document.querySelector('.chat-center-container');
        if (!chatContainer || isPolling) return;

        // Only poll when message center section is active or visible
        const parentSection = chatContainer.closest('.section, .dashboard-tab');
        if (parentSection && !parentSection.classList.contains('active') && parentSection.style.display === 'none') {
            return;
        }

        isPolling = true;
        try {
            if (activeContactId) {
                const messages = await apiChatRequest(`/api/messages/conversation/${activeContactId}`);
                if (messages && messages.length !== lastMessageCount) {
                    renderChatStream(messages);
                    lastMessageCount = messages.length;
                    
                    // Also refresh contacts
                    allContactsList = await apiChatRequest('/api/messages/contacts');
                    renderContactsList(allContactsList);
                }
            }

            // Update badge counts if any exist in the page
            updateUnreadBadges();
        } catch (e) {
            // Silently ignore transient network polling errors
        } finally {
            isPolling = false;
        }
    }, 3000);
}

async function updateUnreadBadges() {
    try {
        const countData = await apiChatRequest('/api/messages/unread-count').catch(() => null);
        const count = countData?.unreadCount || countData?.count || 0;
        const badges = document.querySelectorAll('#unread-messages-badge, #header-unread-badge, #top-nav-unread-badge');
        badges.forEach(b => {
            if (count > 0) {
                b.textContent = count;
                b.classList.remove('hidden');
                b.style.display = 'inline-flex';
            } else {
                b.classList.add('hidden');
                b.style.display = 'none';
            }
        });
    } catch (_) {}
}

// File Attachment Handler
function setupAttachmentUploader() {
    let fileInput = document.getElementById('chat-file-attachment-input');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'chat-file-attachment-input';
        fileInput.style.display = 'none';
        fileInput.accept = 'image/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt';
        document.body.appendChild(fileInput);

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !activeContactId) return;

            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', file);

            try {
                const uploadRes = await fetch('/api/messages/upload', {
                    method: 'POST',
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: formData
                });

                if (!uploadRes.ok) {
                    throw new Error('Attachment upload failed.');
                }
                const uploadData = await uploadRes.json();

                // Send message with uploaded attachment
                await apiChatRequest('/api/messages', {
                    method: 'POST',
                    body: JSON.stringify({
                        recipientId: activeContactId,
                        subject: 'Direct Message Attachment',
                        body: '',
                        attachment_url: uploadData.file_url || uploadData.attachment_url,
                        attachment_name: uploadData.file_name || uploadData.attachment_name,
                        attachment_type: uploadData.attachment_type,
                        file_size: uploadData.file_size
                    })
                });

                const messages = await apiChatRequest(`/api/messages/conversation/${activeContactId}`);
                renderChatStream(messages);
                lastMessageCount = messages ? messages.length : 0;
            } catch (err) {
                alert('Attachment failed: ' + err.message);
            } finally {
                fileInput.value = '';
            }
        });
    }

    const attachBtn = document.querySelector('.chat-action-btn');
    if (attachBtn) {
        attachBtn.onclick = () => {
            if (!activeContactId) {
                alert('Please select a contact before attaching a file.');
                return;
            }
            fileInput.click();
        };
    }
}

function formatChatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString();
}

function formatChatTimestamp(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.innerText = String(text);
    return div.innerHTML;
}

// Global assignments for HTML onclick compatibility across all role dashboards
window.selectContact = selectContact;
window.sendChatMessage = sendChatMessage;
window.filterChatContacts = filterChatContacts;
window.initMessageCenter = initMessageCenter;
