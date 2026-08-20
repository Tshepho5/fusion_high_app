const express = require('express');
const router = express.Router();
const applicationController = require('../controller/applicationController');
const { auth: authenticateToken, isAdmin } = require('../../../authMiddleware');

// Public Admissions & Application Routes
router.post('/apply', applicationController.uploadApplicationDocs, applicationController.submitApplication);
router.get('/capacity', applicationController.getCapacity);
router.get('/resume/:token', applicationController.getApplicationByToken);
router.post('/resume/:token', applicationController.uploadApplicationDocs, applicationController.resubmitApplication);

// Admin Application Management Routes
router.get('/', authenticateToken, isAdmin, applicationController.listApplications);
router.post('/:id/decision', authenticateToken, isAdmin, applicationController.reviewApplication);

module.exports = router;
