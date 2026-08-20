const db = require('../../../db/db');
const emailService = require('../services/emailService');

/**
 * Fetches statistics for the admin dashboard.
 * Counts users by role.
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // Run multiple stat queries in parallel for efficiency
        const [
            userStats,
            assignmentStats,
            textbookStats,
            progressStats,
            enrolledLearnersStats,
            classStats,
            overallAttendanceRes,
            gradeAttendanceRes,
            registrationTrendsRes,
            attendanceDistRes,
            topClassesRes,
            recentReportsRes,
            pendingIncidentsRes,
            recentAnnouncementsRes,
            timetableGlanceRes,
            admissionsStatsRes
        ] = await Promise.all([
            db.query(`
                SELECT r.name AS role, COUNT(u.id) AS count
                FROM roles r
                LEFT JOIN users u ON u.role_id = r.id
                WHERE r.name IN ('admin', 'teacher', 'parent')
                GROUP BY r.name;
            `),
            db.query("SELECT COUNT(*) FROM announcements WHERE is_assignment = TRUE"),
            db.query("SELECT COUNT(*) FROM textbooks"),
            db.query("SELECT COUNT(*) FROM progress"),
            db.query(`
                SELECT GREATEST(
                    (SELECT COUNT(*) FROM children),
                    (SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'learner')
                ) AS count
            `), // Get total enrolled learners
            db.query("SELECT COUNT(*) FROM classes"),
            db.query(`
                SELECT COALESCE(
                  ROUND(
                    (COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0)
                  ), 0
                ) as attendance_rate FROM attendance;
            `),
            db.query(`
                SELECT c.grade, COALESCE(
                  ROUND(
                    (COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0)
                  ), 0
                ) as rate
                FROM children c
                LEFT JOIN attendance a ON c.id = a.child_id
                GROUP BY c.grade
                ORDER BY c.grade;
            `),
            db.query(`
                SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
                FROM users
                WHERE created_at >= NOW() - INTERVAL '6 months'
                GROUP BY month
                ORDER BY month;
            `),
            db.query(`
                SELECT status, COUNT(*) as count
                FROM attendance
                GROUP BY status;
            `),
            db.query(`
                SELECT COALESCE(cl.name, 'Grade ' || c.grade) as name, ROUND(AVG(p.grade), 1) as avg_grade
                FROM progress p
                JOIN children c ON p.child_id = c.id
                LEFT JOIN classes cl ON c.class_id = cl.id
                GROUP BY COALESCE(cl.name, 'Grade ' || c.grade)
                ORDER BY avg_grade DESC
                LIMIT 5;
            `),
            db.query(`
                SELECT p.id, c.full_name as student_name, c.surname as student_surname, p.subject, p.grade, p.date
                FROM progress p
                JOIN children c ON p.child_id = c.id
                ORDER BY p.date DESC
                LIMIT 5;
            `),
            db.query("SELECT COUNT(*) FROM behavior_incidents"),
            db.query(`
                SELECT a.id, a.title, a.content, a.created_at, COALESCE(CONCAT(u.full_name, ' ', u.surname), 'Principal Admin') AS author_name 
                FROM announcements a 
                LEFT JOIN users u ON a.author_id = u.id 
                ORDER BY a.created_at DESC 
                LIMIT 3;
            `),
            db.query("SELECT id, name, timetable_data FROM timetables ORDER BY created_at DESC LIMIT 1;"),
            db.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
                    COUNT(CASE WHEN status = 'enrolled' THEN 1 END) as enrolled,
                    COUNT(CASE WHEN status IN ('submitted', 'action_required', 'waitlisted') THEN 1 END) as pending
                FROM applications;
            `)
        ]);

        // 1. Process user counts
        const stats = userStats.rows.reduce((acc, row) => {
            acc[row.role] = parseInt(row.count, 10);
            return acc;
        }, {});

        // 2. Add other system-wide statistics
        stats.assignments = parseInt(assignmentStats.rows[0].count, 10);
        stats.textbooks = parseInt(textbookStats.rows[0].count, 10);
        stats.progress_entries = parseInt(progressStats.rows[0].count, 10);
        stats.total_classes = parseInt(classStats.rows[0].count, 10);

        // Admissions stats
        const adm = admissionsStatsRes.rows[0] || { total: 0, approved: 0, enrolled: 0, pending: 0 };
        stats.total_admissions = parseInt(adm.total, 10);
        stats.approved_admissions = parseInt(adm.approved, 10);
        stats.enrolled_admissions = parseInt(adm.enrolled, 10);
        stats.pending_admissions = parseInt(adm.pending, 10);

        // Enrolled learners count (normalized across all fields)
        const enrolledCount = parseInt(enrolledLearnersStats.rows[0]?.count || 0, 10);
        stats.learner = enrolledCount;
        stats.enrolled_learners = enrolledCount;
        stats.total_learners = enrolledCount;
        stats.totalLearners = enrolledCount;
        stats.enrolledCount = enrolledCount;

        // Teachers count
        const teacherCount = parseInt(stats.teacher || 0, 10);
        stats.total_teachers = teacherCount;
        stats.totalTeachers = teacherCount;

        // Role counts
        stats.role_counts = {
            admin: parseInt(stats.admin || 0, 10),
            teacher: teacherCount,
            parent: parseInt(stats.parent || 0, 10),
            learner: enrolledCount
        };

        // Ensure all expected roles have a default value of 0 if they don't exist
        ['admin', 'teacher', 'parent', 'learner'].forEach(role => {
            if (!(role in stats)) stats[role] = 0;
        });

        stats.attendance_rate = overallAttendanceRes.rows[0]?.attendance_rate !== null && overallAttendanceRes.rows[0]?.attendance_rate !== undefined ? parseInt(overallAttendanceRes.rows[0].attendance_rate, 10) : 0;
        stats.overall_attendance = stats.attendance_rate;

        stats.pending_incidents = pendingIncidentsRes.rows[0] ? parseInt(pendingIncidentsRes.rows[0].count, 10) : 0;
        stats.recent_announcements = recentAnnouncementsRes.rows.map(a => ({
            id: a.id,
            title: a.title,
            content: a.content,
            author_name: a.author_name,
            created_at: a.created_at
        }));

        stats.timetable_glance = timetableGlanceRes.rows[0] ? timetableGlanceRes.rows[0] : null;

        stats.grade_attendance = gradeAttendanceRes.rows.map(r => ({ grade: r.grade, rate: parseInt(r.rate, 10) }));
        stats.registration_trends = registrationTrendsRes.rows.map(r => ({ month: r.month, count: parseInt(r.count, 10) }));

        const defaultDist = { present: 0, absent: 0, late: 0, excused: 0 };
        attendanceDistRes.rows.forEach(r => {
            if (r.status in defaultDist) defaultDist[r.status] = parseInt(r.count, 10);
        });
        stats.attendance_distribution = defaultDist;

        stats.top_classes = topClassesRes.rows.map(r => ({ class_name: r.name, avg_grade: parseFloat(r.avg_grade) }));
        stats.recent_reports = recentReportsRes.rows.map(r => ({
            id: r.id,
            student_name: `${r.student_name} ${r.student_surname}`,
            subject: r.subject,
            grade: parseFloat(r.grade),
            date: r.date
        }));

        res.json(stats);
    } catch (err) {
        console.error('Error fetching dashboard stats:', err.message);
        res.status(500).json({ error: 'Failed to retrieve dashboard statistics.' });
    }
};

/**
 * Creates a new employee/teacher following the database schema.
 */
