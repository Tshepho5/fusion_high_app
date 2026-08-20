const pool = require('../../../db/db'); // Points to the single source of truth in the db folder

const getLearnerDashboardTasks = async (req, res) => {
    const learnerId = req.user.id; // Assuming ID comes from your JWT/Auth middleware

    try {
        const query = `
            SELECT 
                t.*, 
                CASE 
                    WHEN s.id IS NOT NULL THEN true 
                    ELSE false 
                END as is_submitted
            FROM tasks t
            LEFT JOIN submissions s ON t.id = s.task_id AND s.learner_id = $1
            ORDER BY t.due_date ASC;
        `;
        
        const { rows } = await pool.query(query, [learnerId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const submitTask = async (req, res) => {
    const { taskId, content } = req.body;
    const learnerId = req.user.id;

    try {
        await pool.query(
            'INSERT INTO submissions (task_id, learner_id, content) VALUES ($1, $2, $3) ON CONFLICT (task_id, learner_id) DO UPDATE SET content = $3, submitted_at = CURRENT_TIMESTAMP',
            [taskId, learnerId, content || 'Task attempted']
        );
        res.status(200).json({ message: 'Task submitted successfully' });
    } catch (error) {
        console.error('Error submitting task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { getLearnerDashboardTasks, submitTask };