/**
 * FUSION HIGH APP - Message Center Component Controller
 */

let activeContactId = null;
let allContactsList = [];

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

export async function initMessageCenter() {
    const contactsContainer = document.getElementById('chat-contacts-list');
    if (!contactsContainer) return;

    try {
        contactsContainer.innerHTML = `<div style="padding:1.5rem; text-align:center; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Loading contacts...</div>`;
        allContactsList = await apiChatRequest('/api/messages/contacts');
        renderContactsList(allContactsList);

        if (allContactsList.length > 0) {
            selectContact(allContactsList[0].id);
        } else {
            const streamBody = document.getElementById('chat-stream-body');
            if (streamBody) streamBody.innerHTML = `<div style="text-align:center; padding:3rem; color:#64748b;">No contacts available.</div>`;
        }
    } catch (err) {
        console.error('Error loading Message Center:', err);
        contactsContainer.innerHTML = `<div style="padding:1rem; color:#ef4444; text-align:center;">Failed to load contacts.</div>`;
    }
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

        return `
            <div class="contact-item-card ${isActive}" onclick="window.selectContact(${c.id})">
                ${pfpSrc 
                    ? `<img src="${pfpSrc}" class="contact-avatar" alt="${c.full_name}">`
                    : `<div class="contact-avatar">${initials}</div>`
                }
                <div class="contact-info-content">
                    <div class="contact-info-header">
                        <span class="contact-name">${c.full_name} ${c.surname}</span>
                        ${timeAgo ? `<span class="contact-time">${timeAgo}</span>` : ''}
                    </div>
                    <div class="contact-tag">${c.tag_name || c.role_name}</div>
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

        if (headerTitle) headerTitle.textContent = `${targetContact.full_name} ${targetContact.surname}`;
        if (headerTag) headerTag.textContent = targetContact.tag_name || targetContact.role_name;
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
    if (streamBody) {
        streamBody.innerHTML = `<div style="text-align:center; padding:2rem; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Loading messages...</div>`;
    }

    try {
        const messages = await apiChatRequest(`/api/messages/conversation/${contactId}`);
        renderChatStream(messages);
    } catch (err) {
        console.error('Error loading conversation:', err);
        if (streamBody) streamBody.innerHTML = `<div style="text-align:center; padding:2rem; color:#ef4444;">Failed to load messages.</div>`;
    }
}

function renderChatStream(messages) {
    const streamBody = document.getElementById('chat-stream-body');
    if (!streamBody) return;

    if (!messages || messages.length === 0) {
        streamBody.innerHTML = `<div style="text-align:center; margin:auto; color:#64748b; font-size:0.9rem;">No messages yet. Send a message to start communicating!</div>`;
        return;
    }

    let currentUserId = null;
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.id;
        }
    } catch (e) {}

    streamBody.innerHTML = messages.map(m => {
        const isOutgoing = m.sender_id === currentUserId;
        const timeStr = formatChatTimestamp(m.created_at);

        return `
            <div class="chat-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}">
                <div class="chat-bubble">
                    ${escapeHtml(m.body)}
                </div>
                <span class="chat-timestamp">${timeStr}</span>
            </div>
        `;
    }).join('');

    streamBody.scrollTop = streamBody.scrollHeight;
}

export async function sendChatMessage() {
    const input = document.getElementById('chat-input-box');
    if (!input || !activeContactId) return;

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

        allContactsList = await apiChatRequest('/api/messages/contacts');
        renderContactsList(allContactsList);
    } catch (err) {
        alert('Failed to send message: ' + err.message);
    }
}

export function filterChatContacts(query) {
    const q = query.toLowerCase().trim();
    const filtered = allContactsList.filter(c => 
        `${c.full_name} ${c.surname}`.toLowerCase().includes(q) ||
        (c.tag_name && c.tag_name.toLowerCase().includes(q))
    );
    renderContactsList(filtered);
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
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

window.selectContact = selectContact;
window.sendChatMessage = sendChatMessage;
window.filterChatContacts = filterChatContacts;
window.initMessageCenter = initMessageCenter;
