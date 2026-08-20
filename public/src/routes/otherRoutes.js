const express = require('express');
const router = express.Router();
const announcementController = require('../controller/announcementController');
const progressController = require('../controller/progressController');
const taskController = require('../controller/taskController');
const scheduleController = require('../controller/schedule');
const learnerController = require('../controller/learnerController');
const { auth } = require('../../../authMiddleware');

// These routes are protected but accessible by various roles.
// Role-specific logic is handled within the controllers.

// Announcements
router.post('/announcements', auth, announcementController.createAnnouncement);
router.get('/announcements', auth, announcementController.getAnnouncements);
router.delete('/announcements/:id', auth, announcementController.deleteAnnouncement);

// Progress & Official Reports
router.get('/learner/progress', auth, progressController.getLearnerProgress);
router.get('/progress/:childId', auth, progressController.getChildProgress);
router.get('/reports/caps-report-card', auth, progressController.getCapsReportCardData);

// Task Management Routes
router.get('/tasks/dashboard', auth, taskController.getLearnerDashboardTasks);
router.post('/tasks/submit', auth, taskController.submitTask);

router.use('/schedule', auth, scheduleController);

// AI Compatibility Layer (mapped from frontend /api/ai/...)
router.get('/ai/task', auth, learnerController.getTask);
router.post('/ai/grade-task', auth, learnerController.gradeAITask);
router.get('/ai/leaderboard', auth, learnerController.getLeaderboard);

module.exports = router;