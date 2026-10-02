const express = require('express');
const router = express.Router();
const schoolController = require('../controller/schoolController');
const { auth, requireRole } = require('../../../authMiddleware');

// Public school application route (Principal registration)
router.post('/apply', schoolController.applySchool);

const requireMasterAdmin = (req, res, next) => {
  if (!req.user?.is_superadmin) {
    return res.status(403).json({ error: 'Only Geleza SA can review a school registration.' });
  }
  next();
};

// Geleza SA reviews principal registrations. A school principal cannot approve a school.
router.get('/applications/all', auth, requireMasterAdmin, schoolController.getSchoolApplications);
router.post('/applications/:id/decision', auth, requireMasterAdmin, schoolController.reviewSchoolApplication);

// Public route to list schools and view current active school
router.get('/', schoolController.getAllSchools);
router.get('/current', schoolController.getCurrentSchool);
router.get('/check-language', schoolController.checkLanguageOffer);
router.get('/:slug', schoolController.getSchoolBySlug);

// Admin-only route to update school settings and colors
router.put('/:id/branding', auth, requireRole(['admin']), schoolController.updateSchoolBranding);
router.put('/:id/modules', auth, requireRole(['admin']), schoolController.updateSchoolModules);
router.get('/:id/banking', auth, requireRole(['admin']), schoolController.getSchoolBank);
router.put('/:id/banking', auth, requireRole(['admin']), schoolController.updateSchoolBank);

module.exports = router;