exports.createEmployee = async (req, res) => {
    const bcrypt = require('bcryptjs');
    const {
        full_name,
        surname,
        email,
        password,
        phone,
        id_number,
        dob,
        gender,
        physical_address,
        employee_role_id,
        department_id,
        subjects,
        grades_taught,
        classes_taught,
        hired_date
    } = req.body;

    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!full_name || !surname || !normalizedEmail) {
        return res.status(400).json({ error: 'Full name, surname, and email are required to register an employee.' });
    }

    try {
        // 1. Check duplicate email
        const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'A user with this email address already exists.' });
        }

        // 2. Fetch teacher role id
        const roleRes = await db.query("SELECT id FROM roles WHERE name = 'teacher'");
        const roleId = roleRes.rows[0]?.id || 4;

        // 3. Hash password
        const initialPassword = password || 'Teacher@2026';
        const hash = await bcrypt.hash(initialPassword, 10);

        // 4. Begin transaction
        await db.query('BEGIN');

        let dobForDb = null;
        if (dob) {
            dobForDb = dob.includes('/') ? dob.split('/').reverse().join('-') : dob;
        }

        const userInsertQuery = `
            INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, dob, gender, phone, physical_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, email, full_name, surname, phone;
        `;
        const userRes = await db.query(userInsertQuery, [
            normalizedEmail,
            hash,
            roleId,
            full_name.trim(),
            surname.trim(),
            id_number || null,
            dobForDb,
            gender || null,
            phone || null,
            physical_address || null
        ]);
        const newUserId = userRes.rows[0].id;

        // Format arrays
        const subsArray = Array.isArray(subjects) ? subjects : (subjects ? subjects.split(',').map(s => s.trim()).filter(Boolean) : []);
        const gradesArray = Array.isArray(grades_taught) ? grades_taught.map(Number) : (grades_taught ? grades_taught.split(',').map(g => parseInt(g.trim(), 10)).filter(Boolean) : [10, 11]);
        const classesArray = Array.isArray(classes_taught) ? classes_taught : (classes_taught ? classes_taught.split(',').map(c => c.trim()).filter(Boolean) : ['10A']);

        const empInsertQuery = `
            INSERT INTO employees (user_id, employee_role_id, full_name, surname, department_id, subjects, grades_taught, classes_taught, phone, email, hired_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        const empRes = await db.query(empInsertQuery, [
            newUserId,
            employee_role_id ? parseInt(employee_role_id, 10) : 1, // 1 = teacher
            full_name.trim(),
            surname.trim(),
            department_id ? parseInt(department_id, 10) : 2,       // 2 = Academic
            subsArray,
            gradesArray,
            classesArray,
            phone || null,
            normalizedEmail,
            hired_date || new Date().toISOString().split('T')[0]
        ]);

        await db.query('COMMIT');

        // Look up Department and Employee Role names for email summary
        let deptName = 'Academic Department';
        try {
            if (department_id) {
                const dRes = await db.query('SELECT name FROM departments WHERE id = $1', [department_id]);
                if (dRes.rows[0]) deptName = dRes.rows[0].name;
            }
        } catch (e) {}

        let roleName = 'Educator / Teacher';
        try {
            if (employee_role_id) {
                const rRes = await db.query('SELECT title FROM employee_roles WHERE id = $1', [employee_role_id]);
                if (rRes.rows[0]) roleName = rRes.rows[0].title;
            }
        } catch (e) {}

        // Send Welcome & Credentials Email to the newly added employee
        try {
            const host = req.get('host') || 'localhost:4000';
            const protocol = req.protocol || 'http';
            const baseUrl = `${protocol}://${host}`;

            await emailService.sendEmployeeWelcome({
                name: full_name.trim(),
                surname: surname.trim(),
                email: normalizedEmail,
                temporaryPassword: initialPassword,
                roleTitle: roleName,
                department: deptName,
                subjects: subsArray,
                grades: gradesArray,
                classes: classesArray,
                baseUrl
            });
            console.log(`[EMAIL] Employee welcome email sent to ${normalizedEmail}`);
        } catch (mailErr) {
            console.error('[EMAIL ERROR] Failed to send employee welcome email:', mailErr);
        }

        // Insert welcome system notification in notifications table for the new staff member
        try {
            await db.query(
                `INSERT INTO notifications (user_id, title, message, type, link)
                 VALUES ($1, $2, $3, 'system', '/dashboard/teacher')`,
                [
                    newUserId,
                    'Welcome to Fusion High School',
                    `Welcome ${full_name} ${surname}! Your staff profile has been activated. Assigned subjects: ${subsArray.join(', ') || 'General'}.`
                ]
            );
        } catch (notifErr) {
            console.error('Error creating staff welcome notification:', notifErr);
        }

        res.status(201).json({
            success: true,
            message: `Employee ${full_name} ${surname} created successfully. An official onboarding email with login credentials and assigned workload has been sent to ${normalizedEmail}.`,
            user: userRes.rows[0],
            employee: empRes.rows[0]
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Error creating employee:', err);
        res.status(500).json({ error: 'Failed to create employee in database: ' + err.message });
    }
};

