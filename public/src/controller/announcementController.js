const db = require('../../../db/db');
const { db: firestore } = require('../../../db/firebase');
const NotificationService = require('../services/notificationService');
const { resolveSchoolId } = require('../services/schoolScope');

exports.createAnnouncement = async (req, res) => {
    const { title, content, role_target = 'all', grade_target, stream_target, subject_target, priority = 'Normal' } = req.body;
    const schoolId = resolveSchoolId(req);
    if (!Number.isInteger(schoolId)) {
        return res.status(403).json({ error: 'This account is not linked to a school.' });
    }
    try {
        const result = await db.query(
            `INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target, subject_target, school_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [title, content, role_target, req.user.id, grade_target, stream_target, subject_target, schoolId]
        );

        // Fetch author name for notice preview
        const authorRes = await db.query('SELECT full_name, surname FROM users WHERE id = $1', [req.user.id]);
        const authorName = authorRes.rows[0] ? `${authorRes.rows[0].full_name} ${authorRes.rows[0].surname || ''}`.trim() : 'School Administration';

        const displayTitle = priority === 'Urgent' ? `[URGENT] ${title}` : title;

        // Mirror announcement to Firebase Cloud Firestore for real-time live feed
        if (firestore) {
            setImmediate(async () => {
                try {
                    await firestore.collection('announcements').doc(String(result.rows[0].id)).set({
                        id: result.rows[0].id,
                        title,
                        content,
                        role_target: role_target || 'all',
                        grade_target: grade_target || null,
                        stream_target: stream_target || null,
                        subject_target: subject_target || null,
                        priority: priority || 'Normal',
                        author_name: authorName,
                        author_id: req.user.id,
                        created_at: new Date()
                    });
                } catch (fbAnnErr) {
                    console.warn('[FIREBASE ANNOUNCEMENT SYNC WARNING]:', fbAnnErr.message);
                }
            });
        }

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
            sendToMessages: false,
            sendEmail: false,
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
        const schoolId = resolveSchoolId(req);
        if (!Number.isInteger(schoolId)) {
            return res.status(403).json({ error: 'This account is not linked to a school.' });
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
            LEFT JOIN users u ON a.author_id::text = u.id::text
            WHERE a.school_id = $1
        `;
        const params = [schoolId];

        if (userRole === 'admin') {
            // Admins see all announcements
            query += ` ORDER BY a.created_at DESC`;
            const { rows } = await db.query(query, params);
            return res.json(rows);
        }

        if (userRole === 'learner') {
            const learnerRes = await db.query(
                'SELECT grade, stream, subjects FROM children WHERE learner_user_id::text = $1::text OR id::text = $1::text LIMIT 1',
                [String(userId)]
            );
            const learner = learnerRes.rows[0];
            const gradeVal = learner?.grade || null;
            const streamVal = learner?.stream || null;

            query += ` AND (a.role_target IN ('learner', 'all') OR a.role_target IS NULL)`;
            if (gradeVal) {
                params.push(String(gradeVal));
                query += ` AND (a.grade_target IS NULL OR a.grade_target::text = $${params.length}::text)`;
            }
            if (streamVal && streamVal !== 'General' && streamVal !== 'All') {
                params.push(streamVal);
                query += ` AND (a.stream_target IS NULL OR a.stream_target = 'General' OR a.stream_target = 'All' OR a.stream_target ILIKE $${params.length})`;
            }
        } else if (userRole === 'parent') {
            const childrenRes = await db.query(`
                SELECT DISTINCT c.grade 
                FROM children c
                LEFT JOIN parent_children pc ON pc.child_id::text = c.id::text
                WHERE c.parent_id::text = $1::text OR c.secondary_parent_id::text = $1::text OR pc.parent_id::text = $1::text
            `, [String(userId)]);
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
                'SELECT grades_taught FROM employees WHERE user_id::text = $1::text LIMIT 1',
                [String(userId)]
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
        const schoolId = resolveSchoolId(req);
        if (!Number.isInteger(schoolId)) {
            return res.status(403).json({ error: 'This account is not linked to a school.' });
        }
        const { id } = req.params;
        const result = await db.query('DELETE FROM announcements WHERE id = $1 AND school_id = $2', [id, schoolId]);
        if (!result.rowCount) {
            return res.status(404).json({ error: 'Notice not found for this school.' });
        }
        res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};