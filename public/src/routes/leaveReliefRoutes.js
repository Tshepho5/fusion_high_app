const express = require('express');
const router = express.Router();
const leaveReliefController = require('../controller/leaveReliefController');
const { auth: authenticateToken, requireRole } = require('../../../authMiddleware');

router.use(authenticateToken);

// Teacher operations
router.post('/apply', requireRole(['teacher', 'admin']), leaveReliefController.submitLeaveRequest);
router.get('/my-leave', requireRole(['teacher']), leaveReliefController.getTeacherMyLeave);

// Admin & Staff operations
router.get('/requests', requireRole(['teacher', 'admin']), leaveReliefController.getLeaveRequests);
router.patch('/requests/:id/status', requireRole(['admin']), leaveReliefController.updateLeaveStatus);
router.get('/available-teachers', requireRole(['teacher', 'admin']), leaveReliefController.getAvailableReliefTeachers);
router.post('/assign-relief', requireRole(['admin']), leaveReliefController.assignReliefPeriod);
router.get('/daily-roster', leaveReliefController.getDailyReliefRoster);

module.exports = router;