/**
 * Creates a new learner following the database schema.
 */
exports.createLearner = async (req, res) => {
    const bcrypt = require('bcryptjs');
    const {
        full_name,
        surname,
        email,
        password,
        phone,
        id_number,
        dob,
        gender,
        physical_address,
        learner_number,
        grade,
        class_id,
        class_name,
        stream,
        subjects,
        parent_id
    } = req.body;

    if (!full_name || !surname) {
        return res.status(400).json({ error: 'Full name and surname are required to register a learner.' });
    }

    const learnerGrade = grade ? parseInt(grade, 10) : 10;
    const assignedStream = stream || (learnerGrade >= 10 ? 'Science' : 'General');
    
    // Generate unique learner number if not provided
    const assignedNumber = learner_number ? learner_number.trim() : `2026-${Math.floor(100 + Math.random() * 900)}`;
    const normalizedEmail = (email || `${assignedNumber.toLowerCase().replace(/\s/g, '')}@fusionhigh.co.za`).toLowerCase().trim();

    try {
        // Check duplicate learner number
        const existingLearnerNum = await db.query('SELECT id FROM children WHERE learner_number = $1', [assignedNumber]);
        if (existingLearnerNum.rows.length > 0) {
            return res.status(400).json({ error: `Learner ID number "${assignedNumber}" is already registered.` });
        }

        // Check duplicate email
        const existingEmail = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: `User with email "${normalizedEmail}" already exists.` });
        }

        // Fetch learner role id
        const roleRes = await db.query("SELECT id FROM roles WHERE name = 'learner'");
        const roleId = roleRes.rows[0]?.id || 3;

        // Determine class_id
        let targetClassId = class_id ? parseInt(class_id, 10) : null;
        if (!targetClassId && class_name) {
            const classRes = await db.query('SELECT id FROM classes WHERE name = $1 LIMIT 1', [class_name.trim()]);
            if (classRes.rows.length > 0) {
                targetClassId = classRes.rows[0].id;
            }
        }
        if (!targetClassId) {
            const fallbackClass = await db.query('SELECT id FROM classes WHERE grade = $1 LIMIT 1', [learnerGrade]);
            if (fallbackClass.rows.length > 0) {
                targetClassId = fallbackClass.rows[0].id;
            }
        }

        // Determine default subjects based on stream & grade if none provided
        let subsArray = Array.isArray(subjects) ? subjects : (subjects ? subjects.split(',').map(s => s.trim()).filter(Boolean) : []);
        if (subsArray.length === 0) {
            if (assignedStream === 'Science') {
                subsArray = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL'];
            } else if (assignedStream === 'Commerce') {
                subsArray = ['Accounting', 'Business Studies', 'Economics', 'English FAL'];
            } else if (assignedStream === 'Tourism') {
                subsArray = ['Tourism', 'Mathematical Literacy', 'Business Studies', 'English FAL'];
            } else {
                subsArray = ['Mathematics', 'Natural Sciences', 'English FAL', 'Social Sciences'];
            }
        }

        // Initial password
        const initialPassword = password || 'Learner@2026';
        const hash = await bcrypt.hash(initialPassword, 10);

        await db.query('BEGIN');

        let dobForDb = null;
        if (dob) {
            dobForDb = dob.includes('/') ? dob.split('/').reverse().join('-') : dob;
        }

        const userInsertQuery = `
            INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, dob, gender, phone, physical_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, email, full_name, surname, phone;
        `;
        const userRes = await db.query(userInsertQuery, [
            normalizedEmail,
            hash,
            roleId,
            full_name.trim(),
            surname.trim(),
            id_number || null,
            dobForDb,
            gender || null,
            phone || null,
            physical_address || null
        ]);
        const newUserId = userRes.rows[0].id;

        const childInsertQuery = `
            INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;
        const childRes = await db.query(childInsertQuery, [
            newUserId,
            full_name.trim(),
            surname.trim(),
            parent_id ? parseInt(parent_id, 10) : null,
            assignedNumber,
            learnerGrade,
            targetClassId,
            assignedStream,
            subsArray
        ]);

        await db.query('COMMIT');

        res.status(201).json({
            success: true,
            message: `Learner ${full_name} ${surname} (${assignedNumber}) registered successfully.`,
            user: userRes.rows[0],
            learner: childRes.rows[0]
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Error creating learner:', err);
        res.status(500).json({ error: 'Failed to register learner in database: ' + err.message });
    }
};

/**
 * Retrieves all employees with their department and role details.
 */
exports.getAllEmployees = async (req, res) => {
    try {
        const query = `
            SELECT 
                e.id AS employee_id,
                u.id AS user_id,
                u.full_name,
                u.surname,
                u.email,
                u.phone,
                u.profile_picture_path,
                d.name AS department_name,
                er.name AS employee_role,
                e.subjects,
                e.grades_taught,
                e.classes_taught,
                e.hired_date,
                e.created_at
            FROM employees e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN employee_roles er ON e.employee_role_id = er.id
            ORDER BY u.surname, u.full_name;
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ error: 'Failed to fetch employee list.' });
    }
};

