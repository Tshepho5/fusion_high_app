import { apiCall, getTeacherMessages, replyToParent, markMessagesAsRead, getUserIdFromToken } from './api.js';

export async function loadMessageCenter() {
    const container = document.getElementById('message-list-container');
    if (!container) return;

    try {
        const messages = await getTeacherMessages();
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
            const childInfo = msg.child_name ? ` (Learner: ${msg.child_name} ${msg.child_surname || ''})` : '';
            return `
                <div class="message-item 
                    ${isSent ? 'sent' : 'received'}
                    ${isUnread ? 'unread' : ''}"
                >
                    <div class="message-header">
                        <span>${isSent
                    ? `To: ${msg.recipient_name} ${msg.recipient_surname || ''}`
                    : `From: ${msg.sender_name} ${msg.sender_surname}`}</span>
                        <span>${new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <div class="message-subject">${msg.subject}${childInfo}</div>
                    <p class="message-body">${msg.body}</p>
                    ${!isSent ? `
                        <div class="message-reply-area">
                            <button class="btn btn-sm btn-outline" style="padding: 4px 10px; font-size: 0.75rem;" onclick="toggleReplyForm('reply-form-${msg.id}')">Reply</button>
                            <form id="reply-form-${msg.id}" class="reply-form hidden" onsubmit="sendReply(event, ${msg.sender_id}, ${msg.child_id}, '${msg.subject}')">
                                <textarea class="form-control" rows="3" placeholder="Type your reply..." required style="background: var(--bg); color: white; border: 1px solid #334155; margin-bottom: 0.5rem;"></textarea>
                                <button type="submit" class="btn btn-primary btn-sm" style="align-self: flex-start; padding: 6px 16px;">Send Reply</button>
                            </form>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // After displaying, mark the unread messages as read in the background
        if (unreadIds.length > 0) {
            markMessagesAsRead(unreadIds).catch(err => console.error("Failed to mark messages as read:", err));
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
}

window.sendReply = async function (event, parentId, childId, originalSubject) {
    event.preventDefault();
    const form = event.target;
    const textarea = form.querySelector('textarea');
    const btn = form.querySelector('button');

    const payload = {
        parentId,
        childId,
        subject: originalSubject.startsWith('RE:') ? originalSubject : `RE: ${originalSubject}`,
        message: textarea.value
    };

    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        await replyToParent(payload);
        alert('Reply sent successfully!');
        textarea.value = '';
        form.classList.add('hidden');
        // Optionally, refresh the message list to show the new sent message
        loadMessageCenter();
    } catch (error) {
        alert('Failed to send reply: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Reply';
    }
}

window.loadTeacherRecipientsByRole = async function () {
    const roleSelect = document.getElementById('tmsg-recipient-role');
    const recipientSelect = document.getElementById('tmsg-recipient-id');
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
        const users = await apiCall(`/teacher/recipients/${role}`);
        recipientSelect.innerHTML = `
            <option value="">Select Recipient...</option>
            ${users.map(u => `<option value="${u.id}">${u.full_name} ${u.surname} (${u.email})</option>`).join('')}
        `;
    } catch (error) {
        recipientSelect.innerHTML = '<option value="">Error loading recipients</option>';
        console.error(error);
    }
};

window.sendTeacherMessage = async function (event) {
    event.preventDefault();
    const form = event.target;
    const recipientId = document.getElementById('tmsg-recipient-id').value;
    const subject = document.getElementById('tmsg-subject').value;
    const body = document.getElementById('tmsg-body').value;
    const btn = form.querySelector('button[type="submit"]');

    if (!recipientId || !subject || !body) return;

    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        await apiCall('/messages', {
            method: 'POST',
            body: JSON.stringify({ recipientId: parseInt(recipientId, 10), subject, body })
        });
        alert('Message sent successfully!');
        form.reset();
        document.getElementById('tmsg-recipient-id').disabled = true;
        loadMessageCenter();
    } catch (error) {
        alert('Error sending message: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Message';
    }
};