const express = require('express');
const router = express.Router();
const applicationController = require('../controller/applicationController');
const rateLimit = require('express-rate-limit');
const { auth: authenticateToken, optionalAuth, isAdmin } = require('../../../authMiddleware');

const paymentAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many payment verification attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false }
});

// Public (or Authenticated Existing Parent) Admissions & Application Routes
router.post('/apply', optionalAuth, applicationController.uploadApplicationDocs, applicationController.submitApplication);
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

// Authenticated Applicant / Parent Application Tracking & Secure Document Upload
router.get('/my', authenticateToken, applicationController.getMyApplications);
router.post('/:id/documents', authenticateToken, applicationController.uploadSingleApplicationDoc, applicationController.uploadRequestedDocument);

// Admin Application Management & Documentation Request Routes
router.get('/', authenticateToken, isAdmin, applicationController.listApplications);
router.post('/:id/decision', authenticateToken, isAdmin, applicationController.reviewApplication);
router.post('/:id/document-requests', authenticateToken, isAdmin, applicationController.createDocumentRequest);
router.post('/:id/document-requests/:requestId/review', authenticateToken, isAdmin, applicationController.reviewDocumentRequest);

module.exports = router;

