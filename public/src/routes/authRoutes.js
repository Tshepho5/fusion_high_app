const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const webauthnController = require('../controller/webauthnController');
const parentAppController = require('../controller/parentApplicationController');

const { auth: authMiddleware } = require('../../../authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/check-login-account', authController.checkLoginAccount);
router.post('/check-account', authController.checkLoginAccount);
router.get('/check-account', authController.checkLoginAccount);
router.get('/check-email', authController.checkEmail);
router.post('/check-email', authController.checkEmail);
router.post('/verify-learner', authController.verifyLearner);
router.get('/verify-learner', authController.verifyLearner);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);
router.post('/webauthn/login/options', webauthnController.loginOptions);
router.post('/webauthn/login/verify', webauthnController.loginVerify);
router.all('/sync-roster', async (req, res) => {
    try {
        const { migrateSchoolOnboardingAndCleanRoster } = require('../../../db/migrate_school_onboarding_and_clean_roster');
        await migrateSchoolOnboardingAndCleanRoster();
        res.json({ success: true, message: 'Roster synced successfully' });
    } catch (err) {
        console.error('Sync roster route error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Parent Portal Access Application (Public)
router.post('/parent-applications', parentAppController.submitParentApplication);
router.post('/parent-applications/verify-child', parentAppController.verifyEnrolledChild);

// Protected routes
router.post('/change-password', authMiddleware, authController.changePassword);
router.get('/webauthn/status', authMiddleware, webauthnController.status);
router.post('/webauthn/register/options', authMiddleware, webauthnController.registerOptions);
router.post('/webauthn/register/verify', authMiddleware, webauthnController.registerVerify);
router.post('/webauthn/disable', authMiddleware, webauthnController.disable);

module.exports = router;