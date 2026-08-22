const express = require('express');
const router = express.Router();
const matricAnalyticsController = require('../controller/matricAnalyticsController');
const { auth: authenticateToken, requireRole } = require('../../../authMiddleware');

router.use(authenticateToken);

// Admin & Teachers can view Matric analytics
router.get('/projector', requireRole(['admin', 'teacher']), matricAnalyticsController.getMatricProjectorStats);
router.post('/remedial-route', requireRole(['admin', 'teacher']), matricAnalyticsController.autoRouteRemedial);

module.exports = router;