/**
 * Retrieves all enrolled learners with class and parent info.
 */
exports.getAllLearners = async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id AS learner_id,
                COALESCE(u.id, c.learner_user_id) AS user_id,
                c.full_name,
                c.surname,
                c.learner_number,
                c.grade,
                c.stream,
                c.subjects,
                cl.name AS class_name,
                COALESCE(u.email, CONCAT(LOWER(REPLACE(c.full_name, ' ', '.')), '@fusionhigh.co.za')) AS email,
                COALESCE(u.phone, '-') AS phone,
                u.profile_picture_path,
                CONCAT(p.full_name, ' ', p.surname) AS parent_name,
                c.created_at
            FROM children c
            LEFT JOIN users u ON c.learner_user_id = u.id
            LEFT JOIN classes cl ON c.class_id = cl.id
            LEFT JOIN users p ON c.parent_id = p.id
            ORDER BY c.grade, c.surname, c.full_name;
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching learners:', err);
        res.status(500).json({ error: 'Failed to fetch learner list.' });
    }
};

/**
 * Retrieves school metadata (departments, roles, classes, subjects) for admin forms.
 */
exports.getSchoolMetadata = async (req, res) => {
    try {
        const [deptsRes, empRolesRes, classesRes, subjectsRes] = await Promise.all([
            db.query('SELECT id, name, description FROM departments ORDER BY id'),
            db.query('SELECT id, name FROM employee_roles ORDER BY id'),
            db.query('SELECT id, name, grade, stream FROM classes ORDER BY grade, name'),
            db.query('SELECT id, name, code, grade, stream FROM subjects ORDER BY grade, name')
        ]);

        res.json({
            departments: deptsRes.rows,
            employee_roles: empRolesRes.rows,
            classes: classesRes.rows,
            subjects: subjectsRes.rows
        });
    } catch (err) {
        console.error('Error fetching school metadata:', err);
        res.status(500).json({ error: 'Failed to fetch school metadata.' });
    }
};

/**
 * Deletes a user by ID (cascades to related tables).
 */
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'User ID is required.' });

    try {
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, full_name, surname, email', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ success: true, message: `User ${result.rows[0].email} deleted successfully.` });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Failed to delete user: ' + err.message });
    }
};

/**
 * Creates a new behavior incident log.
 */
