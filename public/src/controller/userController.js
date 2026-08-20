const db = require('../../../db/db');
const emailService = require('../services/emailService');
const NotificationService = require('../services/notificationService');
const bcrypt = require('bcryptjs');
const { validatePassword } = require('./authController');

exports.getProfile = async (req, res) => {
    try {
        const userRes = await db.query(
            `SELECT u.id, u.email, u.full_name, u.surname, u.phone, u.id_number, u.gender, u.physical_address, u.country, u.race, u.preferences, u.profile_picture_path, r.name as role 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User profile not found' });
        }

        const user = userRes.rows[0];
        if (user.role === 'learner') {
            const childRes = await db.query('SELECT * FROM children WHERE learner_user_id = $1 OR id_number = $2', [req.user.id, user.id_number]);
            user.academic = childRes.rows[0] || null;
            if (user.academic) {
                user.grade = user.academic.grade;
                user.stream = user.academic.stream;
                user.learner_number = user.academic.learner_number;
            }
        }
        res.json({ success: true, user, ...user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Handles profile picture upload and saves path to database.
 */
exports.uploadProfilePicture = async (req, res) => {
    const userId = req.user.id;
    try {
        let filePath = '';
        if (req.file) {
            filePath = `/uploads/pfp/${req.file.filename}`;
        } else if (req.body.profile_picture_url) {
            filePath = req.body.profile_picture_url;
        } else {
            return res.status(400).json({ success: false, error: 'No image file or URL provided.' });
        }

        const result = await db.query(
            `UPDATE users 
             SET profile_picture_path = $1::varchar, 
                 profile_picture = $2::text 
             WHERE id = $3 
             RETURNING id, full_name, surname, email, profile_picture_path, profile_picture`,
            [filePath, filePath, userId]
        );

        res.json({
            success: true,
            message: 'Profile picture updated successfully.',
            profile_picture_path: filePath,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Error uploading profile picture:', err);
        res.status(500).json({ success: false, error: 'Failed to upload profile picture: ' + err.message });
    }
};

exports.updateProfile = async (req, res) => {
    const userId = req.user.id;
    const updates = req.body;

    try {
        const userRes = await db.query(
            `SELECT u.id, u.email, u.full_name, r.name as role 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.id = $1`,
            [userId]
        );
        if (userRes.rowCount === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const currentUser = userRes.rows[0];
        const userRole = currentUser.role;

        // For learners, restrict editing of sensitive personal credentials (name, surname, email, ID)
        let allowedFields;
        if (userRole === 'learner') {
            allowedFields = ['phone', 'physical_address'];
        } else {
            allowedFields = ['full_name', 'surname', 'phone', 'gender', 'physical_address', 'country', 'race', 'email'];
        }

        const keys = Object.keys(updates).filter(key => allowedFields.includes(key));

        if (keys.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: userRole === 'learner' 
                    ? "Personal credentials (name, ID number, and email) are locked. Only contact details and address can be updated." 
                    : "No valid fields provided for update" 
            });
        }

        const oldEmail = currentUser.email.toLowerCase();

        const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = keys.map(key => key === 'email' ? updates[key].toLowerCase().trim() : updates[key]);

        values.push(userId);
        const queryText = `UPDATE users SET ${setClause} WHERE id = $${values.length} RETURNING id, full_name, email, phone, physical_address`;

        const result = await db.query(queryText, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const updatedUser = result.rows[0];
        const newEmail = updatedUser.email ? updatedUser.email.toLowerCase() : oldEmail;

        let subject = 'Profile Updated Successfully';
        let body = `Hello ${updatedUser.full_name || 'User'},\n\nThis is a confirmation that your profile on FUSION_HIGH_APP has been updated.`;

        if (newEmail !== oldEmail) {
            subject = 'Email Address Changed';
            body += `\n\nYour email address was specifically updated from ${oldEmail} to ${newEmail}.`;
        }

        emailService.send(newEmail, subject, body).catch(e => console.warn('Email dispatch warning:', e.message));

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (err) {
        console.error('Database Error:', err);
        if (err.code === '23505') {
            return res.status(409).json({ success: false, error: "Username or Email already in use" });
        }
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

exports.updatePreferences = async (req, res) => {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (typeof preferences !== 'object' || preferences === null) {
        return res.status(400).json({ success: false, error: 'Invalid preferences format. Expected an object.' });
    }

    try {
        const { rows } = await db.query('SELECT preferences FROM users WHERE id = $1', [userId]);
        const currentPrefs = rows[0]?.preferences || {};
        const newPrefs = { ...currentPrefs, ...preferences };

        await db.query('UPDATE users SET preferences = $1 WHERE id = $2', [newPrefs, userId]);
        res.json({ success: true, message: 'Preferences updated successfully.', preferences: newPrefs });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update preferences.' });
    }
};

exports.changePassword = async (req, res) => {
    const currentPassword = req.body.currentPassword || req.body.current_password;
    const newPassword = req.body.newPassword || req.body.new_password;
    const confirmPassword = req.body.confirmPassword || req.body.confirm_password || newPassword;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Current password and new password are required.' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'New passwords do not match.' });
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
        return res.status(400).json({ success: false, error: pwError });
    }

    try {
        const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        const user = userRes.rows[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Incorrect current password.' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'An internal server error occurred: ' + err.message });
    }
};

/**
 * Marks a list of messages as read for the logged-in user.
 * Supports both messageIds array and sender_id / contact_id for full conversation read receipts.
 */
exports.markMessagesAsRead = async (req, res) => {
    const userId = req.user.id;
    const { messageIds, sender_id, senderId, contact_id } = req.body;

    try {
        if (Array.isArray(messageIds) && messageIds.length > 0) {
            await db.query('UPDATE messages SET read_at = NOW() WHERE id = ANY($1::int[]) AND recipient_id = $2', [messageIds, userId]);
            return res.json({ success: true, message: 'Messages marked as read.' });
        }
        
        const targetSender = sender_id || senderId || contact_id;
        if (targetSender) {
            await db.query('UPDATE messages SET read_at = NOW() WHERE recipient_id = $1 AND sender_id = $2 AND read_at IS NULL', [userId, targetSender]);
            return res.json({ success: true, message: 'Conversation messages marked as read.' });
        }

        res.json({ success: true, message: 'No messages to mark as read.' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update message status.' });
    }
};

/**
 * Gets the count of unread messages for the logged-in user.
 */
exports.getUnreadMessageCount = async (req, res) => {
    const userId = req.user.id;
    try {
        const { rows } = await db.query('SELECT COUNT(*) FROM messages WHERE recipient_id = $1 AND read_at IS NULL', [userId]);
        res.json({ success: true, count: parseInt(rows[0].count, 10) });
    } catch (err) {
        console.error('Error fetching unread message count:', err);
        res.status(500).json({ success: false, error: 'Failed to get unread message count.' });
    }
};

/**
 * Gets all messages for the logged-in user (Admin, Teacher, Parent, Learner).
 */
exports.getMessages = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT m.*, 
                   sender.full_name as sender_name, sender.surname as sender_surname,
                   recipient.full_name as recipient_name, recipient.surname as recipient_surname,
                   c.full_name as child_name, c.surname as child_surname
            FROM messages m
            LEFT JOIN users sender ON m.sender_id = sender.id
            LEFT JOIN users recipient ON m.recipient_id = recipient.id
            LEFT JOIN children c ON m.child_id = c.id
            WHERE m.sender_id = $1 OR m.recipient_id = $1
            ORDER BY m.created_at DESC;
        `;
        const { rows } = await db.query(query, [userId]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ success: false, error: 'Failed to retrieve messages.' });
    }
};

