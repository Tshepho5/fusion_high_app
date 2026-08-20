const db = require('../../../db/db');
const NotificationService = require('../services/notificationService');

/**
 * Admin/Teacher: Create an Exam Session
 */
exports.createSession = async (req, res) => {
  try {
    const { title, subject, grade, stream = 'All', term = 'Term 3 2026', exam_date, start_time, end_time, venue = 'Main Examination Hall', total_rows = 10, total_cols = 6 } = req.body;

    if (!title || !grade || !exam_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, grade, exam date, start time, and end time are required.' });
    }

    const totalDesks = parseInt(total_rows, 10) * parseInt(total_cols, 10);

    const result = await db.query(`
      INSERT INTO exam_sessions (title, subject, grade, stream, term, exam_date, start_time, end_time, venue, total_rows, total_cols, total_desks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `, [title, subject, parseInt(grade, 10), stream, term, exam_date, start_time, end_time, venue, parseInt(total_rows, 10), parseInt(total_cols, 10), totalDesks]);

    res.status(201).json({
      success: true,
      message: 'Examination session created successfully.',
      session: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating exam session:', err);
    res.status(500).json({ error: 'Failed to create exam session: ' + err.message });
  }
};

/**
 * Admin/Teacher: Get all Exam Sessions
 */
exports.getSessions = async (req, res) => {
  try {
    const { grade } = req.query;
    let query = `
      SELECT s.*, 
        (SELECT COUNT(*) FROM exam_seating_allocations a WHERE a.session_id = s.id) AS allocated_count
      FROM exam_sessions s
    `;
    const params = [];
    if (grade) {
      params.push(parseInt(grade, 10));
      query += ` WHERE s.grade = $${params.length}`;
    }
    query += ` ORDER BY s.exam_date ASC, s.start_time ASC;`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching exam sessions:', err);
    res.status(500).json({ error: 'Failed to retrieve exam sessions.' });
  }
};

/**
 * Admin/Teacher: Run Automated Hall Seating Allocation Algorithm
 */
exports.generateSeating = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { strategy = 'alphabetical' } = req.body; // alphabetical, stream_alternate

    const sessionRes = await db.query('SELECT * FROM exam_sessions WHERE id = $1', [session_id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Examination session not found.' });
    }

    const session = sessionRes.rows[0];

    // Fetch eligible learners
    let learnerQuery = `
      SELECT id, full_name, surname, grade, stream, learner_number, learner_user_id
      FROM children
      WHERE grade = $1
    `;
    const params = [session.grade];

    if (session.stream && session.stream !== 'All') {
      params.push(session.stream);
      learnerQuery += ` AND (stream = $2 OR stream IS NULL OR stream = 'General')`;
    }

    learnerQuery += ` ORDER BY surname ASC, full_name ASC;`;

    const { rows: learners } = await db.query(learnerQuery, params);

    if (learners.length === 0) {
      return res.status(400).json({ error: `No learners found for Grade ${session.grade} (${session.stream} Stream).` });
    }

    const maxDesks = session.total_desks || (session.total_rows * session.total_cols);
    if (learners.length > maxDesks) {
      return res.status(400).json({
        error: `Venue capacity exceeded: ${learners.length} learners require seats, but venue only has ${maxDesks} desks. Increase total rows or columns.`
      });
    }

    // Clear previous allocations for this session
    await db.query('DELETE FROM exam_seating_allocations WHERE session_id = $1', [session_id]);

    const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
    const totalCols = session.total_cols || 6;
    const allocations = [];

    for (let i = 0; i < learners.length; i++) {
      const learner = learners[i];
      const rowIdx = Math.floor(i / totalCols);
      const colIdx = (i % totalCols) + 1;
      const rowLetter = rowLetters[rowIdx] || `R${rowIdx + 1}`;
      const deskNumber = `${rowLetter}${colIdx}`;
      const candidateNumber = `2026-FUS-${session.grade}${String(learner.id).padStart(4, '0')}`;

      allocations.push({
        session_id: session.id,
        child_id: learner.id,
        desk_number: deskNumber,
        row_num: rowIdx + 1,
        col_num: colIdx,
        candidate_number: candidateNumber,
        learner_name: `${learner.full_name} ${learner.surname}`,
        learner_user_id: learner.learner_user_id
      });
    }

    // Bulk insert allocations
    for (const a of allocations) {
      await db.query(`
        INSERT INTO exam_seating_allocations (session_id, child_id, desk_number, row_num, col_num, candidate_number)
        VALUES ($1, $2, $3, $4, $5, $6);
      `, [a.session_id, a.child_id, a.desk_number, a.row_num, a.col_num, a.candidate_number]);
    }

    // Dispatch notification to learners & candidates
    const learnerUserIds = allocations.map(a => a.learner_user_id).filter(Boolean);
    if (learnerUserIds.length > 0) {
      NotificationService.sendToUsers({
        userIds: learnerUserIds,
        title: `📝 Exam Seating Published: ${session.title}`,
        message: `Your designated exam seat and Candidate Card for ${session.title} (${session.venue}) has been allocated. Check your exam desk slip.`,
        type: 'exam_seating',
        targetTab: 'exam-seating'
      }).catch(e => console.error('Exam seating notification error:', e));
    }

    res.json({
      success: true,
      message: `Successfully allocated ${allocations.length} candidate desks in ${session.venue}.`,
      total_allocated: allocations.length,
      session
    });
  } catch (err) {
    console.error('Error generating seating:', err);
    res.status(500).json({ error: 'Failed to generate seating layout: ' + err.message });
  }
};

/**
 * Admin/Teacher: Get Seating Layout for a Session
 */
exports.getSessionSeating = async (req, res) => {
  try {
    const { session_id } = req.params;

    const sessionRes = await db.query('SELECT * FROM exam_sessions WHERE id = $1', [session_id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exam session not found.' });
    }

    const allocQuery = `
      SELECT 
        a.id, a.desk_number, a.row_num, a.col_num, a.candidate_number, a.attendance_status,
        c.id AS child_id, c.full_name AS learner_name, c.surname AS learner_surname, c.grade, c.stream, c.learner_number
      FROM exam_seating_allocations a
      JOIN children c ON a.child_id = c.id
      WHERE a.session_id = $1
      ORDER BY a.row_num ASC, a.col_num ASC;
    `;

    const { rows: allocations } = await db.query(allocQuery, [session_id]);

    res.json({
      session: sessionRes.rows[0],
      allocations
    });
  } catch (err) {
    console.error('Error fetching session seating:', err);
    res.status(500).json({ error: 'Failed to retrieve session seating layout.' });
  }
};

/**
 * Learner / Candidate: Get My Exam Seating & Candidate Cards
 */
exports.getLearnerExamSeats = async (req, res) => {
  try {
    const userId = req.user.id;

    const childRes = await db.query('SELECT id, full_name, surname, grade, stream, learner_number FROM children WHERE learner_user_id = $1', [userId]);
    if (childRes.rows.length === 0) {
      return res.status(404).json({ error: 'Learner profile not found.' });
    }

    const child = childRes.rows[0];

    const query = `
      SELECT 
        a.id AS allocation_id, a.desk_number, a.row_num, a.col_num, a.candidate_number, a.attendance_status,
        s.id AS session_id, s.title, s.subject, s.grade, s.term, s.exam_date, s.start_time, s.end_time, s.venue
      FROM exam_seating_allocations a
      JOIN exam_sessions s ON a.session_id = s.id
      WHERE a.child_id = $1
      ORDER BY s.exam_date ASC, s.start_time ASC;
    `;

    const { rows } = await db.query(query, [child.id]);

    res.json({
      learner: child,
      isCandidate: child.grade === 12,
      exam_seats: rows
    });
  } catch (err) {
    console.error('Error fetching learner exam seats:', err);
    res.status(500).json({ error: 'Failed to retrieve exam seat allocations.' });
  }
};

/**
 * Update candidate exam attendance status
 */
exports.updateAttendance = async (req, res) => {
  try {
    const { allocation_id } = req.params;
    const { attendance_status } = req.body; // present, absent, excused

    await db.query('UPDATE exam_seating_allocations SET attendance_status = $1 WHERE id = $2', [attendance_status, allocation_id]);
    res.json({ success: true, message: `Candidate attendance updated to ${attendance_status}.` });
  } catch (err) {
    console.error('Error updating candidate attendance:', err);
    res.status(500).json({ error: 'Failed to update attendance.' });
  }
};