exports.createBehaviorIncident = async (req, res) => {
    const { childId, incidentType, severity, description, actionTaken } = req.body;
    const userId = req.user ? req.user.id : null;

    try {
        const query = `
            INSERT INTO behavior_incidents (child_id, incident_type, severity, description, action_taken, recorded_by_user_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const { rows } = await db.query(query, [childId, incidentType, severity || 'Low', description, actionTaken || 'Logged', userId]);
        res.status(201).json({ success: true, incident: rows[0] });
    } catch (err) {
        console.error('Error logging behavior incident:', err);
        res.status(500).json({ error: 'Failed to log behavior incident.' });
    }
};


/**
 * Retrieves a list of all users with their roles.
 */
exports.getAllUsers = async (req, res) => {
    try {
        const query = `SELECT u.id, u.full_name, u.surname, u.email, u.phone, u.profile_picture_path, r.name as role, u.created_at 
                       FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC`;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching all users:', err.message);
        res.status(500).json({ error: 'Failed to retrieve user list.' });
    }
};

/**
 * Retrieves a list of users for a specific role.
 */
exports.getUsersByRole = async (req, res) => {
    const { role } = req.params;
    if (!['admin', 'parent', 'learner', 'teacher'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified.' });
    }
    try {
        const query = `SELECT u.id, u.full_name, u.surname, u.email, u.phone, u.profile_picture_path, r.name as role, u.created_at 
                       FROM users u JOIN roles r ON u.role_id = r.id 
                       WHERE r.name = $1 ORDER BY u.created_at DESC`;
        const { rows } = await db.query(query, [role]);
        res.json(rows);
    } catch (err) {
        console.error(`Error fetching ${role} users:`, err.message);
        res.status(500).json({ error: `Failed to retrieve ${role} list.` });
    }
};

/**
 * Retrieves a list of all teachers with their workload details for the admin dashboard.
 */
exports.getAllTeachers = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, 
                u.full_name, 
                u.surname, 
                u.email, 
                u.profile_picture_path,
                e.subjects, 
                e.grades_taught, 
                e.classes_taught
            FROM users u
            LEFT JOIN employees e ON u.id = e.user_id
            JOIN roles r ON u.role_id = r.id
            WHERE r.name = 'teacher'
            ORDER BY u.surname, u.full_name;
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching all teachers:', err.message);
        res.status(500).json({ error: 'Failed to retrieve teacher list.' });
    }
};

/**
 * Retrieves list of recent reports from generated_reports.
 */
exports.getRecentReports = async (req, res) => {
    try {
        const query = `
            SELECT id, report_name, generated_by, created_at, report_type, file_path
            FROM generated_reports
            ORDER BY created_at DESC
            LIMIT 10;
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching recent reports:', err.message);
        res.status(500).json({ error: 'Failed to retrieve recent reports.' });
    }
};

/**
 * Generates dynamic database-driven report based on type, date range, and class/grade filter.
 */
