const db = require('../../../db/db');
const emailService = require('../services/emailService');

/**
 * Teacher: Create Consultation Availability Slots
 */
exports.createSlots = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { date, start_time, end_time, slot_duration_minutes = 15, meeting_type = 'in_person', meeting_location_or_link = 'Classroom' } = req.body;

    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Date, start time, and end time are required.' });
    }

    const result = await db.query(`
      INSERT INTO ptc_slots (teacher_user_id, date, start_time, end_time, slot_duration_minutes, meeting_type, meeting_location_or_link)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [teacherId, date, start_time, end_time, slot_duration_minutes, meeting_type, meeting_location_or_link]);

    res.status(201).json({
      success: true,
      message: 'Consultation slot created successfully.',
      slot: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating PTC slot:', err);
    res.status(500).json({ error: 'Failed to create conference slot: ' + err.message });
  }
};

/**
 * Teacher: Get all slots created by the logged-in teacher with booking details
 */
exports.getTeacherSlots = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const query = `
      SELECT 
        s.id, s.date, s.start_time, s.end_time, s.slot_duration_minutes, 
        s.meeting_type, s.meeting_location_or_link, s.is_active, s.created_at,
        b.id AS booking_id, b.subject, b.parent_notes, b.teacher_notes, b.status AS booking_status,
        c.full_name AS learner_name, c.surname AS learner_surname, c.grade AS learner_grade, c.learner_number,
        pu.full_name AS parent_name, pu.surname AS parent_surname, pu.email AS parent_email, pu.phone AS parent_phone
      FROM ptc_slots s
      LEFT JOIN ptc_bookings b ON s.id = b.slot_id AND b.status != 'cancelled'
      LEFT JOIN children c ON b.child_id = c.id
      LEFT JOIN users pu ON b.parent_user_id = pu.id
      WHERE s.teacher_user_id = $1
      ORDER BY s.date ASC, s.start_time ASC;
    `;

    const { rows } = await db.query(query, [teacherId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching teacher PTC slots:', err);
    res.status(500).json({ error: 'Failed to retrieve consultation slots.' });
  }
};

/**
 * Teacher: Delete a consultation slot
 */
exports.deleteSlot = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;

    const slotCheck = await db.query('SELECT id FROM ptc_slots WHERE id = $1 AND teacher_user_id = $2', [id, teacherId]);
    if (slotCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found or unauthorized.' });
    }

    await db.query('DELETE FROM ptc_slots WHERE id = $1', [id]);
    res.json({ success: true, message: 'Consultation slot deleted successfully.' });
  } catch (err) {
    console.error('Error deleting PTC slot:', err);
    res.status(500).json({ error: 'Failed to delete slot.' });
  }
};

/**
 * Parent: Get available slots across teachers / subjects for the parent's children
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { teacher_id, subject } = req.query;

    let query = `
      SELECT 
        s.id, s.date, s.start_time, s.end_time, s.slot_duration_minutes, 
        s.meeting_type, s.meeting_location_or_link, s.teacher_user_id,
        tu.full_name AS teacher_name, tu.surname AS teacher_surname, tu.email AS teacher_email,
        e.subjects AS teacher_subjects,
        (SELECT COUNT(*) FROM ptc_bookings b WHERE b.slot_id = s.id AND b.status != 'cancelled') AS booked_count
      FROM ptc_slots s
      JOIN users tu ON s.teacher_user_id = tu.id
      LEFT JOIN employees e ON e.user_id = tu.id
      WHERE s.is_active = TRUE AND s.date >= CURRENT_DATE
    `;

    const params = [];
    if (teacher_id) {
      params.push(teacher_id);
      query += ` AND s.teacher_user_id = $${params.length}`;
    }

    query += ` ORDER BY s.date ASC, s.start_time ASC;`;

    const { rows } = await db.query(query, params);
    // Filter out fully booked slots (max 1 booking per slot)
    const available = rows.filter(r => parseInt(r.booked_count, 10) === 0);
    res.json(available);
  } catch (err) {
    console.error('Error fetching available PTC slots:', err);
    res.status(500).json({ error: 'Failed to retrieve available slots.' });
  }
};

/**
 * Parent: Book a consultation slot for a child & subject
 */
exports.bookSlot = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { slot_id, child_id, subject, parent_notes } = req.body;

    if (!slot_id || !child_id || !subject) {
      return res.status(400).json({ error: 'Slot ID, child ID, and subject are required.' });
    }

    // Verify slot availability
    const slotRes = await db.query(`
      SELECT s.*, u.full_name AS teacher_name, u.surname AS teacher_surname, u.email AS teacher_email 
      FROM ptc_slots s 
      JOIN users u ON s.teacher_user_id = u.id 
      WHERE s.id = $1 AND s.is_active = TRUE
    `, [slot_id]);

    if (slotRes.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation slot not found or inactive.' });
    }

    const slot = slotRes.rows[0];

    // Check if already booked
    const existing = await db.query(`
      SELECT id FROM ptc_bookings WHERE slot_id = $1 AND status != 'cancelled'
    `, [slot_id]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This consultation slot has already been booked by another parent.' });
    }

    // Check child belongs to parent
    const childRes = await db.query(`
      SELECT id, full_name, surname, grade, learner_number 
      FROM children 
      WHERE id = $1 AND (parent_id = $2 OR secondary_parent_id = $2 OR EXISTS (SELECT 1 FROM parent_children WHERE child_id = $1 AND parent_id = $2))
    `, [child_id, parentId]);

    if (childRes.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized child selection.' });
    }

    const child = childRes.rows[0];

    const bookingRes = await db.query(`
      INSERT INTO ptc_bookings (slot_id, parent_user_id, child_id, subject, parent_notes, status)
      VALUES ($1, $2, $3, $4, $5, 'confirmed')
      RETURNING *;
    `, [slot_id, parentId, child_id, subject, parent_notes || '']);

    const parentUserRes = await db.query('SELECT full_name, surname, email FROM users WHERE id = $1', [parentId]);
    const parentUser = parentUserRes.rows[0] || {};
    const parentName = parentUser.full_name ? `${parentUser.full_name} ${parentUser.surname}` : 'A Parent';
    const parentEmail = parentUser.email;
    const formattedDate = new Date(slot.date).toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' });
    const teacherName = `${slot.teacher_name} ${slot.teacher_surname}`;

    // Trigger in-app notification to Teacher
    const NotificationService = require('../services/notificationService');
    NotificationService.sendToUsers({
      userIds: [slot.teacher_user_id],
      title: '📅 New Parent Consultation Booked',
      message: `Parent ${parentName} booked a consultation for ${child.full_name} ${child.surname} (Grade ${child.grade}) in ${subject} on ${formattedDate} at ${slot.start_time}.`,
      type: 'ptc',
      targetTab: 'ptc'
    }).catch(e => console.error('PTC notification error (teacher):', e));

    // Send email to Teacher
    if (slot.teacher_email) {
      emailService.sendConsultationBookedNotice({
        recipientName: teacherName,
        otherPartyName: `Parent: ${parentName}`,
        learnerName: `${child.full_name} ${child.surname} (Grade ${child.grade})`,
        subjectName: subject,
        date: formattedDate,
        timeSlot: `${slot.start_time} - ${slot.end_time || slot.start_time}`,
        meetingLink: slot.meeting_location_or_link
      }).catch(err => console.warn('[PTC TEACHER EMAIL ERROR]:', err.message));
    }

    // Trigger in-app confirmation notification to Parent
    NotificationService.sendToUsers({
      userIds: [parentId],
      title: '📅 Consultation Confirmed',
      message: `Your consultation with Educator ${teacherName} for ${child.full_name} is confirmed for ${formattedDate} at ${slot.start_time}.`,
      type: 'ptc',
      targetTab: 'ptc'
    }).catch(e => console.error('PTC notification error (parent):', e));

    // Send email to Parent
    if (parentEmail) {
      emailService.sendConsultationBookedNotice({
        recipientName: parentName,
        otherPartyName: `Educator: ${teacherName}`,
        learnerName: `${child.full_name} ${child.surname}`,
        subjectName: subject,
        date: formattedDate,
        timeSlot: `${slot.start_time} - ${slot.end_time || slot.start_time}`,
        meetingLink: slot.meeting_location_or_link
      }).catch(err => console.warn('[PTC PARENT EMAIL ERROR]:', err.message));
    }

    res.status(201).json({
      success: true,
      message: `Consultation confirmed with ${teacherName} on ${formattedDate} at ${slot.start_time}. Email confirmations sent!`,
      booking: bookingRes.rows[0]
    });
  } catch (err) {
    console.error('Error booking PTC slot:', err);
    res.status(500).json({ error: 'Failed to book consultation: ' + err.message });
  }
};

/**
 * Parent: Get all bookings made by the logged-in parent
 */
exports.getParentBookings = async (req, res) => {
  try {
    const parentId = req.user.id;

    const query = `
      SELECT 
        b.id, b.slot_id, b.subject, b.parent_notes, b.teacher_notes, b.status, b.created_at,
        s.date, s.start_time, s.end_time, s.meeting_type, s.meeting_location_or_link,
        tu.full_name AS teacher_name, tu.surname AS teacher_surname, tu.email AS teacher_email,
        c.full_name AS learner_name, c.surname AS learner_surname, c.grade AS learner_grade, c.learner_number
      FROM ptc_bookings b
      JOIN ptc_slots s ON b.slot_id = s.id
      JOIN users tu ON s.teacher_user_id = tu.id
      JOIN children c ON b.child_id = c.id
      WHERE b.parent_user_id = $1
      ORDER BY s.date DESC, s.start_time DESC;
    `;

    const { rows } = await db.query(query, [parentId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching parent PTC bookings:', err);
    res.status(500).json({ error: 'Failed to retrieve bookings.' });
  }
};

/**
 * Cancel a booking (Parent or Teacher)
 */
exports.cancelBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const bookingRes = await db.query(`
      SELECT b.id, b.parent_user_id, b.subject, s.teacher_user_id, s.date, s.start_time,
             tu.full_name AS teacher_name, tu.surname AS teacher_surname,
             pu.full_name AS parent_name, pu.surname AS parent_surname,
             c.full_name AS learner_name, c.surname AS learner_surname
      FROM ptc_bookings b 
      JOIN ptc_slots s ON b.slot_id = s.id 
      JOIN users tu ON s.teacher_user_id = tu.id
      JOIN users pu ON b.parent_user_id = pu.id
      JOIN children c ON b.child_id = c.id
      WHERE b.id = $1
    `, [id]);

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];
    if (booking.parent_user_id !== userId && booking.teacher_user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to cancel this conference.' });
    }

    await db.query(`UPDATE ptc_bookings SET status = 'cancelled' WHERE id = $1`, [id]);

    const NotificationService = require('../services/notificationService');
    const recipientId = userId === booking.parent_user_id ? booking.teacher_user_id : booking.parent_user_id;
    const cancellerName = userId === booking.parent_user_id ? `${booking.parent_name} ${booking.parent_surname}` : `Educator ${booking.teacher_name} ${booking.teacher_surname}`;

    NotificationService.sendToUsers({
      userIds: [recipientId],
      title: 'PTC Consultation Cancelled',
      message: `The consultation for ${booking.learner_name} (${booking.subject}) scheduled for ${new Date(booking.date).toLocaleDateString()} at ${booking.start_time} was cancelled by ${cancellerName}.`,
      type: 'ptc',
      targetTab: 'ptc'
    }).catch(e => console.error('PTC cancellation notification error:', e));

    res.json({ success: true, message: 'Consultation booking cancelled successfully.' });
  } catch (err) {
    console.error('Error cancelling PTC booking:', err);
    res.status(500).json({ error: 'Failed to cancel booking.' });
  }
};
