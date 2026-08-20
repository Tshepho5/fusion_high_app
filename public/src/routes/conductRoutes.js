const express = require('express');
const router = express.Router();
const conductController = require('../controller/conductController');
const { auth: authenticateToken, requireRole } = require('../../../authMiddleware');

router.use(authenticateToken);

// Learner route
router.get('/learner', requireRole(['learner']), conductController.getLearnerConduct);

// Parent route
router.get('/child/:child_id', requireRole(['parent', 'admin']), conductController.getChildConductForParent);

// Teacher / Admin routes
router.post('/merit', requireRole(['teacher', 'admin']), conductController.awardMerit);
router.post('/incident', requireRole(['teacher', 'admin']), conductController.recordDisciplinaryIncident);
router.get('/teacher-logs', requireRole(['teacher', 'admin']), conductController.getTeacherConductLogs);
router.patch('/detention/:id', requireRole(['teacher', 'admin']), conductController.updateDetentionStatus);

module.exports = router;
