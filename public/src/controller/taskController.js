const pool = require('../../../db/db');

const getLearnerDashboardTasks = async (req, res) => {
    const learnerId = req.user.id;

    try {
        // Resolve learner child_id if learner user
        const childRes = await pool.query(
            'SELECT id, grade FROM children WHERE learner_user_id = $1 LIMIT 1',
            [learnerId]
        );
        const childId = childRes.rows.length > 0 ? childRes.rows[0].id : null;
        const learnerGrade = childRes.rows.length > 0 ? childRes.rows[0].grade : 10;

        const query = `
            SELECT 
                a.id,
                a.title,
                a.description,
                a.subject,
                a.due_date,
                a.max_marks,
                CASE 
                    WHEN hs.id IS NOT NULL THEN true 
                    ELSE false 
                END as is_submitted,
                hs.submitted_at,
                hs.obtained_marks,
                hs.ai_score,
                hs.status as submission_status
            FROM assignments a
            LEFT JOIN homework_submissions hs ON a.id = hs.assignment_id AND (hs.learner_id = $1 OR hs.child_id = $2)
            WHERE a.grade = $3 OR a.grade IS NULL
            ORDER BY a.due_date ASC NULLS LAST, a.id DESC
            LIMIT 50;
        `;
        
        const { rows } = await pool.query(query, [learnerId, childId, learnerGrade]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const submitTask = async (req, res) => {
    const { taskId, content, assignmentId } = req.body;
    const resolvedAssignmentId = assignmentId || taskId;
    const learnerId = req.user.id;

    try {
        const childRes = await pool.query(
            'SELECT id FROM children WHERE learner_user_id = $1 LIMIT 1',
            [learnerId]
        );
        const childId = childRes.rows.length > 0 ? childRes.rows[0].id : null;

        await pool.query(
            `INSERT INTO homework_submissions (assignment_id, learner_id, child_id, submission_text, status, submitted_at)
             VALUES ($1, $2, $3, $4, 'submitted', CURRENT_TIMESTAMP)
             ON CONFLICT (assignment_id, learner_id) 
             DO UPDATE SET submission_text = EXCLUDED.submission_text, status = 'submitted', submitted_at = CURRENT_TIMESTAMP`,
            [resolvedAssignmentId, learnerId, childId, content || 'Task attempted']
        );
        res.status(200).json({ message: 'Task submitted successfully' });
    } catch (error) {
        console.error('Error submitting task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { getLearnerDashboardTasks, submitTask };