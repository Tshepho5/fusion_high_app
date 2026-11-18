const express = require('express');
const router = express.Router();
const systemController = require('../controller/systemController');
const { auth } = require('../../../authMiddleware');
const db = require('../../../db/db');
const { createEnforceDatabaseSuperadmin } = require('../../../lib/authoritativeAccess');

const requireMasterAdmin = createEnforceDatabaseSuperadmin(
  (text, params) => db.query(text, params),
  'Access restricted to a master administrator.'
);

// 1. Portal Access Locks (Public read, Master Admin write)
router.get('/portal-locks', systemController.getPortalLocks);
router.put('/portal-locks/:id', auth, requireMasterAdmin, systemController.updatePortalLock);

// 2. Testing Users Management (Exclusive to Master Admin 202247878@myturf.ul.ac.za)
router.get('/test-users', auth, requireMasterAdmin, systemController.getTestingUsers);
router.post('/test-users', auth, requireMasterAdmin, systemController.createTestingUser);
router.put('/test-users/:id/role', auth, requireMasterAdmin, systemController.updateTesterRole);
router.post('/test-users/:id/resend', auth, requireMasterAdmin, systemController.resendTesterCredentials);
router.delete('/test-users/:id', auth, requireMasterAdmin, systemController.deleteTestingUser);

module.exports = router;
