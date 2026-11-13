const express = require('express');
const router = express.Router();
const applicationController = require('../controller/applicationController');
const rateLimit = require('express-rate-limit');
const { auth: authenticateToken, isAdmin } = require('../../../authMiddleware');

const paymentAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many payment verification attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false }
});

// Public Admissions & Application Routes
router.post('/apply', applicationController.uploadApplicationDocs, applicationController.submitApplication);
router.get('/capacity', applicationController.getCapacity);
router.get('/resume/:token', applicationController.getApplicationByToken);
router.post('/resume/:token', applicationController.uploadApplicationDocs, applicationController.resubmitApplication);

router.post('/payment-access/request', paymentAccessLimiter, applicationController.requestPaymentAccess);
router.post('/payment-access/confirm', paymentAccessLimiter, applicationController.confirmPaymentAccess);

// Payment & Enrollment Finalization Routes
router.post('/:id/pay-application-fee', applicationController.payApplicationFee);
router.post('/:id/pay-registration-fee', applicationController.payRegistrationFeeAndFinalize);
router.post('/:id/confirm-receipt', authenticateToken, isAdmin, applicationController.confirmSchoolReceipt);

// Fee reminders run on the server schedule. An admin can still trigger them by hand.
router.get('/cron/reminders', authenticateToken, isAdmin, applicationController.triggerFeeReminders);
router.post('/cron/reminders', authenticateToken, isAdmin, applicationController.triggerFeeReminders);

// Admin Application Management Routes
router.get('/', authenticateToken, isAdmin, applicationController.listApplications);
router.post('/:id/decision', authenticateToken, isAdmin, applicationController.reviewApplication);

module.exports = router;