/**
 * Sends a message from the logged-in user to any recipient.
 */
exports.sendMessage = async (req, res) => {
    const senderId = req.user.id;
    const rawRecipientId = req.body.recipientId || req.body.receiver_id || req.body.recipient_id || req.body.recipient;
    const recipientId = rawRecipientId ? parseInt(rawRecipientId, 10) : null;
    const subject = req.body.subject || 'Direct Message';
    const body = req.body.body || req.body.content || req.body.message;
    const childId = req.body.childId || req.body.child_id ? parseInt(req.body.childId || req.body.child_id, 10) : null;

    if (!recipientId || !body || !body.trim()) {
        return res.status(400).json({ success: false, error: 'Recipient ID and message content are required.' });
    }

    try {
        const textContent = body.trim();
        const result = await db.query(
            `INSERT INTO messages (sender_id, recipient_id, child_id, subject, body, content, created_at) 
             VALUES ($1, $2, $3, $4, $5, $5, NOW()) RETURNING *`,
            [senderId, recipientId, childId || null, subject, textContent]
        );

        // Fetch sender's name for instant push notification
        try {
            const senderRes = await db.query('SELECT full_name, surname FROM users WHERE id = $1', [senderId]);
            const senderName = senderRes.rows[0] ? `${senderRes.rows[0].full_name} ${senderRes.rows[0].surname}` : 'A user';
            
            await NotificationService.sendToUsers({
                userIds: [recipientId],
                title: `💬 New Message from ${senderName}`,
                message: textContent.length > 80 ? textContent.substring(0, 77) + '...' : textContent,
                type: 'message',
                targetTab: 'messages',
                metadata: { senderId, senderName, messageId: result.rows[0].id }
            });
        } catch (notifErr) {
            console.warn('[MESSAGE NOTIFICATION NOTICE]:', notifErr.message);
        }

        res.json({ success: true, message: 'Message sent successfully.', messageRecord: result.rows[0] });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ success: false, error: 'Failed to send message: ' + err.message });
    }
};

