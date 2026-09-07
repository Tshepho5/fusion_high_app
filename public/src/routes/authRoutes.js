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

// Public test SMTP diagnostic endpoint (probes TCP ports in 3s)
router.get('/test-smtp', async (req, res) => {
    const net = require('net');
    const checkPort = (port) => new Promise((resolve) => {
        const s = net.connect(port, 'smtp.gmail.com');
        s.setTimeout(4000);
        s.on('connect', () => { s.destroy(); resolve({ port, open: true }); });
        s.on('timeout', () => { s.destroy(); resolve({ port, open: false, error: 'ETIMEDOUT (port blocked by host)' }); });
        s.on('error', (e) => { resolve({ port, open: false, error: e.message }); });
    });

    const [p587, p465, p25] = await Promise.all([
        checkPort(587),
        checkPort(465),
        checkPort(25)
    ]);

    res.json({
        host: 'smtp.gmail.com',
        timestamp: new Date().toISOString(),
        results: { port587: p587, port465: p465, port25: p25 }
    });
});

// Protected routes
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;