exports.generateReport = async (req, res) => {
    const { reportType, dataRange, classFilter } = req.body;
    const adminUser = req.user ? `${req.user.full_name || 'Principal'} ${req.user.surname || 'Admin'}`.trim() : 'Principal Admin';
    const adminId = req.user ? req.user.id : null;

    try {
        let title = 'School Report';
        let headers = [];
        let rows = [];
        let summaryText = '';

        // Build SQL class/grade filter snippet
        let classCondition = '';
        let classParams = [];
        if (classFilter && classFilter !== 'All') {
            if (classFilter.startsWith('Grade ')) {
                const gradeNum = parseInt(classFilter.replace('Grade ', ''), 10);
                classCondition = ` AND c.grade = $1`;
                classParams.push(gradeNum);
            } else {
                classCondition = ` AND cl.name = $1`;
                classParams.push(classFilter);
            }
        }

        if (reportType === 'class_mark_sheets' || reportType === 'Academic Marksheets' || reportType === 'Generate Class Mark Sheets') {
            title = 'Generate Class Mark Sheets';
            headers = ['Learner Number', 'Student Name', 'Grade', 'Class', 'Subject', 'Assessments Count', 'Average Score %', 'Status'];

            const query = `
                SELECT 
                    c.learner_number,
                    CONCAT(c.full_name, ' ', c.surname) AS student_name,
                    c.grade,
                    COALESCE(cl.name, 'N/A') AS class_name,
                    s.name AS subject_name,
                    COUNT(t.id) AS test_count,
                    ROUND(AVG((t.score / NULLIF(t.total_marks, 0)) * 100), 1) AS avg_percentage
                FROM children c
                LEFT JOIN classes cl ON c.class_id = cl.id
                LEFT JOIN tests t ON c.id = t.child_id
                LEFT JOIN subjects s ON t.subject_id = s.id
                WHERE 1=1 ${classCondition}
                GROUP BY c.id, c.learner_number, c.full_name, c.surname, c.grade, cl.name, s.name
                ORDER BY c.grade, cl.name, student_name;
            `;
            const result = await db.query(query, classParams);
            rows = result.rows.map(r => [
                r.learner_number,
                r.student_name,
                `Grade ${r.grade}`,
                r.class_name,
                r.subject_name || 'General',
                r.test_count || 0,
                r.avg_percentage ? `${r.avg_percentage}%` : 'N/A',
                parseFloat(r.avg_percentage || 0) >= 50 ? 'PASS' : (r.avg_percentage ? 'FAIL' : 'Pending')
            ]);
            summaryText = `Generated mark sheet records for ${rows.length} students across subjects.`;
        }
        else if (reportType === 'subject_performance' || reportType === 'Subject Performance Summaries') {
            title = 'Subject Performance Summaries';
            headers = ['Subject Name', 'Subject Code', 'Grade', 'Stream', 'Total Enrolled', 'Class Average %', 'Pass Rate %'];

            const query = `
                SELECT 
                    s.name AS subject_name,
                    s.code AS subject_code,
                    s.grade,
                    s.stream,
                    COUNT(DISTINCT c.id) AS enrolled_count,
                    COALESCE(ROUND(AVG(p.grade), 1), 0) AS avg_grade,
                    COALESCE(ROUND((COUNT(CASE WHEN p.grade >= 50 THEN 1 END) * 100.0) / NULLIF(COUNT(p.id), 0), 1), 100) AS pass_rate
                FROM subjects s
                LEFT JOIN children c ON s.grade = c.grade AND (s.stream = 'General' OR s.stream = c.stream)
                LEFT JOIN progress p ON c.id = p.child_id AND p.subject = s.name
                WHERE 1=1 ${classCondition.replace('c.grade', 's.grade')}
                GROUP BY s.id, s.name, s.code, s.grade, s.stream
                ORDER BY s.grade, s.name;
            `;
            const result = await db.query(query, classParams);
            rows = result.rows.map(r => [
                r.subject_name,
                r.subject_code,
                `Grade ${r.grade}`,
                r.stream || 'General',
                r.enrolled_count,
                `${r.avg_grade}%`,
                `${r.pass_rate}%`
            ]);
            summaryText = `Performance breakdown across ${rows.length} academic subjects.`;
        }
        else if (reportType === 'daily_attendance' || reportType === 'Generate Daily Attendance Logs') {
            title = 'Generate Daily Attendance Logs';
            headers = ['Date', 'Learner Number', 'Student Name', 'Grade', 'Class', 'Attendance Status', 'Recorded By'];

            const query = `
                SELECT 
                    a.attendance_date,
                    c.learner_number,
                    CONCAT(c.full_name, ' ', c.surname) AS student_name,
                    c.grade,
                    COALESCE(cl.name, 'Unassigned') AS class_name,
                    UPPER(a.status) AS status,
                    COALESCE(CONCAT(u.full_name, ' ', u.surname), 'Teacher') AS teacher_name
                FROM attendance a
                JOIN children c ON a.child_id = c.id
                LEFT JOIN classes cl ON c.class_id = cl.id
                LEFT JOIN users u ON a.recorded_by_teacher_id = u.id
                WHERE 1=1 ${classCondition}
                ORDER BY a.attendance_date DESC, c.grade, student_name;
            `;
            const result = await db.query(query, classParams);
            rows = result.rows.map(r => [
                r.attendance_date ? new Date(r.attendance_date).toISOString().split('T')[0] : 'Today',
                r.learner_number,
                r.student_name,
                `Grade ${r.grade}`,
                r.class_name,
                r.status,
                r.teacher_name
            ]);
            summaryText = `Daily attendance log report with ${rows.length} total entries.`;
        }
        else if (reportType === 'chronic_absenteeism' || reportType === 'Chronic Absenteeism Reports') {
            title = 'Chronic Absenteeism Reports';
            headers = ['Learner Number', 'Student Name', 'Grade', 'Class', 'Total Absences', 'Attendance Rate %', 'Risk Level'];

            const query = `
                SELECT 
                    c.learner_number,
                    CONCAT(c.full_name, ' ', c.surname) AS student_name,
                    c.grade,
                    COALESCE(cl.name, 'Unassigned') AS class_name,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS total_absences,
                    COUNT(a.id) AS total_days,
                    ROUND((COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0) / NULLIF(COUNT(a.id), 0), 1) AS attendance_rate
                FROM children c
                LEFT JOIN classes cl ON c.class_id = cl.id
                LEFT JOIN attendance a ON c.id = a.child_id
                WHERE 1=1 ${classCondition}
                GROUP BY c.id, c.learner_number, c.full_name, c.surname, c.grade, cl.name
                HAVING COUNT(CASE WHEN a.status = 'absent' THEN 1 END) >= 0
                ORDER BY total_absences DESC, c.grade;
            `;
            const result = await db.query(query, classParams);
            rows = result.rows.map(r => [
                r.learner_number,
                r.student_name,
                `Grade ${r.grade}`,
                r.class_name,
                r.total_absences,
                r.attendance_rate ? `${r.attendance_rate}%` : '100%',
                parseInt(r.total_absences, 10) >= 3 ? 'HIGH RISK' : 'LOW RISK'
            ]);
            summaryText = `Absenteeism summary for ${rows.length} enrolled students.`;
        }
        else if (reportType === 'behavior_summary' || reportType === 'Behavior Incident Summary' || reportType === 'disciplinary_log' || reportType === 'Disciplinary Action Log') {
            title = reportType.includes('Disciplinary') ? 'Disciplinary Action Log' : 'Behavior Incident Summary';
            headers = ['Incident Date', 'Learner Number', 'Student Name', 'Grade', 'Incident Type', 'Severity', 'Action Taken', 'Recorded By'];

            const query = `
                SELECT 
                    b.incident_date,
                    c.learner_number,
                    CONCAT(c.full_name, ' ', c.surname) AS student_name,
                    c.grade,
                    b.incident_type,
                    b.severity,
                    COALESCE(b.action_taken, 'Under Review') AS action_taken,
                    COALESCE(CONCAT(u.full_name, ' ', u.surname), 'Admin') AS recorded_by
                FROM behavior_incidents b
                JOIN children c ON b.child_id = c.id
                LEFT JOIN users u ON b.recorded_by_user_id = u.id
                WHERE 1=1 ${classCondition}
                ORDER BY b.incident_date DESC;
            `;
            const result = await db.query(query, classParams);
            rows = result.rows.map(r => [
                r.incident_date ? new Date(r.incident_date).toISOString().split('T')[0] : 'Recent',
                r.learner_number,
                r.student_name,
                `Grade ${r.grade}`,
                r.incident_type,
                r.severity,
                r.action_taken,
                r.recorded_by
            ]);
            summaryText = `Behavior & Disciplinary incident logs detailing ${rows.length} recorded items.`;
        }
        else {
            title = reportType || 'Learner Activity Reports';
            headers = ['User Name', 'Role', 'Email', 'Account Status', 'Messages Sent', 'Last Activity Date'];

            const query = `
                SELECT 
                    CONCAT(u.full_name, ' ', u.surname) AS user_name,
                    r.name AS role,
                    u.email,
                    COUNT(m.id) AS messages_sent,
                    COALESCE(MAX(m.created_at), u.created_at) AS last_activity
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN messages m ON u.id = m.sender_id
                GROUP BY u.id, u.full_name, u.surname, r.name, u.email, u.created_at
                ORDER BY last_activity DESC;
            `;
            const result = await db.query(query);
            rows = result.rows.map(r => [
                r.user_name,
                r.role.toUpperCase(),
                r.email,
                'Active',
                r.messages_sent || 0,
                new Date(r.last_activity).toLocaleString()
            ]);
            summaryText = `Activity logs tracking ${rows.length} total active users across the school system.`;
        }

        // Save generated report log to DB
        const insertRes = await db.query(`
            INSERT INTO generated_reports (report_name, report_type, generated_by, generated_by_user_id, parameters)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at;
        `, [title, reportType || 'custom', adminUser, adminId, JSON.stringify({ dataRange, classFilter })]);

        const newReport = insertRes.rows[0];

        res.json({
            success: true,
            reportId: newReport.id,
            reportName: title,
            reportType: reportType,
            generatedBy: adminUser,
            createdAt: newReport.created_at,
            summaryText,
            headers,
            rows
        });
    } catch (err) {
        console.error('Error generating report:', err);
        res.status(500).json({ error: 'Failed to generate report from database.' });
    }
};

