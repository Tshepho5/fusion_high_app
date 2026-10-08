const db = require('../../../db/db');
const NotificationService = require('../services/notificationService');

let schemaChecked = false;
async function ensureLeaveReliefSchema() {
  if (schemaChecked) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS educator_leave_requests (
        id SERIAL PRIMARY KEY,
        teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        leave_type VARCHAR(60) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(30) DEFAULT 'pending',
        relief_status VARCHAR(30) DEFAULT 'unassigned',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS total_days NUMERIC(4,1) DEFAULT 1.0;
      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS document_url VARCHAR(255);
      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS school_id INTEGER;
      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      CREATE TABLE IF NOT EXISTS educator_relief_allocations (
        id SERIAL PRIMARY KEY,
        leave_request_id INTEGER REFERENCES educator_leave_requests(id) ON DELETE CASCADE,
        absent_teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        relief_teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        relief_date DATE,
        period_number INTEGER,
        grade INTEGER,
        classroom VARCHAR(50) DEFAULT 'Classroom',
        subject VARCHAR(100),
        lesson_instructions TEXT,
        status VARCHAR(30) DEFAULT 'assigned',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS absent_teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS relief_teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS relief_date DATE;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS period_number INTEGER;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS grade INTEGER;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS classroom VARCHAR(50) DEFAULT 'Classroom';
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS lesson_instructions TEXT;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS school_id INTEGER;
    `);
    schemaChecked = true;
  } catch (e) {
    console.error('[LEAVE RELIEF] Schema check warning:', e.message);
  }
}

/**
 * Teacher / Admin: Submit Leave Request
 */
exports.submitLeaveRequest = async (req, res) => {
  try {
    await ensureLeaveReliefSchema();
    const userId = req.user.id;
    const { teacher_user_id, leave_type, start_date, end_date, total_days = 1.0, reason, document_url } = req.body;

    // If teacher, submit for self; if admin, can submit for any teacher
    const targetTeacherId = req.user.role === 'admin' && teacher_user_id ? teacher_user_id : userId;

    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({ error: 'Leave type, start date, and end date are required.' });
    }

    const result = await db.query(`
      INSERT INTO educator_leave_requests (teacher_user_id, leave_type, start_date, end_date, total_days, reason, document_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *;
    `, [targetTeacherId, leave_type, start_date, end_date, parseFloat(total_days) || 1.0, reason || '', document_url || null]);

    const newLeave = result.rows[0];

    // Notify admins
    const teacherRes = await db.query('SELECT full_name, surname FROM users WHERE id = $1', [targetTeacherId]);
    const teacherName = teacherRes.rows[0] ? `${teacherRes.rows[0].full_name} ${teacherRes.rows[0].surname}` : 'Educator';

    const admins = await db.query("SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE LOWER(r.name) = 'admin'");
    const adminIds = admins.rows.map(a => a.id);

    if (adminIds.length > 0) {
      NotificationService.sendToUsers({
        userIds: adminIds,
        title: '📋 New Educator Leave Request',
        message: `${teacherName} applied for ${leave_type} (${start_date} to ${end_date}, ${total_days} days).`,
        type: 'leave',
        targetTab: 'leave-relief'
      }).catch(err => console.error('Leave notification error:', err));
    }

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully.',
      leave: newLeave
    });
  } catch (err) {
    console.error('Error submitting leave request:', err);
    res.status(500).json({ error: 'Failed to submit leave request: ' + err.message });
  }
};

/**
 * Admin: Get All Leave Requests
 */
exports.getLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        l.*,
        u.full_name AS teacher_name,
        u.surname AS teacher_surname,
        u.email AS teacher_email,
        rev.full_name AS reviewer_name,
        rev.surname AS reviewer_surname,
        (SELECT COUNT(*) FROM educator_relief_allocations r WHERE r.leave_request_id = l.id) AS relief_periods_assigned
      FROM educator_leave_requests l
      JOIN users u ON l.teacher_user_id = u.id
      LEFT JOIN users rev ON l.reviewed_by_user_id = rev.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND l.status = $${params.length}`;
    }

    query += ` ORDER BY l.created_at DESC;`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching leave requests:', err);
    res.status(500).json({ error: 'Failed to retrieve leave requests.' });
  }
};

/**
 * Teacher: Get My Leave Applications & Assigned Relief Duties
 */
exports.getTeacherMyLeave = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // My leave requests
    const leaveRes = await db.query(`
      SELECT l.*, rev.full_name AS reviewer_name, rev.surname AS reviewer_surname
      FROM educator_leave_requests l
      LEFT JOIN users rev ON l.reviewed_by_user_id = rev.id
      WHERE l.teacher_user_id = $1
      ORDER BY l.created_at DESC;
    `, [teacherId]);

    // Relief duties assigned to me as a substitute
    const reliefRes = await db.query(`
      SELECT 
        r.*,
        absent.full_name AS absent_teacher_name,
        absent.surname AS absent_teacher_surname
      FROM educator_relief_allocations r
      JOIN users absent ON r.absent_teacher_id = absent.id
      WHERE r.relief_teacher_id = $1
      ORDER BY r.relief_date DESC, r.period_number ASC;
    `, [teacherId]);

    res.json({
      my_leave_requests: leaveRes.rows,
      my_relief_duties: reliefRes.rows
    });
  } catch (err) {
    console.error('Error fetching teacher leave/relief:', err);
    res.status(500).json({ error: 'Failed to retrieve leave records.' });
  }
};