/**
 * Gets allowed communication contacts based on user role and database associations.
 * Deduplicates contacts so that each user appears exactly once in the chat directory.
 */
exports.getCommunicationContacts = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        let query = '';
        let params = [userId];

        if (role === 'teacher') {
            query = `
                SELECT u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name as role_name,
                       CASE 
                           WHEN r.name = 'parent' THEN 'Parent' || CASE WHEN COUNT(c.id) > 0 THEN ' (' || STRING_AGG(DISTINCT c.full_name, ', ') || ')' ELSE '' END
                           WHEN r.name = 'learner' THEN 'Learner - Grade ' || COALESCE(MAX(c.grade)::text, 'N/A')
                           WHEN r.name = 'teacher' THEN COALESCE(MAX(e.subjects[1]), 'Teacher') || ' Teacher'
                           ELSE 'School Admin'
                       END AS tag_name,
                       (
                           SELECT body FROM messages m 
                           WHERE (m.sender_id = $1 AND m.recipient_id = u.id) OR (m.sender_id = u.id AND m.recipient_id = $1)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_message,
                       (
                           SELECT created_at FROM messages m 
                           WHERE (m.sender_id = $1 AND m.recipient_id = u.id) OR (m.sender_id = u.id AND m.recipient_id = $1)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_activity,
                       (
                           SELECT COUNT(*) FROM messages m
                           WHERE m.sender_id = u.id AND m.recipient_id = $1 AND m.read_at IS NULL
                       ) AS unread_count
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN employees e ON e.user_id = u.id
                LEFT JOIN children c ON (c.parent_id = u.id OR c.learner_user_id = u.id)
                WHERE u.id != $1 AND (
                    r.name IN ('admin', 'teacher', 'parent', 'learner')
                )
                GROUP BY u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name
                ORDER BY last_activity DESC NULLS LAST, u.full_name ASC;
            `;
        } else if (role === 'learner') {
            const gradeRes = await db.query('SELECT grade FROM children WHERE learner_user_id = $1', [userId]);
            const learnerGrade = gradeRes.rows[0]?.grade || null;

            query = `
                SELECT u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name as role_name,
                       CASE 
                           WHEN r.name = 'teacher' THEN COALESCE(MAX(e.subjects[1]), 'Teacher') || ' Teacher'
                           WHEN r.name = 'learner' THEN 'Grade ' || COALESCE(MAX(c.grade)::text, 'N/A') || ' Learner'
                           ELSE 'School Admin'
                       END AS tag_name,
                       (
                           SELECT body FROM messages m 
                           WHERE (m.sender_id = $1 AND m.recipient_id = u.id) OR (m.sender_id = u.id AND m.recipient_id = $1)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_message,
                       (
                           SELECT created_at FROM messages m 
                           WHERE (m.sender_id = $1 AND m.recipient_id = u.id) OR (m.sender_id = u.id AND m.recipient_id = $1)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_activity,
                       (
                           SELECT COUNT(*) FROM messages m
                           WHERE m.sender_id = u.id AND m.recipient_id = $1 AND m.read_at IS NULL
                       ) AS unread_count
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN employees e ON e.user_id = u.id
                LEFT JOIN children c ON c.learner_user_id = u.id
                WHERE u.id != $1 AND (
                    r.name = 'admin' 
                    OR (r.name = 'learner' AND ($2::int IS NULL OR c.grade = $2::int))
                    OR (r.name = 'teacher' AND ($2::int IS NULL OR $2::int = ANY(e.grades_taught) OR ARRAY_LENGTH(e.grades_taught, 1) IS NULL OR e.grades_taught = '{}'))
                )
                GROUP BY u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name
                ORDER BY last_activity DESC NULLS LAST, u.full_name ASC;
            `;
            params = [userId, learnerGrade];
        } else if (role === 'parent') {
            query = `
                SELECT u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name as role_name,
                       CASE 
                           WHEN r.name = 'teacher' THEN COALESCE(MAX(e.subjects[1]), 'Teacher') || ' Teacher'
                           ELSE 'School Admin'
                       END AS tag_name,
                       (
                           SELECT body FROM messages m 
                           WHERE (m.sender_id = $1 AND m.recipient_id = u.id) OR (m.sender_id = u.id AND m.recipient_id = $1)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_message,
                       (
                           SELECT created_at FROM messages m 
                           WHERE (m.sender_id = $1 AND m.recipient_id = u.id) OR (m.sender_id = u.id AND m.recipient_id = $1)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_activity,
                       (
                           SELECT COUNT(*) FROM messages m
                           WHERE m.sender_id = u.id AND m.recipient_id = $1 AND m.read_at IS NULL
                       ) AS unread_count
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN employees e ON e.user_id = u.id
                WHERE u.id != $1 AND (r.name = 'admin' OR r.name = 'teacher')
                GROUP BY u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name
                ORDER BY last_activity DESC NULLS LAST, u.full_name ASC;
            `;
        } else {
            query = `
                SELECT u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name as role_name,
                       CASE 
                           WHEN r.name = 'teacher' THEN COALESCE(MAX(e.subjects[1]), 'Teacher') || ' Teacher'
                           WHEN r.name = 'parent' THEN 'Parent'
                           WHEN r.name = 'learner' THEN 'Learner'
                           ELSE 'School Admin'
                       END AS tag_name,
                       (
                           SELECT body FROM messages m 
                           WHERE (m.sender_id = $1 AND m.recipient_id = u.id) OR (m.sender_id = u.id AND m.recipient_id = $1)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_message,
                       (
                           SELECT created_at FROM messages m 
                           WHERE (m.sender_id = $1 AND m.recipient_id = u.id) OR (m.sender_id = u.id AND m.recipient_id = $1)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_activity,
                       (
                           SELECT COUNT(*) FROM messages m
                           WHERE m.sender_id = u.id AND m.recipient_id = $1 AND m.read_at IS NULL
                       ) AS unread_count
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN employees e ON e.user_id = u.id
                WHERE u.id != $1
                GROUP BY u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name
                ORDER BY last_activity DESC NULLS LAST, u.full_name ASC;
            `;
        }

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching communication contacts:', err);
        res.status(500).json({ error: 'Failed to retrieve allowed contact list.' });
    }
};

