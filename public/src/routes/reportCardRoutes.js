const express = require('express');
const router = express.Router();
const reportCardController = require('../controller/reportCardController');
const { auth, requireRole } = require('../../../authMiddleware');

router.use(auth);

// Get compiled report cards for learner or parent
router.get('/learner', reportCardController.getLearnerReportCards);

// Compile a single report card (Admin / Teacher)
router.post('/compile', requireRole(['admin', 'teacher']), reportCardController.compileReportCard);

// Batch compile and dispatch report cards to parents via email (Admin)
router.post('/batch-compile-and-email', requireRole(['admin']), reportCardController.batchCompileAndEmailReportCards);

module.exports = router;