/**
 * Admin: Approve / Reject Leave Request
 */
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const reviewerId = req.user.id;

    if (!status || !['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (approved, rejected, cancelled) is required.' });
    }

    const leaveRes = await db.query(`
      UPDATE educator_leave_requests
      SET status = $1, reviewed_by_user_id = $2, admin_notes = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `, [status, reviewerId, admin_notes || null, id]);

    if (leaveRes.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    const leave = leaveRes.rows[0];

    // Notify teacher
    const statusText = status.toUpperCase();
    NotificationService.sendToUsers({
      userIds: [leave.teacher_user_id],
      title: `📋 Leave Application ${statusText}`,
      message: `Your ${leave.leave_type} request for ${new Date(leave.start_date).toLocaleDateString('en-ZA')} to ${new Date(leave.end_date).toLocaleDateString('en-ZA')} has been ${status}.${admin_notes ? ` Notes: ${admin_notes}` : ''}`,
      type: 'leave',
      targetTab: 'my-leave'
    }).catch(e => console.error('Leave status notification error:', e));

    res.json({
      success: true,
      message: `Leave request ${status}.`,
      leave
    });
  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(500).json({ error: 'Failed to update leave status.' });
  }
};

/**
 * Admin: Get Available Relief Teachers for a Date & Period
 */
