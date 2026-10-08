const express = require('express');
const router = express.Router();
const schoolController = require('../controller/schoolController');
const { auth, requireRole } = require('../../../authMiddleware');

// Public school application route (Principal registration)
router.post('/apply', schoolController.applySchool);

const canReviewSchoolRegistrations = (req, res, next) => {
  const isSuper = Boolean(req.user?.is_superadmin);
  if (isSuper) {
    return next();
  }
  return res.status(403).json({ error: 'Only Geleza SA platform administrators can review school admissions and registrations.' });
};

// Geleza SA and system administrators review principal registrations.
router.get('/applications/all', auth, canReviewSchoolRegistrations, schoolController.getSchoolApplications);
router.post('/applications/:id/decision', auth, canReviewSchoolRegistrations, schoolController.reviewSchoolApplication);

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
