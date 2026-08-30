const db = require('../../../db/db');
const emailService = require('../services/emailService');
const NotificationService = require('../services/notificationService');
const bcrypt = require('bcryptjs');
const { validatePassword } = require('./authController');

exports.getProfile = async (req, res) => {
    try {
        const userRes = await db.query(
            `SELECT u.id, u.email, u.full_name, u.surname, u.phone, u.id_number, u.dob, u.gender, u.physical_address, u.country, u.race, u.parent_type, u.preferences, u.profile_picture_path, u.school_id, u.is_superadmin, u.profile_edit_unlocked,
                    COALESCE(r.name, u.role_id::text, 'learner') as role 
             FROM users u 
             LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text)) 
             WHERE u.id::text = $1::text`,
            [req.user.id]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User profile not found' });
        }

        const user = userRes.rows[0];
        if (user.role === 'learner') {
            const lrnNum = (user.email || '').split('@')[0];
            const childRes = await db.query(
                `SELECT * FROM children 
                 WHERE learner_user_id::text = $1::text OR learner_number::text = $2::text
                 LIMIT 1`, 
                [req.user.id, lrnNum]
            );
            user.academic = childRes.rows[0] || null;
            if (user.academic) {
                user.grade = user.academic.grade;
                user.stream = user.academic.stream;
                user.learner_number = user.academic.learner_number;
                if (user.academic.school_id) {
                    user.school_id = user.academic.school_id;
                }
            }
        } else if (user.role === 'parent') {
            const childrenRes = await db.query(
                `SELECT c.id, c.full_name, c.surname, c.grade, c.stream, c.school_id, s.name as school_name, s.slug as school_slug, s.primary_color
                 FROM children c
                 LEFT JOIN schools s ON c.school_id = s.id
                 WHERE c.parent_id = $1 OR c.secondary_parent_id = $1 OR EXISTS (SELECT 1 FROM parent_children pc WHERE pc.child_id = c.id AND pc.parent_id = $1)`,
                [req.user.id]
            );
            user.children = childrenRes.rows;
            const distinctSchoolIds = [...new Set(childrenRes.rows.map(ch => ch.school_id).filter(Boolean))];
            user.enrolled_schools = distinctSchoolIds;
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
            `SELECT u.id, u.email, u.full_name, u.surname, u.profile_edit_unlocked, u.is_superadmin, r.name as role 
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
        const isAdmin = userRole === 'admin' || currentUser.is_superadmin;
        const isUnlocked = Boolean(currentUser.profile_edit_unlocked) || isAdmin;

        // If locked by administration, only contact details (phone, physical_address) can be edited, or reject if sensitive fields were sent
        let allowedFields;
        if (isUnlocked) {
            // Unlocked by Admin: Full name, surname, and personal fields can be edited
            allowedFields = ['full_name', 'surname', 'phone', 'gender', 'physical_address', 'country', 'race', 'dob'];
        } else {
            // Locked by default: Only phone and address
            allowedFields = ['phone', 'physical_address'];
        }

        const requestedKeys = Object.keys(updates);
        const attemptedLockedFields = requestedKeys.filter(k => ['full_name', 'surname', 'id_number', 'dob', 'grade', 'stream', 'email'].includes(k));
        
        if (!isUnlocked && attemptedLockedFields.length > 0) {
            return res.status(403).json({
                success: false,
                error: `Profile editing is locked by school administration. You cannot modify personal details (${attemptedLockedFields.join(', ')}). Please request your school administrator to unlock your profile to submit changes.`
            });
        }

        const keys = Object.keys(updates).filter(key => allowedFields.includes(key));

        if (keys.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: isUnlocked 
                    ? "No valid fields provided for update" 
                    : "Profile editing is locked by school administration. Please request your School Admin to unlock your profile to edit personal details." 
            });
        }

        const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = keys.map(key => updates[key]);
        values.push(userId);

        const queryText = `UPDATE users SET ${setClause} WHERE id = $${values.length} RETURNING id, full_name, surname, email, phone, physical_address, profile_edit_unlocked`;
        const result = await db.query(queryText, values);

        const updatedUser = result.rows[0];
        res.status(200).json({
            success: true,
            message: isUnlocked ? "Profile details updated successfully." : "Contact details saved successfully.",
            user: updatedUser
        });
    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ success: false, error: "Internal server error: " + err.message });
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
            await db.query('UPDATE messages SET read_at = NOW() WHERE id::text = ANY($1::text[]) AND recipient_id::text = $2::text', [messageIds.map(String), userId]);
            return res.json({ success: true, message: 'Messages marked as read.' });
        }
        
        const targetSender = sender_id || senderId || contact_id;
        if (targetSender) {
            await db.query('UPDATE messages SET read_at = NOW() WHERE recipient_id::text = $1::text AND sender_id::text = $2::text AND read_at IS NULL', [userId, targetSender]);
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
        const { rows } = await db.query('SELECT COUNT(*) FROM messages WHERE recipient_id::text = $1::text AND read_at IS NULL', [userId]);
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
            LEFT JOIN users sender ON m.sender_id::text = sender.id::text
            LEFT JOIN users recipient ON m.recipient_id::text = recipient.id::text
            LEFT JOIN children c ON m.child_id::text = c.id::text
            WHERE m.sender_id::text = $1::text OR m.recipient_id::text = $1::text
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
 * Handles uploading chat attachments (images, voice notes, and documents)
 */
exports.uploadMessageAttachment = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file was uploaded.' });
        }
        
        let attachmentType = 'document';
        const mimetype = req.file.mimetype.toLowerCase();
        if (mimetype.startsWith('image/')) {
            attachmentType = 'image';
        } else if (mimetype.startsWith('audio/') || mimetype.includes('ogg') || mimetype.includes('webm') || mimetype.includes('mp4')) {
            attachmentType = 'voice_note';
        }

        const filePath = `/uploads/messages/${req.file.filename}`;
        res.json({
            success: true,
            file_url: filePath,
            attachment_url: filePath,
            file_name: req.file.originalname,
            attachment_name: req.file.originalname,
            attachment_type: attachmentType,
            file_size: `${(req.file.size / 1024).toFixed(1)} KB`
        });
    } catch (err) {
        console.error('Error uploading message attachment:', err);
        res.status(500).json({ success: false, error: 'Failed to process attachment upload.' });
    }
};

/**
 * Sends a message from the logged-in user to any recipient.
 * Supports text, voice notes, pictures, and documents.
 */
exports.sendMessage = async (req, res) => {
    const senderId = req.user.id;
    const recipientId = req.body.recipient_id || req.body.receiver_id || req.body.recipientId;
    const childId = req.body.child_id || req.body.childId || null;
    const subject = req.body.subject || 'School Communication';
    const body = req.body.body || req.body.content || req.body.message || '';
    const attachmentUrl = req.body.attachment_url || req.body.attachmentUrl || null;
    const attachmentName = req.body.attachment_name || req.body.attachmentName || null;
    const attachmentType = req.body.attachment_type || req.body.attachmentType || 'document';
    const fileSize = req.body.file_size || req.body.fileSize || null;
    const voiceDuration = req.body.voice_duration || req.body.voiceDuration ? parseInt(req.body.voice_duration || req.body.voiceDuration, 10) : null;

    if (!recipientId) {
        return res.status(400).json({ success: false, error: 'Recipient ID is required.' });
    }

    if (!body.trim() && !attachmentUrl) {
        return res.status(400).json({ success: false, error: 'Message text or attachment is required.' });
    }

    try {
        let textContent = body.trim();
        if (!textContent && attachmentUrl) {
            if (attachmentType === 'voice_note') {
                const mins = Math.floor((voiceDuration || 0) / 60);
                const secs = (voiceDuration || 0) % 60;
                textContent = `🎤 Voice Note (${mins}:${secs.toString().padStart(2, '0')})`;
            } else if (attachmentType === 'image') {
                textContent = `📷 Photo (${attachmentName || 'image'})`;
            } else {
                textContent = `📎 Document: ${attachmentName || 'file'}`;
            }
        }

        const result = await db.query(
            `INSERT INTO messages (
                sender_id, recipient_id, child_id, subject, body, content, 
                attachment_url, attachment_name, attachment_type, file_size, voice_duration, created_at
             ) 
             VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, NOW()) 
             RETURNING *`,
            [
                senderId, recipientId, childId || null, subject, textContent,
                attachmentUrl, attachmentName, attachmentType, fileSize, voiceDuration
            ]
        );

        // Fetch sender's name for instant push notification
        try {
            const senderRes = await db.query('SELECT full_name, surname FROM users WHERE id::text = $1::text', [senderId]);
            const senderName = senderRes.rows[0] ? `${senderRes.rows[0].full_name} ${senderRes.rows[0].surname}`.trim() : 'Fusion High User';
            
            await NotificationService.sendNotification(
                recipientId,
                `New Message from ${senderName}`,
                textContent.length > 80 ? textContent.substring(0, 77) + '...' : textContent,
                'chat'
            );
        } catch (notifErr) {
            console.warn('Chat notification error:', notifErr.message);
        }

        res.json({ success: true, message: 'Message sent successfully.', data: result.rows[0] });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ success: false, error: 'Failed to send message: ' + err.message });
    }
};

/**
 * Returns allowed communication contacts with live unread counts and last message previews.
 */
exports.getCommunicationContacts = async (req, res) => {
    const userId = req.user.id;
    const role = (req.user.role || '').toLowerCase();

    try {
        let query = '';
        let params = [userId];

        if (role === 'teacher') {
            query = `
                SELECT u.id, u.full_name, u.surname, u.email, u.profile_picture_path, COALESCE(r.name, u.role_id::text, 'learner') as role_name,
                       CASE 
                           WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'parent' THEN 'Parent' || CASE WHEN COUNT(c.id) > 0 THEN ' (' || STRING_AGG(DISTINCT c.full_name, ', ') || ')' ELSE '' END
                           WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'learner' THEN 'Learner - Grade ' || COALESCE(MAX(c.grade)::text, 'N/A')
                           WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'teacher' THEN COALESCE(MAX(e.subjects[1]), 'Teacher') || ' Teacher'
                           ELSE 'School Admin'
                       END AS tag_name,
                       (
                           SELECT body FROM messages m 
                           WHERE (m.sender_id::text = $1::text AND m.recipient_id::text = u.id::text) OR (m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_message,
                       (
                           SELECT created_at FROM messages m 
                           WHERE (m.sender_id::text = $1::text AND m.recipient_id::text = u.id::text) OR (m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_activity,
                       (
                           SELECT COUNT(*) FROM messages m
                           WHERE m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text AND m.read_at IS NULL
                       ) AS unread_count
                FROM users u
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                LEFT JOIN employees e ON e.user_id::text = u.id::text
                LEFT JOIN children c ON (c.parent_id::text = u.id::text OR c.learner_user_id::text = u.id::text)
                WHERE u.id::text != $1::text AND (
                    LOWER(COALESCE(r.name, u.role_id::text, '')) IN ('admin', 'teacher', 'parent', 'learner')
                )
                GROUP BY u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name, u.role_id
                ORDER BY last_activity DESC NULLS LAST, u.full_name ASC;
            `;
        } else if (role === 'learner') {
            const gradeRes = await db.query('SELECT grade FROM children WHERE learner_user_id::text = $1::text', [userId]);
            const learnerGrade = gradeRes.rows[0]?.grade || null;

            query = `
                SELECT u.id, u.full_name, u.surname, u.email, u.profile_picture_path, COALESCE(r.name, u.role_id::text, 'learner') as role_name,
                       CASE 
                           WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'teacher' THEN COALESCE(MAX(e.subjects[1]), 'Teacher') || ' Teacher'
                           WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'learner' THEN 'Grade ' || COALESCE(MAX(c.grade)::text, 'N/A') || ' Learner'
                           ELSE 'School Admin'
                       END AS tag_name,
                       (
                           SELECT body FROM messages m 
                           WHERE (m.sender_id::text = $1::text AND m.recipient_id::text = u.id::text) OR (m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_message,
                       (
                           SELECT created_at FROM messages m 
                           WHERE (m.sender_id::text = $1::text AND m.recipient_id::text = u.id::text) OR (m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_activity,
                       (
                           SELECT COUNT(*) FROM messages m
                           WHERE m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text AND m.read_at IS NULL
                       ) AS unread_count
                FROM users u
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                LEFT JOIN employees e ON e.user_id::text = u.id::text
                LEFT JOIN children c ON c.learner_user_id::text = u.id::text
                WHERE u.id::text != $1::text AND (
                    LOWER(COALESCE(r.name, u.role_id::text, '')) = 'admin' 
                    OR (LOWER(COALESCE(r.name, u.role_id::text, '')) = 'learner' AND ($2::text IS NULL OR c.grade::text = $2::text))
                    OR (LOWER(COALESCE(r.name, u.role_id::text, '')) = 'teacher' AND ($2::int IS NULL OR $2::int = ANY(e.grades_taught) OR ARRAY_LENGTH(e.grades_taught, 1) IS NULL OR e.grades_taught = '{}'))
                )
                GROUP BY u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name, u.role_id
                ORDER BY last_activity DESC NULLS LAST, u.full_name ASC;
            `;
            params = [userId, learnerGrade ? String(learnerGrade) : null];
        } else if (role === 'parent') {
            query = `
                SELECT u.id, u.full_name, u.surname, u.email, u.profile_picture_path, COALESCE(r.name, u.role_id::text, 'teacher') as role_name,
                       CASE 
                           WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'teacher' THEN COALESCE(MAX(e.subjects[1]), 'Teacher') || ' Teacher'
                           ELSE 'School Admin'
                       END AS tag_name,
                       (
                           SELECT body FROM messages m 
                           WHERE (m.sender_id::text = $1::text AND m.recipient_id::text = u.id::text) OR (m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_message,
                       (
                           SELECT created_at FROM messages m 
                           WHERE (m.sender_id::text = $1::text AND m.recipient_id::text = u.id::text) OR (m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_activity,
                       (
                           SELECT COUNT(*) FROM messages m
                           WHERE m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text AND m.read_at IS NULL
                       ) AS unread_count
                FROM users u
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                LEFT JOIN employees e ON e.user_id::text = u.id::text
                WHERE u.id::text != $1::text AND (LOWER(COALESCE(r.name, u.role_id::text, '')) IN ('admin', 'teacher'))
                GROUP BY u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name, u.role_id
                ORDER BY last_activity DESC NULLS LAST, u.full_name ASC;
            `;
        } else {
            query = `
                SELECT u.id, u.full_name, u.surname, u.email, u.profile_picture_path, COALESCE(r.name, u.role_id::text, 'learner') as role_name,
                       CASE 
                           WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'teacher' THEN COALESCE(MAX(e.subjects[1]), 'Teacher') || ' Teacher'
                           WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'parent' THEN 'Parent'
                           WHEN LOWER(COALESCE(r.name, u.role_id::text, '')) = 'learner' THEN 'Learner'
                           ELSE 'School Admin'
                       END AS tag_name,
                       (
                           SELECT body FROM messages m 
                           WHERE (m.sender_id::text = $1::text AND m.recipient_id::text = u.id::text) OR (m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_message,
                       (
                           SELECT created_at FROM messages m 
                           WHERE (m.sender_id::text = $1::text AND m.recipient_id::text = u.id::text) OR (m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text)
                           ORDER BY created_at DESC LIMIT 1
                       ) AS last_activity,
                       (
                           SELECT COUNT(*) FROM messages m
                           WHERE m.sender_id::text = u.id::text AND m.recipient_id::text = $1::text AND m.read_at IS NULL
                       ) AS unread_count
                FROM users u
                LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                LEFT JOIN employees e ON e.user_id::text = u.id::text
                WHERE u.id::text != $1::text
                GROUP BY u.id, u.full_name, u.surname, u.email, u.profile_picture_path, r.name, u.role_id
                ORDER BY last_activity DESC NULLS LAST, u.full_name ASC;
            `;
        }

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching communication contacts:', err);
        res.status(500).json({ error: 'Failed to retrieve allowed contact list: ' + err.message });
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
            JOIN users sender ON m.sender_id::text = sender.id::text
            JOIN users recipient ON m.recipient_id::text = recipient.id::text
            WHERE (m.sender_id::text = $1::text AND m.recipient_id::text = $2::text)
               OR (m.sender_id::text = $2::text AND m.recipient_id::text = $1::text)
            ORDER BY m.id ASC, m.created_at ASC;
        `;
        const { rows } = await db.query(query, [userId, recipientId]);

        // Sort chronologically by timestamp
        rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        await db.query('UPDATE messages SET read_at = NOW() WHERE recipient_id::text = $1::text AND sender_id::text = $2::text AND read_at IS NULL', [userId, recipientId]);

        res.json(rows);
    } catch (err) {
        console.error('Error fetching conversation history:', err);
        res.status(500).json({ error: 'Failed to load conversation history: ' + err.message });
    }
};