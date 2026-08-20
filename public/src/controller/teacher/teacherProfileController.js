const db = require('../../../../db/db');

exports.getTeacherProfileDetails = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const userRes = await db.query(
            `SELECT u.id, u.full_name, u.surname, u.email, u.phone, u.physical_address,
                    CONCAT('EMP-', e.id) as employee_number, e.subjects, e.grades_taught, e.classes_taught, e.hired_date
             FROM users u
             LEFT JOIN employees e ON u.id = e.user_id
             WHERE u.id = $1`,
            [teacherId]
        );
        res.json(userRes.rows[0] || {});
    } catch (err) {
        console.error('Error fetching teacher profile:', err);
        res.status(500).json({ error: 'Failed to retrieve profile details.' });
    }
};

exports.updateTeacherProfileDetails = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { full_name, surname, phone, physical_address } = req.body;

        await db.query(
            `UPDATE users SET full_name = $1, surname = $2, phone = $3, physical_address = $4 WHERE id = $5`,
            [full_name, surname, phone, physical_address, teacherId]
        );
        res.json({ message: 'Profile updated successfully.' });
    } catch (err) {
        console.error('Error updating teacher profile:', err);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
};
