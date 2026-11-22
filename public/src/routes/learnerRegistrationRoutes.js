'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../../../authMiddleware');
const controller = require('../controller/learnerRegistrationController');

// Authenticated Parent / Learner integrated registration endpoints
router.get('/my', auth, controller.getMyRegistrations);
router.get('/applications/:applicationId/context', auth, controller.getRegistrationContext);
router.post('/applications/:applicationId/complete', auth, controller.completeRegistration);
router.get('/applications/:applicationId/acceptance-letter', auth, controller.downloadAcceptanceLetter);

// Phase M2.4 — Authenticated Parent-initiated short-lived single-use Learner Password Setup / Reset Handoff
router.post('/applications/:applicationId/learner-setup-session', auth, controller.createLearnerSetupSession);
router.post('/children/:childId/learner-reset-session', auth, controller.createLearnerResetSession);

// School Admin / Principal registration oversight
router.get('/school', auth, controller.getSchoolDashboard);

// Controlled Deregistration & Transfer Workflow
router.get('/deregistrations', auth, controller.listDeregistrations);
router.post('/deregistrations', auth, controller.createDeregistration);
router.post('/deregistrations/:id/teacher-review', auth, controller.teacherReviewDeregistration);
router.post('/deregistrations/:id/decision', auth, controller.adminDecideDeregistration);

module.exports = router;