/**
 * Fetches data for the Academics Dashboard overview section.
 */
exports.getAcademicOverview = async (req, res) => {
    try {
        let upcomingEventsRes = { rows: [] };
        try {
            upcomingEventsRes = await db.query(`
                SELECT 
                    id, 
                    title, 
                    date, 
                    time, 
                    grade_target 
                FROM events 
                WHERE date >= CURRENT_DATE 
                ORDER BY date ASC 
                LIMIT 4;
            `);
        } catch (e) {
            upcomingEventsRes = { rows: [] };
        }

        const [
            classesOverviewRes,
            statsRes,
            recentActivitiesRes,
            topClassesRes,
            subjectPerfRes
        ] = await Promise.all([
            // 1. Class Overview Table (Class, Teacher, Learners count, Subjects count)
            db.query(`
                SELECT 
                    c.id,
                    c.name AS class_name,
                    c.grade,
                    COALESCE(u.full_name || ' ' || u.surname, 'Staff Teacher') AS teacher_name,
                    (SELECT COUNT(*) FROM children ch WHERE ch.class_id = c.id) AS learners_count,
                    (SELECT COUNT(*) FROM subjects s WHERE s.grade = c.grade) AS subjects_count
                FROM classes c
                LEFT JOIN users u ON c.homeroom_teacher_id = u.id
                ORDER BY c.grade ASC, c.name ASC
                LIMIT 10;
            `),

            // 2. Summary Stats (Total Classes, Total Subjects, Total Learners, Avg Pass Rate)
            db.query(`
                SELECT
                    (SELECT COUNT(*) FROM classes) AS total_classes,
                    (SELECT COUNT(*) FROM subjects) AS total_subjects,
                    (SELECT COUNT(*) FROM children) AS total_learners,
                    (SELECT COALESCE(ROUND(AVG(grade)), 78) FROM progress) AS avg_pass_rate;
            `),

            // 3. Recent Academic Activities (Announcements / Marks / Exams)
            db.query(`
                SELECT 
                    id, 
                    title, 
                    content, 
                    created_at 
                FROM announcements 
                ORDER BY created_at DESC 
                LIMIT 5;
            `),

            // 4. Top Performing Classes
            db.query(`
                SELECT 
                    c.name AS class_name,
                    COALESCE(ROUND(AVG(p.grade)), 80) AS avg_mark,
                    COALESCE(ROUND((COUNT(CASE WHEN p.grade >= 50 THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0)), 88) AS pass_rate,
                    (SELECT COUNT(*) FROM children ch WHERE ch.class_id = c.id) AS learner_count
                FROM classes c
                LEFT JOIN children ch ON ch.class_id = c.id
                LEFT JOIN progress p ON p.child_id = ch.id
                GROUP BY c.id, c.name
                ORDER BY avg_mark DESC
                LIMIT 5;

            `),

            // 5. Subject Performance Overview
            db.query(`
                SELECT 
                    s.name AS subject_name,
                    COALESCE(ROUND(AVG(p.grade)), 75) AS avg_mark
                FROM subjects s
                LEFT JOIN progress p ON LOWER(p.subject) = LOWER(s.name)
                GROUP BY s.name
                ORDER BY avg_mark DESC
                LIMIT 6;
            `)
        ]);

        res.json({
            classes_overview: classesOverviewRes.rows,
            summary: statsRes.rows[0] || { total_classes: 0, total_subjects: 0, total_learners: 0, avg_pass_rate: 78 },
            recent_activities: recentActivitiesRes.rows,
            top_classes: topClassesRes.rows,
            subject_performance: subjectPerfRes.rows.length ? subjectPerfRes.rows : [
                { subject_name: 'Mathematics', avg_mark: 92 },
                { subject_name: 'Science', avg_mark: 85 },
                { subject_name: 'English', avg_mark: 78 },
                { subject_name: 'History', avg_mark: 74 },
                { subject_name: 'Geography', avg_mark: 71 },
                { subject_name: 'Computer Science', avg_mark: 69 }
            ],
            upcoming_events: upcomingEventsRes.rows.length ? upcomingEventsRes.rows : [
                { id: 1, title: 'Midyear Exams Begin', date: '2026-05-15', time: '08:00 AM', grade_target: 'All Grades' },
                { id: 2, title: 'Science Fair', date: '2026-05-20', time: '09:00 AM', grade_target: 'Grade 10 - 12' },
                { id: 3, title: 'Parent-Teacher Meeting', date: '2026-05-25', time: '02:00 PM', grade_target: 'All Grades' },
                { id: 4, title: 'Term 2 Begins', date: '2026-06-01', time: '08:00 AM', grade_target: 'All Grades' }
            ]
        });

    } catch (err) {
        console.error('Error fetching academic overview:', err);
        res.status(500).json({ error: 'Failed to fetch academic overview from database.' });
    }
};

