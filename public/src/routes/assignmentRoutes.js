const express = require('express');
const router = express.Router();
const assignmentController = require('../controller/assignmentController');
const { auth: verifyToken, requireRole } = require('../../../authMiddleware');

// Authenticated Routes
router.use(verifyToken);

// Teacher: Create homework with optional file attachment
router.post(
  '/',
  requireRole(['teacher', 'admin']),
  assignmentController.uploadAssignmentMiddleware,
  assignmentController.createAssignment
);

// Teacher: Get created homework list with submission counters
router.get(
  '/teacher',
  requireRole(['teacher', 'admin']),
  assignmentController.getTeacherAssignments
);

// Teacher: View all submissions for an assignment
router.get(
  '/:id/submissions',
  requireRole(['teacher', 'admin']),
  assignmentController.getAssignmentSubmissions
);

// Teacher: Sign off and mark a student submission
router.post(
  '/submissions/:id/grade',
  requireRole(['teacher', 'admin']),
  assignmentController.gradeSubmission
);

// Learner: Get homework assignments for learner's grade and enrolled subjects
router.get(
  '/learner',
  requireRole(['learner']),
  assignmentController.getLearnerAssignments
);

// Learner: Submit homework with file upload or text
router.post(
  '/:id/submit',
  requireRole(['learner']),
  assignmentController.uploadSubmissionMiddleware,
  assignmentController.submitHomework
);

module.exports = router;
