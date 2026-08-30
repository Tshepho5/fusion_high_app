const db = require('../../../db/db');
const emailService = require('../services/emailService');

/**
 * Returns available consultation time slots for a specific educator on a date.
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { teacher_id, date } = req.query;
    if (!teacher_id || !date) {
      return res.status(400).json({ error: 'Teacher ID and Date are required to check consultation slots.' });
    }

    const tId = parseInt(teacher_id, 10);
    // Standard afternoon consultation slots: 14:00, 14:20, 14:40, 15:00, 15:20, 15:40, 16:00, 16:20, 16:40
    const standardSlots = [
      { start_time: '14:00', end_time: '14:20' },
      { start_time: '14:20', end_time: '14:40' },
      { start_time: '14:40', end_time: '15:00' },
      { start_time: '15:00', end_time: '15:20' },
      { start_time: '15:20', end_time: '15:40' },
      { start_time: '15:40', end_time: '16:00' },
      { start_time: '16:00', end_time: '16:20' },
      { start_time: '16:20', end_time: '16:40' }
    ];

    // Query booked slots from database
    const bookedQuery = `
      SELECT start_time 
      FROM teacher_consultations
      WHERE teacher_id = $1 AND consultation_date = $2 AND status != 'cancelled';
    `;
    const { rows: bookedRows } = await db.query(bookedQuery, [tId, date]);
    const bookedTimes = new Set(bookedRows.map(r => r.start_time));

    const slots = standardSlots.map(s => ({
      ...s,
      is_available: !bookedTimes.has(s.start_time)
    }));

    res.json({ success: true, date, teacher_id: tId, slots });
  } catch (err) {
    console.error('Error fetching consultation slots:', err);
    res.status(500).json({ error: 'Failed to retrieve consultation slots: ' + err.message });
  }
};

/**
 * Parent books a consultation slot with their child's subject teacher.
 */
exports.bookConsultation = async (req, res) => {
  try {
    const parentId = req.user.id;
    const {
      teacher_id,
      child_id,
      subject,
      consultation_date,
      start_time,
      end_time,
      venue_or_link,
      parent_notes
    } = req.body;

    if (!teacher_id || !consultation_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Teacher, Date, and Time Slot are required.' });
    }

    const tId = parseInt(teacher_id, 10);
    const cId = child_id ? parseInt(child_id, 10) : null;

    // Check if slot is already taken
    const conflictCheck = await db.query(
      `SELECT id FROM teacher_consultations 
       WHERE teacher_id = $1 AND consultation_date = $2 AND start_time = $3 AND status != 'cancelled'`,
      [tId, consultation_date, start_time]
    );

    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ error: 'This consultation time slot has just been booked. Please select another slot.' });
    }

    // Fetch school_id, teacher details, parent details, child details
    const teacherRes = await db.query(`SELECT full_name, surname, email, school_id FROM users WHERE id = $1`, [tId]);
    const teacher = teacherRes.rows[0] || {};

    const parentRes = await db.query(`SELECT full_name, surname, email FROM users WHERE id = $1`, [parentId]);
    const parent = parentRes.rows[0] || {};

    let childName = 'Student';
    if (cId) {
      const childRes = await db.query(`SELECT full_name, surname, grade FROM children WHERE id = $1`, [cId]);
      if (childRes.rows[0]) {
        childName = `${childRes.rows[0].full_name} ${childRes.rows[0].surname} (Grade ${childRes.rows[0].grade})`;
      }
    }

    const schoolId = teacher.school_id || req.user.school_id || 1;

    const insertQuery = `
      INSERT INTO teacher_consultations (
        school_id, teacher_id, parent_id, child_id, subject,
        consultation_date, start_time, end_time, venue_or_link, parent_notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled')
      RETURNING *;
    `;

    const { rows } = await db.query(insertQuery, [
      schoolId,
      tId,
      parentId,
      cId,
      subject || 'General Academic Consultation',
      consultation_date,
      start_time,
      end_time,
      venue_or_link || 'Educator Office / Virtual Room',
      parent_notes || null
    ]);

    const booking = rows[0];

    // Dispatch automated email notifications to teacher and parent
    try {
      if (teacher.email) {
        await emailService.sendConsultationBookedNotice({
          email: teacher.email,
          teacherName: `${teacher.full_name} ${teacher.surname}`,
          parentName: `${parent.full_name} ${parent.surname}`,
          learnerName: childName,
          subject: subject || 'Academic Progress',
          consultationDate: consultation_date,
          timeSlot: `${start_time} - ${end_time}`,
          venue: venue_or_link || 'School Educator Office',
          notes: parent_notes
        });
      }
      if (parent.email) {
        await emailService.sendConsultationBookedNotice({
          email: parent.email,
          teacherName: `${teacher.full_name} ${teacher.surname}`,
          parentName: `${parent.full_name} ${parent.surname}`,
          learnerName: childName,
          subject: subject || 'Academic Progress',
          consultationDate: consultation_date,
          timeSlot: `${start_time} - ${end_time}`,
          venue: venue_or_link || 'School Educator Office',
          notes: parent_notes
        });
      }
    } catch (mailErr) {
      console.warn('Consultation email notification warning:', mailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Consultation session scheduled successfully. Confirmation emails sent.',
      consultation: booking
    });
  } catch (err) {
    console.error('Error booking consultation:', err);
    res.status(500).json({ error: 'Failed to book consultation: ' + err.message });
  }
};

