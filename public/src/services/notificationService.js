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
            const userRes = await db.query(`
              SELECT u.id, u.email, u.full_name, u.surname, COALESCE(r.name, u.role_id::text, '') as role_name,
                     COALESCE(pu.email, pc_u.email) as parent_personal_email
              FROM users u 
              LEFT JOIN roles r ON (u.role_id = r.id OR u.role_id::text = r.name)
              LEFT JOIN children c ON (c.learner_user_id = u.id)
              LEFT JOIN users pu ON (c.parent_id = pu.id)
              LEFT JOIN parent_children pc ON (pc.child_id = c.id)
              LEFT JOIN users pc_u ON (pc.parent_id = pc_u.id)
              WHERE u.id = ANY($1::int[])
            `, [uniqueIds]);

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

            const deliveredEmails = new Set();

            for (const u of userRes.rows) {
              let targetEmail = (u.email || '').trim();

              // If this is a learner account with internal login address, route to their registered parent's email
              if (targetEmail.endsWith('@fusion.high') || targetEmail.endsWith('@fusionhigh.co.za')) {
                if (u.parent_personal_email && u.parent_personal_email.includes('@') && !u.parent_personal_email.endsWith('@fusion.high')) {
                  targetEmail = u.parent_personal_email.trim();
                } else {
                  continue;
                }
              }

              if (!targetEmail || !targetEmail.includes('@') || deliveredEmails.has(targetEmail.toLowerCase())) {
                continue;
              }

              deliveredEmails.add(targetEmail.toLowerCase());

              try {
                const recipientFullName = `${u.full_name || ''} ${u.surname || ''}`.trim() || 'School Community Member';
                const tpl = emailService.templates.schoolAnnouncement({
                  recipientName: recipientFullName,
                  title,
                  content: message,
                  authorName,
                  authorRole,
                  targetAudience: metadata.targetAudience || type || 'School Community'
                });
                await emailService.send(targetEmail, tpl.subject, tpl.body);
                console.log(`[ANNOUNCEMENT EMAIL DISPATCH] Delivered to ${targetEmail} (${recipientFullName})`);
              } catch (eErr) {
                console.warn(`[NOTIFICATION EMAIL DISPATCH ERROR] User ${targetEmail}:`, eErr.message);
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
          JOIN roles r ON (u.role_id = r.id OR u.role_id::text = r.name)
          WHERE LOWER(r.name) = 'teacher' OR u.role_id = 4
        `);
        teacherRes.rows.forEach(r => recipientUserIds.add(r.id));
      }

      // 2. Fetch targeted Parents if targetRole is 'all' or 'parent'
      if (normalizedRole === 'all' || normalizedRole === 'parent' || includeParents) {
        if (grade || (stream && stream !== 'All' && stream !== 'General') || classId) {
          const parentQuery = `
            SELECT DISTINCT c.parent_id, c.secondary_parent_id, pc.parent_id as junction_parent_id
            FROM children c
            LEFT JOIN parent_children pc ON pc.child_id = c.id
            WHERE 1=1
              ${grade ? `AND c.grade = ${parseInt(grade, 10)}` : ''}
              ${stream && stream !== 'All' && stream !== 'General' ? `AND (c.stream = '${stream}' OR c.stream IS NULL OR c.stream = 'General')` : ''}
              ${classId ? `AND c.class_id = ${parseInt(classId, 10)}` : ''}
          `;
          const parentRes = await db.query(parentQuery);
          parentRes.rows.forEach(r => {
            if (r.parent_id) recipientUserIds.add(r.parent_id);
            if (r.secondary_parent_id) recipientUserIds.add(r.secondary_parent_id);
            if (r.junction_parent_id) recipientUserIds.add(r.junction_parent_id);
          });
        } else if (normalizedRole === 'parent' || normalizedRole === 'all') {
          const allParents = await db.query(`
            SELECT u.id 
            FROM users u 
            JOIN roles r ON (u.role_id = r.id OR u.role_id::text = r.name)
            WHERE LOWER(r.name) = 'parent' OR u.role_id = 2
          `);
          allParents.rows.forEach(r => recipientUserIds.add(r.id));
        }
      }

      // 3. Fetch targeted Learners if targetRole is 'all' or 'learner'
      if (normalizedRole === 'all' || normalizedRole === 'learner') {
        let learnerQuery = `
          SELECT DISTINCT c.learner_user_id AS user_id, c.id
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
        matchedLearners.forEach(l => {
          if (l.user_id) recipientUserIds.add(l.user_id);
        });

        if (matchedLearners.length === 0 && !grade && !stream) {
          const allLearners = await db.query(`
            SELECT u.id 
            FROM users u 
            JOIN roles r ON (u.role_id = r.id OR u.role_id::text = r.name)
            WHERE LOWER(r.name) = 'learner' OR u.role_id = 3
          `);
          allLearners.rows.forEach(r => recipientUserIds.add(r.id));
        }
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
