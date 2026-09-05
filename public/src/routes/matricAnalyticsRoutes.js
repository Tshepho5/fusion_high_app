const express = require('express');
const router = express.Router();
const matricAnalyticsController = require('../controller/matricAnalyticsController');
const { auth: authenticateToken, requireRole } = require('../../../authMiddleware');

router.use(authenticateToken);

// Admin & Teachers can view Matric analytics
router.get('/projector', requireRole(['admin', 'teacher']), matricAnalyticsController.getMatricProjectorStats);
router.post('/remedial-route', requireRole(['admin', 'teacher']), matricAnalyticsController.autoRouteRemedial);

// Machine Learning Analytics Endpoints
router.get('/ml/cohort-predictions', requireRole(['admin', 'teacher']), matricAnalyticsController.getMlCohortPredictions);
router.post('/ml/predict-student', requireRole(['admin', 'teacher']), matricAnalyticsController.getMlStudentPrediction);
router.post('/ml/simulate-intervention', requireRole(['admin', 'teacher']), matricAnalyticsController.simulateIntervention);

module.exports = router;

