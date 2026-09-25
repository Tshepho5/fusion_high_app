const express = require('express');
const router = express.Router();
const systemController = require('../controller/systemController');
const { auth } = require('../../../authMiddleware');

/**
 * Gatekeeper middleware: Strictly restricts access to 202247878@myturf.ul.ac.za (Master Admin)
 */
const requireMasterAdmin = (req, res, next) => {
  const email = (req.user?.email || '').toLowerCase().trim();
  const isMaster = email === '202247878@myturf.ul.ac.za' || req.user?.is_superadmin;
  if (!isMaster) {
    return res.status(403).json({
      error: 'Access restricted: Only Master Executive Admin (202247878@myturf.ul.ac.za) has authorization for this action.'
    });
  }
  next();
};

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
