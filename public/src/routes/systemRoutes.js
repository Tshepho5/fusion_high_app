const express = require('express');
const router = express.Router();
const systemController = require('../controller/systemController');
const { auth, requireRole } = require('../../../authMiddleware');

// Public route to inspect portal lock statuses (e.g. LandingPage / RegisterPage)
router.get('/portal-locks', systemController.getPortalLocks);

// Geleza SA Executives / SuperAdmin gatekeeper toggle
router.put('/portal-locks/:id', auth, requireRole(['admin']), systemController.updatePortalLock);

module.exports = router;
