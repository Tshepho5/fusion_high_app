const db = require('../../../../db/db');

/**
 * Retrieves a list of all teachers for lookup purposes.
 */
exports.getAllTeachers = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT u.id, u.full_name, u.surname, u.email, u.phone, e.subjects, e.grades_taught, e.classes_taught 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             LEFT JOIN employees e ON e.user_id = u.id 
             WHERE r.name = 'teacher'`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Retrieves a list of users by a specific role name for messaging recipients.
 */
exports.getRecipientsByRole = async (req, res) => {
    try {
        const { role } = req.params;
        const { rows } = await db.query(
            `SELECT u.id, u.full_name, u.surname, u.email FROM users u JOIN roles r ON u.role_id = r.id WHERE LOWER(r.name) = LOWER($1)`,
            [role]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};