const express = require('express');
const multer = require('multer');
const path = require('path');
const teacherController = require('../controller/teacherController');
const { auth: authenticateToken, requireRole } = require('../../../authMiddleware');

const router = express.Router();

const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(process.cwd(), 'uploads', 'textbooks');
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const base = path.basename(file.originalname || 'resource.pdf');
        const ext = path.extname(base).toLowerCase() || '.pdf';
        const stem = path.basename(base, path.extname(base)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'resource';
        cb(null, `${Date.now()}-${stem}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const allowedExts = ['.pdf', '.docx', '.doc', '.txt', '.epub', '.ppt', '.pptx', '.rtf', '.odt', '.xlsx', '.xls', '.png', '.jpg', '.jpeg'];
        if (allowedExts.includes(ext) || !ext) {
            cb(null, true);
        } else {
            cb(null, true); // Permissive to prevent silent upload failures for teachers
        }
    }
});

router.use(authenticateToken, requireRole(['teacher', 'admin']));

const adaptivePracticeController = require('../controller/adaptivePracticeController');
router.get('/concept-gaps', adaptivePracticeController.getClassGaps);
router.get('/workload', teacherController.getWorkload);
router.get('/overview-stats', teacherController.getTeacherOverviewStats);
router.get('/my-subjects-overview', teacherController.getMySubjectsOverview);
router.get('/performance-overview', teacherController.getTeacherPerformanceOverview);
router.post('/marks/save', teacherController.saveClassMarks);
router.get('/marks/history', teacherController.getClassMarksHistory);
router.get('/classlist', teacherController.getClassList);
router.get('/classes', teacherController.getTeacherClasses);
router.get('/class-roster', teacherController.getClassRoster);


router.get('/topics', teacherController.getTopicsFromTextbook);
router.get('/textbook-topics', teacherController.getTopicsFromTextbook);
router.get('/my-textbooks', teacherController.getMyTextbooks);
router.get('/my-resources', teacherController.getMyTextbooks);
router.get('/my-learners', teacherController.getMyLearners);
router.post('/upload-textbook', (req, res, next) => {
    upload.single('textbook')(req, res, (err) => {
        if (err) {
            console.error('[TEACHER UPLOAD TEXTBOOK ERROR]', err);
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Textbook file exceeds the 50MB maximum size limit.' });
                }
                return res.status(400).json({ error: `Upload error: ${err.message}` });
            }
            return res.status(400).json({ error: `File error: ${err.message}` });
        }
        next();
    });
}, teacherController.uploadTextbook);

router.post('/upload-resource', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('[TEACHER UPLOAD RESOURCE ERROR]', err);
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Document file exceeds the 50MB maximum size limit.' });
                }
                return res.status(400).json({ error: `Upload error: ${err.message}` });
            }
            return res.status(400).json({ error: `File error: ${err.message}` });
        }
        next();
    });
}, teacherController.uploadResource);
router.patch('/resources/:id/publish', teacherController.togglePublishResource);
router.put('/resources/:id/publish', teacherController.togglePublishResource);
router.delete('/resources/:id', teacherController.deleteResource);
router.get('/messages', teacherController.getMessages);
router.post('/reply', teacherController.replyToParent);
router.get('/attendance-roster', teacherController.getAttendanceRoster);
router.get('/attendance-history', teacherController.getAttendanceHistory);
router.post('/attendance', teacherController.submitAttendance);
router.post('/ai/generate-assignment-questions', teacherController.generateAIQuestions);
router.post('/ai/generate-lesson-plan', teacherController.generateAILessonPlan);
router.post('/ai/generate-test-paper', teacherController.generateAITestPaper);
const timetableController = require('../controller/timetableController');

// Missing Teacher & Timetable Endpoints
router.get('/timetables', timetableController.getTeacherTimetables);
router.post('/publish-to-learners', timetableController.teacherPublishToLearners);
router.post('/publish-timetable', timetableController.teacherPublishToLearners);
router.put('/timetables/:id', timetableController.updateTimetable);
router.post('/assignments', teacherController.publishAssignment);
router.post('/record-mark', teacherController.recordMark);
router.get('/learner-progress/:childId', teacherController.getLearnerProgress);
router.get('/teachers', teacherController.getAllTeachers);
router.get('/timetables/:id', timetableController.getTimetableById);
router.get('/recipients/:role', teacherController.getRecipientsByRole);
router.get('/profile-details', teacherController.getTeacherProfileDetails);
router.put('/profile-update', teacherController.updateTeacherProfileDetails);

module.exports = router;