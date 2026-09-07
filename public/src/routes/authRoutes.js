const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const parentAppController = require('../controller/parentApplicationController');

const { auth: authMiddleware } = require('../../../authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/check-email', authController.checkEmail);
router.post('/check-email', authController.checkEmail);
router.post('/verify-learner', authController.verifyLearner);
router.get('/verify-learner', authController.verifyLearner);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

// Parent Portal Access Application (Public)
router.post('/parent-applications', parentAppController.submitParentApplication);

// Public test SMTP diagnostic endpoint
router.get('/test-smtp', async (req, res) => {
    try {
        const emailService = require('../services/emailService');
        const to = req.query.email || 'tshepomakola23@gmail.com';
        const testRes = await emailService.send(to, 'Fusion High Live SMTP Verification', '<p>Testing delivery from live backend.</p>');
        res.json({ success: true, testRes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
});

// Protected routes
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;