const express = require('express');
const router = express.Router();
const bursaryController = require('../controller/bursaryController');
const { auth } = require('../../../authMiddleware');

router.get('/', auth, bursaryController.getBursaries);
router.get('/matches', auth, bursaryController.getLearnerMatches);
router.post('/track', auth, bursaryController.trackBursary);

module.exports = router;
