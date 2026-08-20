const express = require('express');
const multer = require('multer');
const teacherController = require('../controller/teacherController');
const { auth: authenticateToken, requireRole } = require('../../../authMiddleware');

const router = express.Router();

// Configure Multer for PDF storage (assuming same config as server.js)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/textbooks/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf')
});

router.use(authenticateToken, requireRole(['teacher', 'admin']));

router.get('/workload', teacherController.getWorkload);
router.get('/overview-stats', teacherController.getTeacherOverviewStats);
router.get('/my-subjects-overview', teacherController.getMySubjectsOverview);
router.get('/performance-overview', teacherController.getTeacherPerformanceOverview);
router.post('/marks/save', teacherController.saveClassMarks);
router.get('/classlist', teacherController.getClassList);


router.get('/topics', teacherController.getTopicsFromTextbook);
router.get('/textbook-topics', teacherController.getTopicsFromTextbook);
router.get('/my-textbooks', teacherController.getMyTextbooks);
router.get('/my-resources', teacherController.getMyTextbooks);
router.get('/my-learners', teacherController.getMyLearners);
router.post('/upload-textbook', upload.single('textbook'), teacherController.uploadTextbook);
router.post('/upload-resource', upload.single('file'), teacherController.uploadResource);
router.delete('/resources/:id', teacherController.deleteResource);
router.get('/messages', teacherController.getMessages);
router.post('/reply', teacherController.replyToParent);
router.get('/attendance-roster', teacherController.getAttendanceRoster);
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