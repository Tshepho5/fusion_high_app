const express = require('express');
const router = express.Router();
const behaviorMlController = require('../controller/behaviorMlController');
const { auth: authenticateToken } = require('../../../authMiddleware');

router.get('/personas', behaviorMlController.getPersonasCatalogue);

router.use(authenticateToken);
router.post('/simulate', behaviorMlController.simulateIntervention);

// Learner prediction (single subject or full 7-subject profile)
router.get('/learner/:childId', behaviorMlController.getLearnerPrediction);
router.post('/learner/predict', behaviorMlController.getLearnerPrediction);

// Class cohort prediction
router.get('/class/:classId', behaviorMlController.getClassPrediction);

module.exports = router;