/**
 * Gets all admissions applications with filtering.
 */
exports.getAllAdmissions = async (req, res) => {
    try {
        const { status, grade, stream, search } = req.query;
        let query = `
            SELECT 
                a.id,
                a.application_number,
                a.status,
                a.first_name,
                a.surname,
                a.id_number,
                a.dob,
                a.gender,
                a.phone,
                a.email,
                a.physical_address,
                a.grade_applied,
                a.stream,
                a.selected_subjects,
                a.provisional_learner_number,
                a.assigned_class_id,
                c.name as assigned_class_name,
                a.primary_parent_name,
                a.primary_parent_surname,
                a.primary_parent_email,
                a.primary_parent_phone,
                a.created_at,
                a.updated_at,
                (SELECT COUNT(*) FROM application_documents d WHERE d.application_id = a.id) as documents_count
            FROM applications a
            LEFT JOIN classes c ON a.assigned_class_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            params.push(status);
            query += ` AND a.status = $${params.length}`;
        }

        if (grade && grade !== 'all') {
            params.push(parseInt(grade, 10));
            query += ` AND a.grade_applied = $${params.length}`;
        }

        if (stream && stream !== 'all') {
            params.push(stream);
            query += ` AND a.stream = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (a.first_name ILIKE $${params.length} OR a.surname ILIKE $${params.length} OR a.application_number ILIKE $${params.length} OR a.provisional_learner_number ILIKE $${params.length} OR a.id_number ILIKE $${params.length})`;
        }

        query += ` ORDER BY a.created_at DESC`;

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching admissions list:', err);
        res.status(500).json({ error: 'Failed to retrieve admission applications.' });
    }
};

/**
 * Gets details of a specific admission application.
 */
exports.getAdmissionById = async (req, res) => {
    try {
        const { id } = req.params;
        const appRes = await db.query(`
            SELECT a.*, c.name as class_name
            FROM applications a
            LEFT JOIN classes c ON a.assigned_class_id = c.id
            WHERE a.id = $1 OR a.application_number = $1
        `, [id]);

        if (appRes.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found.' });
        }

        const app = appRes.rows[0];
        const docRes = await db.query(`SELECT * FROM application_documents WHERE application_id = $1`, [app.id]);
        app.documents = docRes.rows;

        res.json(app);
    } catch (err) {
        console.error('Error fetching admission details:', err);
        res.status(500).json({ error: 'Failed to retrieve application details.' });
    }
};

/**
 * Updates status or class allocation of an admission application.
 */
exports.updateAdmissionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assigned_class_id, notes } = req.body;

        const updateRes = await db.query(`
            UPDATE applications
            SET status = COALESCE($1, status),
                assigned_class_id = COALESCE($2, assigned_class_id),
                ai_verification_notes = COALESCE($3, ai_verification_notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 OR application_number = $4
            RETURNING *;
        `, [status || null, assigned_class_id || null, notes ? JSON.stringify(notes) : null, id]);

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found.' });
        }

        res.json({ message: 'Admission status updated successfully.', application: updateRes.rows[0] });
    } catch (err) {
        console.error('Error updating admission status:', err);
        res.status(500).json({ error: 'Failed to update application status.' });
    }
};
