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

// Protected routes
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;