/**
 * Gets conversation stream history between logged in user and target recipient.
 * Ensures strict chronological sorting and message deduplication.
 */
exports.getConversationHistory = async (req, res) => {
    const userId = req.user.id;
    const recipientId = req.params.recipientId;

    try {
        const query = `
            SELECT DISTINCT ON (m.id) m.*, 
                   sender.full_name as sender_name, sender.surname as sender_surname, sender.profile_picture_path as sender_pfp,
                   recipient.full_name as recipient_name, recipient.surname as recipient_surname, recipient.profile_picture_path as recipient_pfp
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users recipient ON m.recipient_id = recipient.id
            WHERE (m.sender_id = $1 AND m.recipient_id = $2)
               OR (m.sender_id = $2 AND m.recipient_id = $1)
            ORDER BY m.id ASC, m.created_at ASC;
        `;
        const { rows } = await db.query(query, [userId, recipientId]);

        // Sort chronologically by timestamp
        rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        await db.query('UPDATE messages SET read_at = NOW() WHERE recipient_id = $1 AND sender_id = $2 AND read_at IS NULL', [userId, recipientId]);

        res.json(rows);
    } catch (err) {
        console.error('Error fetching conversation history:', err);
        res.status(500).json({ error: 'Failed to load conversation history.' });
    }
};