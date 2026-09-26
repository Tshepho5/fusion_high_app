const express = require('express');
const router = express.Router();
const schoolController = require('../controller/schoolController');
const { auth, requireRole } = require('../../../authMiddleware');

// Public school application route (Principal registration)
router.post('/apply', schoolController.applySchool);

// Executive / SuperAdmin school application oversight & decisions
router.get('/applications/all', auth, requireRole(['admin']), schoolController.getSchoolApplications);
router.post('/applications/:id/decision', auth, requireRole(['admin']), schoolController.reviewSchoolApplication);

// Public route to list schools and view current active school
router.get('/', schoolController.getAllSchools);
router.get('/current', schoolController.getCurrentSchool);
router.get('/check-language', schoolController.checkLanguageOffer);
router.get('/:slug', schoolController.getSchoolBySlug);

// Admin-only route to update school settings and colors
router.put('/:id/branding', auth, requireRole(['admin']), schoolController.updateSchoolBranding);

module.exports = router;
