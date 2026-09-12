const express = require('express');
const router = express.Router();
const reportCardController = require('../controller/reportCardController');
const { auth, requireRole, isAdmin } = require('../../../authMiddleware');

router.use(auth);

// Get compiled report cards for learner or parent
router.get('/learner', reportCardController.getLearnerReportCards);

// Get single official report card view (Admin, Teacher, Parent, Learner)
router.get('/view-card', reportCardController.getOfficialReportCardView);
router.get('/view/:childId', reportCardController.getOfficialReportCardView);

// Fetch Report Card Template Data populated with calculated teacher marks and assessment percentages (Admin)
router.get('/grade-template', requireRole(['admin']), reportCardController.getGradeTemplateMarks);

// Save and compile verified Grade Report Cards into database (Admin)
router.post('/save-grade-template', requireRole(['admin']), reportCardController.saveGradeReportCardTemplate);
router.post('/compile', requireRole(['admin', 'teacher']), reportCardController.saveGradeReportCardTemplate);

// Publish Grade Report Cards to Parents & Teachers and dispatch email notifications with login redirect (Admin)
router.post('/publish-grade-reports', requireRole(['admin']), reportCardController.publishGradeReportCards);
router.post('/batch-compile-and-email', requireRole(['admin']), reportCardController.publishGradeReportCards);

module.exports = router;
