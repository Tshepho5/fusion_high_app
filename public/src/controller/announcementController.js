const db = require('../../../db/db');
const NotificationService = require('../services/notificationService');

exports.createAnnouncement = async (req, res) => {
    const { title, content, role_target = 'all', grade_target, stream_target, subject_target } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target, subject_target) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [title, content, role_target, req.user.id, grade_target, stream_target, subject_target]
        );

        // Fetch author name for notice preview
        const authorRes = await db.query('SELECT full_name, surname FROM users WHERE id = $1', [req.user.id]);
        const authorName = authorRes.rows[0] ? `${authorRes.rows[0].full_name} ${authorRes.rows[0].surname || ''}`.trim() : 'School Administration';

        // Dispatch targeted notification
        NotificationService.sendTargeted({
            targetRole: role_target === 'all' ? 'learner' : role_target,
            grade: grade_target,
            stream: stream_target,
            subject: subject_target,
            includeParents: true,
            title: `Announcement: ${title}`,
            message: `${authorName}: ${content ? (content.length > 120 ? content.substring(0, 117) + '...' : content) : 'New school announcement published.'}`,
            type: 'announcement',
            targetTab: 'announcements',
            metadata: { announcement_id: result.rows[0].id }
        }).catch(err => console.error('[ANNOUNCEMENT NOTIFICATION ERROR]', err));

        res.json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getAnnouncements = async (req, res) => {
    try {
        let result;
        if (req.user.role === 'learner') {
            const learnerRes = await db.query('SELECT grade, stream, subjects FROM children WHERE learner_user_id = $1', [req.user.id]);
            if (learnerRes.rows.length === 0) return res.status(404).json({ error: 'Learner profile not found' });
            const { grade, stream, subjects } = learnerRes.rows[0];

            result = await db.query(
                `SELECT * FROM announcements 
         WHERE (role_target = 'learner' OR role_target = 'all')
         AND (grade_target IS NULL OR grade_target = $1)
         AND (stream_target IS NULL OR stream_target = $2 OR stream_target = 'General')
         AND (subject_target IS NULL OR subject_target = ANY($3::text[]))
         ORDER BY created_at DESC`,
                [grade, stream, subjects]);
        } else {
            const role_filter = req.query.role_target || req.user.role;
            // Corrected query to fetch announcements for the specific role OR for 'all'
            result = await db.query(
                `SELECT * FROM announcements WHERE role_target = $1 OR role_target = 'all' ORDER BY created_at DESC`,
                [role_filter]
            );
        }
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM announcements WHERE id = $1', [id]);
        res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};