exports.getAvailableReliefTeachers = async (req, res) => {
  try {
    const { date, period_number, absent_teacher_id } = req.query;

    if (!date || !period_number) {
      return res.status(400).json({ error: 'Date and Period Number are required.' });
    }

    const pNum = parseInt(period_number, 10);
    const parsedDate = new Date(date);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[parsedDate.getDay()];

    // Query all active teachers
    const teachersQuery = `
      SELECT 
        u.id, 
        u.full_name, 
        u.surname, 
        u.email,
        COALESCE(er.name, 'Subject Educator') AS employment_title,
        COALESCE(e.subjects, '{}'::text[]) AS subjects,
        -- Check if on leave
        EXISTS (
          SELECT 1 FROM educator_leave_requests l 
          WHERE l.teacher_user_id = u.id AND l.status = 'approved' AND $1 BETWEEN l.start_date AND l.end_date
        ) AS is_on_leave,
        -- Check if already assigned relief
        EXISTS (
          SELECT 1 FROM educator_relief_allocations r
          WHERE r.relief_teacher_id = u.id AND r.relief_date = $1 AND r.period_number = $2
        ) AS has_relief_clash
      FROM users u
      JOIN roles ro ON u.role_id = ro.id
      LEFT JOIN employees e ON u.id = e.user_id
      LEFT JOIN employee_roles er ON e.employee_role_id = er.id
      WHERE LOWER(ro.name) = 'teacher'
      ORDER BY u.surname ASC, u.full_name ASC;
    `;

    const { rows } = await db.query(teachersQuery, [date, pNum]);

    const result = rows.map(t => ({
      ...t,
      is_available: !t.is_on_leave && !t.has_relief_clash && (absent_teacher_id ? t.id !== parseInt(absent_teacher_id, 10) : true)
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching available relief teachers:', err);
    res.status(500).json({ error: 'Failed to search available relief educators: ' + err.message });
  }
};

/**
 * Admin: Assign Relief Period
 */
exports.assignReliefPeriod = async (req, res) => {
  try {
    const {
      leave_request_id,
      absent_teacher_id,
      relief_teacher_id,
      relief_date,
      period_number,
      grade,
      classroom,
      subject,
      lesson_instructions
    } = req.body;

    if (!absent_teacher_id || !relief_teacher_id || !relief_date || !period_number || !grade || !subject) {
      return res.status(400).json({ error: 'Absent teacher, relief teacher, date, period, grade, and subject are required.' });
    }

    const result = await db.query(`
      INSERT INTO educator_relief_allocations (
        leave_request_id, absent_teacher_id, relief_teacher_id, relief_date, period_number, grade, classroom, subject, lesson_instructions, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'assigned')
      RETURNING *;
    `, [
      leave_request_id || null,
      absent_teacher_id,
      relief_teacher_id,
      relief_date,
      parseInt(period_number, 10),
      parseInt(grade, 10),
      classroom || 'Classroom',
      subject,
      lesson_instructions || 'Supervise study and assigned CAPS tasks.'
    ]);

    const allocation = result.rows[0];

    // Notify Relief Teacher
    const absentRes = await db.query('SELECT full_name, surname FROM users WHERE id = $1', [absent_teacher_id]);
    const absentName = absentRes.rows[0] ? `${absentRes.rows[0].full_name} ${absentRes.rows[0].surname}` : 'Educator';

    NotificationService.sendToUsers({
      userIds: [relief_teacher_id],
      title: '🚨 Relief Period Duty Allocated',
      message: `You have been allocated relief cover for ${absentName}: Period ${period_number} (${subject}, Grade ${grade}, ${classroom || 'Venue'}) on ${new Date(relief_date).toLocaleDateString('en-ZA')}.`,
      type: 'relief',
      targetTab: 'my-leave'
    }).catch(e => console.error('Relief notification error:', e));

    res.status(201).json({
      success: true,
      message: 'Relief duty assigned successfully.',
      allocation
    });
  } catch (err) {
    console.error('Error assigning relief period:', err);
    res.status(500).json({ error: 'Failed to assign relief duty: ' + err.message });
  }
};

/**
 * Admin / Staff: Get Daily Relief Roster
 */
exports.getDailyReliefRoster = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const schoolId = req.user?.is_superadmin ? null : req.user?.school_id;
    if (!req.user?.is_superadmin && !schoolId) {
      return res.status(403).json({ error: 'School context is required for the relief roster.' });
    }

    const query = `
      SELECT 
        r.*,
        absent.full_name AS absent_teacher_name,
        absent.surname AS absent_teacher_surname,
        relief.full_name AS relief_teacher_name,
        relief.surname AS relief_teacher_surname
      FROM educator_relief_allocations r
      JOIN users absent ON r.absent_teacher_id = absent.id
      JOIN users relief ON r.relief_teacher_id = relief.id
      WHERE r.relief_date = $1
        AND ($2::int IS NULL OR r.school_id = $2 OR absent.school_id = $2)
      ORDER BY r.period_number ASC, r.grade ASC;
    `;

    const { rows } = await db.query(query, [targetDate, schoolId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching daily relief roster:', err);
    res.status(500).json({ error: 'Failed to retrieve daily relief roster.' });
  }
};