/**
 * Returns consultations for the logged-in user (Educator, Parent, or Admin).
 */
exports.getMyConsultations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const schoolId = req.user.school_id || 1;

    let query = `
      SELECT 
        tc.*,
        t.full_name AS teacher_first_name,
        t.surname AS teacher_surname,
        t.email AS teacher_email,
        t.phone AS teacher_phone,
        p.full_name AS parent_first_name,
        p.surname AS parent_surname,
        p.email AS parent_email,
        p.phone AS parent_phone,
        c.full_name AS child_first_name,
        c.surname AS child_surname,
        c.grade AS child_grade,
        c.learner_number
      FROM teacher_consultations tc
      JOIN users t ON tc.teacher_id = t.id
      JOIN users p ON tc.parent_id = p.id
      LEFT JOIN children c ON tc.child_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'teacher') {
      params.push(userId);
      query += ` AND tc.teacher_id = $${params.length}`;
    } else if (userRole === 'parent') {
      params.push(userId);
      query += ` AND tc.parent_id = $${params.length}`;
    } else if (userRole === 'admin' && !req.user.is_superadmin) {
      params.push(schoolId);
      query += ` AND tc.school_id = $${params.length}`;
    }

    query += ` ORDER BY tc.consultation_date DESC, tc.start_time ASC;`;

    const { rows } = await db.query(query, params);
    res.json({ success: true, consultations: rows });
  } catch (err) {
    console.error('Error fetching consultations:', err);
    res.status(500).json({ error: 'Failed to retrieve consultations: ' + err.message });
  }
};

/**
 * Updates consultation status or adds educator feedback notes.
 */
exports.updateConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, teacher_notes, venue_or_link } = req.body;

    const query = `
      UPDATE teacher_consultations
      SET 
        status = COALESCE($1, status),
        teacher_notes = COALESCE($2, teacher_notes),
        venue_or_link = COALESCE($3, venue_or_link)
      WHERE id = $4
      RETURNING *;
    `;

    const { rows } = await db.query(query, [
      status || null,
      teacher_notes || null,
      venue_or_link || null,
      parseInt(id, 10)
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Consultation record not found.' });
    }

    res.json({
      success: true,
      message: 'Consultation updated successfully.',
      consultation: rows[0]
    });
  } catch (err) {
    console.error('Error updating consultation:', err);
    res.status(500).json({ error: 'Failed to update consultation: ' + err.message });
  }
};
