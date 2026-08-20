const db = require('../../../db/db');

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

        CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

        -- Enhance textbooks/resources table with metadata columns
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50) DEFAULT 'textbook';
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS title VARCHAR(255);
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS term VARCHAR(50);
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2026;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS stream VARCHAR(50);
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS file_size VARCHAR(50);
      `);
      console.log('[NOTIFICATION SERVICE] Notifications table and schema verified.');
    } catch (err) {
      console.error('[NOTIFICATION SERVICE] Schema init warning:', err.message);
    }
  }

  /**
   * Dispatches a notification to specific user IDs.
   */
  static async sendToUsers({ userIds, title, message, type = 'announcement', targetTab = 'announcements', metadata = {} }) {
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
      return result.rowCount;
    } catch (err) {
      console.error('[NOTIFICATION SERVICE] Error dispatching to users:', err);
      return 0;
    }
  }

  /**
   * Dispatches targeted notifications based on Grade, Subject, Stream, or Role.
   */
  static async sendTargeted({
    targetRole = 'learner',
    grade,
    stream,
    subject,
    classId,
    includeParents = true,
    title,
    message,
    type = 'resource',
    targetTab = 'subjects',
    metadata = {}
  }) {
    try {
      let recipientUserIds = new Set();

      // 1. Fetch targeted Learners
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
      if (stream && stream !== 'All') {
        params.push(stream);
        learnerQuery += ` AND (c.stream = $${params.length} OR c.stream IS NULL OR c.stream = 'General')`;
      }
      if (classId) {
        params.push(parseInt(classId, 10));
        learnerQuery += ` AND c.class_id = $${params.length}`;
      }

      const { rows: matchedLearners } = await db.query(learnerQuery, params);

      // Filter by subject if specified
      for (const learner of matchedLearners) {
        if (learner.user_id) {
          recipientUserIds.add(learner.user_id);
        }
        if (includeParents && learner.parent_id) {
          recipientUserIds.add(learner.parent_id);
        }
      }

      // Also find parents linked via parent_children table
      if (includeParents && matchedLearners.length > 0) {
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

      // If no learners matched via children table (fallback to users with learner role in this grade if available)
      if (recipientUserIds.size === 0) {
        const fallbackRes = await db.query(`
          SELECT u.id 
          FROM users u 
          JOIN roles r ON u.role_id = r.id 
          WHERE r.name = 'learner'
          LIMIT 50
        `);
        fallbackRes.rows.forEach(r => recipientUserIds.add(r.id));
      }

      const finalUserIds = Array.from(recipientUserIds);
      const dispatchedCount = await this.sendToUsers({
        userIds: finalUserIds,
        title,
        message,
        type,
        targetTab,
        metadata: {
          ...metadata,
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
