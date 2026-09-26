const express = require('express');
const router = express.Router();
const applicationController = require('../controller/applicationController');
const { auth: authenticateToken, isAdmin } = require('../../../authMiddleware');

// Public Admissions & Application Routes
router.post('/apply', applicationController.uploadApplicationDocs, applicationController.submitApplication);
router.get('/capacity', applicationController.getCapacity);
router.get('/resume/:token', applicationController.getApplicationByToken);
router.post('/resume/:token', applicationController.uploadApplicationDocs, applicationController.resubmitApplication);

// Payment & Enrollment Finalization Routes
router.post('/:id/pay-application-fee', applicationController.payApplicationFee);
router.post('/:id/pay-registration-fee', applicationController.payRegistrationFeeAndFinalize);

// Automated Reminders
router.get('/cron/reminders', applicationController.triggerFeeReminders);
router.post('/cron/reminders', applicationController.triggerFeeReminders);

// Admin Application Management Routes
router.get('/', authenticateToken, isAdmin, applicationController.listApplications);
router.post('/:id/decision', authenticateToken, isAdmin, applicationController.reviewApplication);

module.exports = router;

