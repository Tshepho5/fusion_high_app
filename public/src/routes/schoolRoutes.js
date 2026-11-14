const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const schoolController = require('../controller/schoolController');
const academicStreamController = require('../controller/academicStreamController');
const schoolLogo = require('../services/schoolLogo');
const { auth, requireRole } = require('../../../authMiddleware');

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: schoolLogo.MAX_LOGO_BYTES }
});

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Too many school registration attempts. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false }
});

function acceptLogo(req, res, next) {
  logoUpload.single('logo')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'The school logo must be 2 MB or smaller.' });
    }
    return res.status(400).json({ error: 'The school logo could not be uploaded.' });
  });
}

router.post('/apply', registrationLimiter, acceptLogo, schoolController.applySchool);

const canReviewSchoolRegistrations = (req, res, next) => {
  if (req.user?.is_superadmin) return next();
  return res.status(403).json({ error: 'Only Geleza SA platform administrators can review school admissions and registrations.' });
};

router.get('/applications/retention-dry-run', auth, canReviewSchoolRegistrations, schoolController.retentionDryRun);
router.get('/applications/all', auth, canReviewSchoolRegistrations, schoolController.getSchoolApplications);
router.post('/applications/:id/hold', auth, canReviewSchoolRegistrations, schoolController.setApplicationHold);
router.post('/applications/:id/decision', auth, canReviewSchoolRegistrations, schoolController.reviewSchoolApplication);
router.post('/applications/:id/activation', auth, canReviewSchoolRegistrations, schoolController.resendPrincipalActivation);

router.get('/catalogue/nsc', academicStreamController.catalogue);
router.get('/:id/published-streams', academicStreamController.published);
router.get('/:id/academic-configuration', auth, requireRole(['admin']), academicStreamController.configuration);
router.put('/:id/academic-offerings', auth, requireRole(['admin']), academicStreamController.saveOfferings);
router.post('/:id/academic-streams', auth, requireRole(['admin']), academicStreamController.saveStream);
router.put('/:id/academic-streams/:streamId', auth, requireRole(['admin']), academicStreamController.saveStream);
router.post('/:id/academic-streams/:streamId/publish', auth, requireRole(['admin']), academicStreamController.publishStream);
router.post('/:id/academic-streams/:streamId/archive', auth, requireRole(['admin']), academicStreamController.archiveStream);
router.post('/:id/subject-changes', auth, requireRole(['admin']), academicStreamController.approveSubjectChange);

router.get('/', schoolController.getAllSchools);
router.get('/current', schoolController.getCurrentSchool);
router.get('/check-language', schoolController.checkLanguageOffer);
router.get('/logos/:name', schoolController.schoolLogoFile);
router.get('/:slug', schoolController.getSchoolBySlug);

router.put('/:id/branding', auth, requireRole(['admin']), schoolController.updateSchoolBranding);
router.post('/:id/logo', auth, requireRole(['admin']), acceptLogo, schoolController.replaceSchoolLogo);
router.put('/:id/modules', auth, requireRole(['admin']), schoolController.updateSchoolModules);
router.put('/:id/curriculum', auth, requireRole(['admin']), schoolController.updateSchoolCurriculum);
router.get('/:id/payment-account', auth, schoolController.getAuthorisedPaymentAccount);
router.get('/:id/banking', auth, requireRole(['admin']), schoolController.getSchoolBank);
router.put('/:id/banking', auth, requireRole(['admin']), schoolController.updateSchoolBank);

module.exports = router;
