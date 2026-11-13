const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const controller = require('../controller/teacher/lessonPlanningController');

const router = express.Router();
const allowed = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.ppt', '.pptx', '.txt']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = controller.uploadRoot;
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => cb(null, controller.storeUpload(file))
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowed.has(ext)) return cb(new Error('Only PDF, image, and document files can be attached.'));
    cb(null, true);
  }
});

function uploadSingle(field) {
  return (req, res, next) => {
    upload.single(field)(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'The file is larger than 15 MB.' });
      }
      return res.status(400).json({ error: error.message || 'The file could not be uploaded.' });
    });
  };
}

router.get('/lesson-plans/context', controller.context);
router.get('/lesson-plans/dashboard', controller.dashboard);
router.get('/lesson-plans/progress', controller.progress);
router.get('/lesson-plans/calendar', controller.calendar);
router.get('/lesson-plans/homework-options', controller.homeworkOptions);
router.post('/lesson-plans/ai-assist', controller.aiAssist);
router.get('/lesson-plans/materials/:materialId/file', controller.downloadMaterial);

router.get('/lesson-notes', controller.listNotes);
router.post('/lesson-notes', controller.createNote);
router.get('/lesson-notes/attachments/:sectionId/file', controller.downloadNoteFile);
router.get('/lesson-notes/:id', controller.noteDetail);
router.put('/lesson-notes/:id', controller.updateNote);
router.delete('/lesson-notes/:id', controller.removeNote);
router.post('/lesson-notes/:id/attachments', uploadSingle('file'), controller.uploadNoteFile);

router.get('/lesson-templates', controller.listTemplates);
router.post('/lesson-templates', controller.createTemplate);
router.get('/lesson-templates/:id', controller.templateDetail);
router.put('/lesson-templates/:id', controller.updateTemplate);
router.delete('/lesson-templates/:id', controller.removeTemplate);
router.post('/lesson-templates/:id/apply', controller.applyTemplate);

router.get('/lesson-plans', controller.list);
router.post('/lesson-plans', controller.create);
router.get('/lesson-plans/:id/pdf', controller.pdf);
router.post('/lesson-plans/:id/duplicate', controller.duplicate);
router.post('/lesson-plans/:id/template', controller.templateFromPlan);
router.post('/lesson-plans/:id/materials', uploadSingle('file'), controller.uploadMaterial);
router.get('/lesson-plans/:id', controller.detail);
router.put('/lesson-plans/:id', controller.update);
router.delete('/lesson-plans/:id', controller.remove);

module.exports = router;
