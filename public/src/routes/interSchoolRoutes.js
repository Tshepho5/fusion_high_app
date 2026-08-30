const express = require('express');
const router = express.Router();
const interSchoolController = require('../controller/interSchoolController');
const { auth, requireRole } = require('../../../authMiddleware');

// Public or Authenticated: Get All Inter-School Competitions & Leaderboard
router.get('/', auth, interSchoolController.getCompetitions);
router.get('/leaderboard', auth, interSchoolController.getLeaderboard);

// Admin & Educator Actions: Schedule Fixture & Update Scores
router.post('/', auth, requireRole(['admin', 'teacher']), interSchoolController.createCompetition);
router.put('/:id', auth, requireRole(['admin', 'teacher']), interSchoolController.updateScoreAndStatus);

module.exports = router;
