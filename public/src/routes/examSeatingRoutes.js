const express = require('express');
const router = express.Router();
const examSeatingController = require('../controller/examSeatingController');
const { auth: authenticateToken, requireRole } = require('../../../authMiddleware');

router.use(authenticateToken);

// Learner / Candidate view
router.get('/my-seats', requireRole(['learner']), examSeatingController.getLearnerExamSeats);

// Admin & Teacher management
router.post('/sessions', requireRole(['admin', 'teacher']), examSeatingController.createSession);
router.get('/sessions', requireRole(['admin', 'teacher']), examSeatingController.getSessions);
router.post('/sessions/:session_id/generate', requireRole(['admin', 'teacher']), examSeatingController.generateSeating);
router.get('/sessions/:session_id/seating', requireRole(['admin', 'teacher']), examSeatingController.getSessionSeating);
router.patch('/allocations/:allocation_id/attendance', requireRole(['admin', 'teacher']), examSeatingController.updateAttendance);

module.exports = router;
