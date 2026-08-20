const express = require('express');
const router = express.Router();
const db = require('../../../db/db');

/**
 * GET /api/schedule/my-schedule
 * Gets the full weekly schedule for the logged-in user (teacher or learner)
 * from the single active timetable in the database.
 */
router.get('/my-schedule', async (req, res) => {
    try {
        // 1. Fetch the single active timetable
        const timetableRes = await db.query('SELECT id, name, timetable_data FROM timetables WHERE is_active = TRUE LIMIT 1');
        if (timetableRes.rows.length === 0) {
            return res.status(404).json({ error: 'No active timetable has been published.' });
        }
        const { id: timetableId, name: timetableName, timetable_data: fullTimetable } = timetableRes.rows[0];
        let userSchedule = {};
        const userRole = req.user.role;

        // 2. Filter the timetable based on user role
        if (userRole === 'learner') {
            const learnerRes = await db.query('SELECT cl.name as class_name FROM children c JOIN classes cl ON c.class_id = cl.id WHERE c.learner_user_id = $1', [req.user.id]);
            if (learnerRes.rows.length === 0) {
                return res.status(404).json({ error: 'Learner class not found.' });
            }
            const className = learnerRes.rows[0].class_name;
            userSchedule = fullTimetable[className] || {};

        } else if (userRole === 'teacher') {
            const userRes = await db.query(
                'SELECT u.full_name, u.surname, e.subjects FROM users u LEFT JOIN employees e ON u.id = e.user_id WHERE u.id = $1',
                [req.user.id]
            );
            const userRow = userRes.rows[0] || {};
            const teacherFullName = `${userRow.full_name || ''} ${userRow.surname || ''}`.trim();
            const teacherFirstName = userRow.full_name || '';
            const teacherSubjects = userRow.subjects || [];

            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
            days.forEach(day => userSchedule[day] = {});

            for (const className in fullTimetable) {
                for (const day in fullTimetable[className]) {
                    if (!userSchedule[day]) userSchedule[day] = {};
                    for (const period in fullTimetable[className][day]) {
                        const entry = fullTimetable[className][day][period];
                        if (entry) {
                            const isMatch = (entry.teacher && (
                                entry.teacher === teacherFullName || 
                                entry.teacher === teacherFirstName || 
                                entry.teacher.toLowerCase().includes(teacherFirstName.toLowerCase())
                            )) || (teacherSubjects.includes(entry.subject));
                            
                            if (isMatch) {
                                userSchedule[day][period] = {
                                    subject: entry.subject,
                                    class: className
                                };
                            }
                        }
                    }
                }
            }
        } else {
            return res.status(403).json({ error: 'Your role does not have a schedule.' });
        }

        res.json({
            id: timetableId,
            name: timetableName,
            schedule: userSchedule
        });

    } catch (err) {
        console.error("Error fetching user schedule:", err.message);
        res.status(500).json({ error: 'Failed to retrieve your schedule.' });
    }
});

module.exports = router;
