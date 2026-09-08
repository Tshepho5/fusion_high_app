const express = require('express');
const router = express.Router();
const extracurricularController = require('../controller/extracurricularController');
const { auth: authenticateToken, requireRole } = require('../../../authMiddleware');

router.use(authenticateToken);

// Public / Authenticated views
router.get('/activities', extracurricularController.getActivities);
router.get('/activities/:id', extracurricularController.getActivityDetails);
router.get('/my-activities', requireRole(['learner']), extracurricularController.getLearnerActivities);

// Join activity (Learner, Coach, Admin)
router.post('/join', extracurricularController.joinActivity);

// Coach & Admin management
router.get('/available-coaches', requireRole(['teacher', 'admin']), extracurricularController.getAvailableCoaches);
router.post('/activities', requireRole(['teacher', 'admin']), extracurricularController.createActivity);
router.post('/activities/:id/assign-coach', requireRole(['teacher', 'admin']), extracurricularController.assignCoach);
router.post('/events', requireRole(['teacher', 'admin']), extracurricularController.createEvent);
router.patch('/events/:id/confirm', requireRole(['teacher', 'admin']), extracurricularController.confirmEvent);
router.post('/events/:id/publish-notifications', requireRole(['teacher', 'admin']), extracurricularController.publishEventNotifications);
router.post('/events/:id/add-to-calendar', requireRole(['teacher', 'admin']), extracurricularController.addEventToCalendar);
router.patch('/events/:id/score', requireRole(['teacher', 'admin']), extracurricularController.updateEventScore);

module.exports = router;
