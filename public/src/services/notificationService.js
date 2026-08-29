const db = require('../../../db/db');
const emailService = require('./emailService');

/**
 * Service for managing user notifications and dispatching targeted school alerts.
 */
class NotificationService {
  /**
   * Initializes notifications database schema and index constraints.
   */
  static async initSchema() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'announcement',
          target_tab VARCHAR(50) DEFAULT 'announcements',
          metadata JSONB DEFAULT '{}'::jsonb,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(255);
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link_url VARCHAR(255);
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_tab VARCHAR(50) DEFAULT 'announcements';
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

        CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

        -- Ensure textbooks table exists before adding columns
        CREATE TABLE IF NOT EXISTS textbooks (
          id SERIAL PRIMARY KEY,
          grade INT,
          subject_id INT,
          title VARCHAR(255),
          file_path TEXT,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Enhance textbooks/resources table with metadata columns
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50) DEFAULT 'textbook';
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS title VARCHAR(255);
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS term VARCHAR(50);
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2026;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS stream VARCHAR(50);
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS class_id INTEGER;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS file_size VARCHAR(50);
      `);
      console.log('[NOTIFICATION SERVICE] Notifications table and schema verified.');
    } catch (err) {
      console.warn('[NOTIFICATION SERVICE] Schema init notice:', err.message);
    }
  }

  /**
   * Dispatches a notification to specific user IDs.
   * Optionally records in messages table and sends direct emails.
   */
  static async sendToUsers({ userIds, title, message, type = 'announcement', targetTab = 'announcements', metadata = {}, authorId = 1, sendToMessages = false, sendEmail = false }) {
    if (!userIds || userIds.length === 0) return 0;
    
    // De-duplicate user IDs
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return 0;

    try {
      const values = [];
      const placeholders = uniqueIds.map((uid, index) => {
        const offset = index * 6;
        values.push(uid, title, message, type, targetTab, JSON.stringify(metadata));
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}::jsonb)`;
      }).join(', ');

      const query = `
        INSERT INTO notifications (user_id, title, message, type, target_tab, metadata)
        VALUES ${placeholders}
        RETURNING id;
      `;
      const result = await db.query(query, values);

      // Optionally insert into in-app messages table so it appears in recipient's message center
      if (sendToMessages) {
        try {
          const validUsersRes = await db.query('SELECT id FROM users WHERE id = ANY($1::int[])', [uniqueIds]);
          const validUserIds = validUsersRes.rows.map(r => r.id);

          let validSenderId = authorId || 1;
          const senderCheck = await db.query('SELECT id FROM users WHERE id = $1', [validSenderId]);
          if (senderCheck.rows.length === 0) {
            const adminUserRes = await db.query('SELECT id FROM users WHERE role_id = 1 LIMIT 1');
            validSenderId = adminUserRes.rows[0]?.id || 1;
          }

          if (validUserIds.length > 0) {
            const msgValues = [];
            const msgPlaceholders = validUserIds.map((uid, index) => {
              const offset = index * 4;
              msgValues.push(validSenderId, uid, title, message);
              return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 4}, NOW())`;
            }).join(', ');

            await db.query(`
              INSERT INTO messages (sender_id, recipient_id, subject, body, content, created_at)
              VALUES ${msgPlaceholders}
            `, msgValues);
          }
        } catch (msgErr) {
          console.warn('[NOTIFICATION SERVICE] In-app message sync warning:', msgErr.message);
        }
      }

      // Optionally dispatch direct emails to target users
      if (sendEmail) {
        setImmediate(async () => {
          try {
            const userRes = await db.query(
              'SELECT id, email, full_name, surname FROM users WHERE id = ANY($1::int[]) AND email IS NOT NULL AND email != \'\'',
              [uniqueIds]
            );

            // Fetch author details
            let authorName = 'School Administration';
            let authorRole = 'Principal Office';
            if (authorId) {
              const authRes = await db.query(
                'SELECT u.full_name, u.surname, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
                [authorId]
              );
              if (authRes.rows[0]) {
                authorName = `${authRes.rows[0].full_name} ${authRes.rows[0].surname || ''}`.trim();
                authorRole = authRes.rows[0].role_name || 'Administration';
              }
            }

            for (const u of userRes.rows) {
              try {
                const recipientFullName = `${u.full_name || ''} ${u.surname || ''}`.trim() || 'User';
                const tpl = emailService.templates.schoolAnnouncement({
                  recipientName: recipientFullName,
                  title,
                  content: message,
                  authorName,
                  authorRole,
                  targetAudience: metadata.targetAudience || type || 'School Community'
                });
                await emailService.send(u.email, tpl.subject, tpl.body);
              } catch (eErr) {
                console.warn(`[NOTIFICATION EMAIL DISPATCH ERROR] User ${u.email}:`, eErr.message);
              }
            }
          } catch (batchErr) {
            console.warn('[NOTIFICATION EMAIL BATCH ERROR]:', batchErr.message);
          }
        });
      }

      return result.rowCount;
    } catch (err) {
      console.error('[NOTIFICATION SERVICE] Error dispatching to users:', err);
      return 0;
    }
  }

  /**
   * Dispatches targeted notifications based on Grade, Subject, Stream, or Role.
   * Synchronously writes to notifications and messages, and asynchronously emails recipients.
   */
  static async sendTargeted({
    targetRole = 'all',
    grade,
    stream,
    subject,
    classId,
    includeParents = true,
    title,
    message,
    fullContent,
    type = 'announcement',
    targetTab = 'announcements',
    authorId = 1,
    sendToMessages = true,
    sendEmail = true,
    metadata = {}
  }) {
    try {
      let recipientUserIds = new Set();
      const normalizedRole = (targetRole || 'all').toLowerCase();

      // 1. Fetch Teachers if targetRole is 'all' or 'teacher'
      if (normalizedRole === 'all' || normalizedRole === 'teacher') {
        const teacherRes = await db.query(`
          SELECT u.id 
          FROM users u 
          JOIN roles r ON u.role_id = r.id 
          WHERE r.name = 'teacher'
        `);
        teacherRes.rows.forEach(r => recipientUserIds.add(r.id));
      }

      // 2. Fetch targeted Learners if targetRole is 'all', 'learner', or 'parent'
      if (normalizedRole === 'all' || normalizedRole === 'learner' || normalizedRole === 'parent') {
        let learnerQuery = `
          SELECT DISTINCT c.learner_user_id AS user_id, c.parent_id
          FROM children c
          WHERE 1=1
        `;
        const params = [];

        if (grade) {
          params.push(parseInt(grade, 10));
          learnerQuery += ` AND c.grade = $${params.length}`;
        }
        if (stream && stream !== 'All' && stream !== 'General') {
          params.push(stream);
          learnerQuery += ` AND (c.stream = $${params.length} OR c.stream IS NULL OR c.stream = 'General')`;
        }
        if (classId) {
          params.push(parseInt(classId, 10));
          learnerQuery += ` AND c.class_id = $${params.length}`;
        }

        const { rows: matchedLearners } = await db.query(learnerQuery, params);

        for (const learner of matchedLearners) {
          if ((normalizedRole === 'all' || normalizedRole === 'learner') && learner.user_id) {
            recipientUserIds.add(learner.user_id);
          }
          if ((normalizedRole === 'all' || normalizedRole === 'parent' || includeParents) && learner.parent_id) {
            recipientUserIds.add(learner.parent_id);
          }
        }

        // Also find parents linked via parent_children table
        if ((normalizedRole === 'all' || normalizedRole === 'parent' || includeParents) && matchedLearners.length > 0) {
          const childUserIds = matchedLearners.map(m => m.user_id).filter(Boolean);
          if (childUserIds.length > 0) {
            const parentRes = await db.query(`
              SELECT DISTINCT pc.parent_id 
              FROM parent_children pc
              JOIN children c ON pc.child_id = c.id
              WHERE c.learner_user_id = ANY($1::int[])
            `, [childUserIds]);
            parentRes.rows.forEach(r => recipientUserIds.add(r.parent_id));
          }
        }
      }

      // 3. Fallback to all parents if parent role chosen and none linked via children table yet
      if (normalizedRole === 'parent' && recipientUserIds.size === 0) {
        const pRes = await db.query(`
          SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'parent' LIMIT 100
        `);
        pRes.rows.forEach(r => recipientUserIds.add(r.id));
      }

      // Fallback for learners
      if (normalizedRole === 'learner' && recipientUserIds.size === 0) {
        const lRes = await db.query(`
          SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'learner' LIMIT 100
        `);
        lRes.rows.forEach(r => recipientUserIds.add(r.id));
      }

      const finalUserIds = Array.from(recipientUserIds);
      const dispatchedCount = await this.sendToUsers({
        userIds: finalUserIds,
        title,
        message: fullContent || message,
        type,
        targetTab,
        authorId,
        sendToMessages,
        sendEmail,
        metadata: {
          ...metadata,
          targetAudience: normalizedRole,
          subject,
          grade,
          stream,
          dispatchedAt: new Date().toISOString()
        }
      });

      return { success: true, count: dispatchedCount, recipients: finalUserIds.length };
    } catch (err) {
      console.error('[NOTIFICATION SERVICE] sendTargeted error:', err);
      return { success: false, error: err.message, count: 0 };
    }
  }

  /**
   * Retrieves notifications for a specific user.
   */
  static async getUserNotifications(userId, limit = 30) {
    const result = await db.query(`
      SELECT id, title, message, type, target_tab, metadata, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  /**
   * Gets unread notifications count for a user.
   */
  static async getUnreadCount(userId) {
    const result = await db.query(`
      SELECT COUNT(*)::int AS unread_count
      FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
    `, [userId]);
    return result.rows[0]?.unread_count || 0;
  }

  /**
   * Marks a specific notification as read.
   */
  static async markAsRead(notificationId, userId) {
    const result = await db.query(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING id, is_read
    `, [notificationId, userId]);
    return result.rowCount > 0;
  }

  /**
   * Marks all notifications as read for a user.
   */
  static async markAllAsRead(userId) {
    const result = await db.query(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE
      RETURNING id
    `, [userId]);
    return result.rowCount;
  }
}

module.exports = NotificationService;
