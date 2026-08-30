const db = require('../../../db/db');
const NotificationService = require('../services/notificationService');

exports.createAnnouncement = async (req, res) => {
    const { title, content, role_target = 'all', grade_target, stream_target, subject_target, priority = 'Normal' } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target, subject_target) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [title, content, role_target, req.user.id, grade_target, stream_target, subject_target]
        );

        // Fetch author name for notice preview
        const authorRes = await db.query('SELECT full_name, surname FROM users WHERE id = $1', [req.user.id]);
        const authorName = authorRes.rows[0] ? `${authorRes.rows[0].full_name} ${authorRes.rows[0].surname || ''}`.trim() : 'School Administration';

        const displayTitle = priority === 'Urgent' ? `[URGENT] ${title}` : title;

        // Dispatch targeted notification to in-app notifications, messages inbox, and direct email broadcast
        NotificationService.sendTargeted({
            targetRole: role_target || 'all',
            grade: grade_target,
            stream: stream_target,
            subject: subject_target,
            includeParents: true,
            authorId: req.user.id,
            title: displayTitle,
            message: `${authorName}: ${content ? (content.length > 120 ? content.substring(0, 117) + '...' : content) : 'New school announcement published.'}`,
            fullContent: content,
            type: 'announcement',
            targetTab: 'announcements',
            sendToMessages: true,
            sendEmail: true,
            metadata: { 
                announcement_id: result.rows[0].id,
                targetAudience: role_target === 'all' ? 'All Portals' : (role_target === 'parent' ? 'Parents' : (role_target === 'learner' ? 'Learners' : 'Teachers'))
            }
        }).catch(err => console.error('[ANNOUNCEMENT NOTIFICATION ERROR]', err));

        res.json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getAnnouncements = async (req, res) => {
    try {
        const userRole = (req.user?.role || '').toLowerCase();
        const userId = req.user?.id;

        // Auto-seed default school notices if table is empty
        const countRes = await db.query('SELECT COUNT(*) FROM announcements');
        if (parseInt(countRes.rows[0].count, 10) === 0) {
            await db.query(`
                INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target, created_at)
                VALUES
                  ('Term 3 Academic Assessment Schedule & SBA Guidelines', 'All learners and parents are reminded that formal Term 3 CAPS assessments commence next week. Please consult your timetable and subject study guides.', 'all', $1, NULL, 'General', NOW() - INTERVAL '2 days'),
                  ('Parent-Teacher Consultations & Academic Progress Review', 'Term 3 PTC booking slots are now open in the Parent Portal. Please book a 15-minute slot with your child subject educators.', 'parent', $1, NULL, 'General', NOW() - INTERVAL '1 day'),
                  ('National Senior Certificate (NSFAS & Tertiary Bursaries)', 'Grade 12 matriculants are encouraged to view the Bursary & Scholarship Matching Hub to track open higher education funding opportunities.', 'learner', $1, 12, 'General', NOW())
            `, [userId || null]);
        }

        let query = `
            SELECT 
                a.id, 
                a.title, 
                a.content, 
                a.role_target, 
                a.grade_target, 
                a.stream_target, 
                a.subject_target,
                a.created_at,
                COALESCE(CONCAT(u.full_name, ' ', u.surname), 'School Administration') AS author_name
            FROM announcements a
            LEFT JOIN users u ON a.author_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (userRole === 'admin') {
            // Admins see all announcements
            query += ` ORDER BY a.created_at DESC`;
            const { rows } = await db.query(query, params);
            return res.json(rows);
        }

        if (userRole === 'learner') {
            const learnerRes = await db.query(
                'SELECT grade, stream, subjects FROM children WHERE learner_user_id = $1 OR id = $1 LIMIT 1',
                [userId]
            );
            const learner = learnerRes.rows[0];
            const gradeVal = learner?.grade || null;
            const streamVal = learner?.stream || null;

            query += ` AND (a.role_target IN ('learner', 'all') OR a.role_target IS NULL)`;
            if (gradeVal) {
                params.push(gradeVal);
                query += ` AND (a.grade_target IS NULL OR a.grade_target = $${params.length})`;
            }
            if (streamVal && streamVal !== 'General' && streamVal !== 'All') {
                params.push(streamVal);
                query += ` AND (a.stream_target IS NULL OR a.stream_target = 'General' OR a.stream_target = 'All' OR a.stream_target = $${params.length})`;
            }
        } else if (userRole === 'parent') {
            const childrenRes = await db.query(`
                SELECT DISTINCT c.grade 
                FROM children c
                LEFT JOIN parent_children pc ON pc.child_id = c.id
                WHERE c.parent_id = $1 OR c.secondary_parent_id = $1 OR pc.parent_id = $1
            `, [userId]);
            const parentGrades = childrenRes.rows.map(r => r.grade).filter(Boolean);

            if (parentGrades.length > 0) {
                params.push(parentGrades);
                const pGrades = `$${params.length}`;
                query += ` AND (a.role_target IN ('parent', 'all') OR (a.role_target = 'learner' AND (a.grade_target IS NULL OR a.grade_target = ANY(${pGrades}::int[]))) OR a.role_target IS NULL)`;
            } else {
                query += ` AND (a.role_target IN ('parent', 'all', 'learner') OR a.role_target IS NULL)`;
            }
        } else if (userRole === 'teacher') {
            const empRes = await db.query(
                'SELECT grades_taught FROM employees WHERE user_id = $1 LIMIT 1',
                [userId]
            );
            const emp = empRes.rows[0];
            const grades = emp?.grades_taught || [];

            query += ` AND (a.role_target IN ('teacher', 'all') OR a.role_target IS NULL)`;
            if (grades.length > 0) {
                params.push(grades);
                const pGrades = `$${params.length}`;
                query += ` AND (a.grade_target IS NULL OR a.grade_target = ANY(${pGrades}::int[]))`;
            }
        } else {
            query += ` AND (a.role_target = 'all' OR a.role_target IS NULL)`;
        }

        query += ` ORDER BY a.created_at DESC`;
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching announcements:', err);
        res.status(500).json({ error: 'Failed to retrieve announcements: ' + err.message });
    }
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