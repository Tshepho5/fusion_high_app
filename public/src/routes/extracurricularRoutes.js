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
router.post('/activities', requireRole(['teacher', 'admin']), extracurricularController.createActivity);
router.post('/events', requireRole(['teacher', 'admin']), extracurricularController.createEvent);
router.patch('/events/:id/score', requireRole(['teacher', 'admin']), extracurricularController.updateEventScore);

module.exports = router;
