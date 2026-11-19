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

// 2. Tester invitations. Acceptance is public. Management stays with a database superadmin.
router.get('/tester-invites/verify', systemController.verifyTesterInvite);
router.post('/tester-invites/accept', systemController.acceptTesterInvite);
router.get('/tester-reports/mine', auth, systemController.listMyTesterReports);
router.post('/tester-reports', auth, systemController.createTesterReport);

router.get('/test-users', auth, requireMasterAdmin, systemController.getTestingUsers);
router.get('/test-programme', auth, requireMasterAdmin, systemController.getTesterProgramme);
router.post('/test-users', auth, requireMasterAdmin, systemController.createTestingUser);
router.put('/test-users/:id/role', auth, requireMasterAdmin, systemController.updateTesterRole);
router.post('/test-users/:id/resend', auth, requireMasterAdmin, systemController.resendTesterCredentials);
router.delete('/test-users/legacy/:id', auth, requireMasterAdmin, systemController.deleteLegacyTester);
router.delete('/test-users/:id', auth, requireMasterAdmin, systemController.deleteTestingUser);
router.get('/tester-reports', auth, requireMasterAdmin, systemController.listTesterReports);
router.put('/tester-reports/:id', auth, requireMasterAdmin, systemController.updateTesterReport);

module.exports = router;
