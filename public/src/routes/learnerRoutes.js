const express = require('express');
const router = express.Router();
const learnerController = require('../controller/learnerController');
const aiTutorController = require('../controller/aiTutorController');
const { auth, requireRole } = require('../../../authMiddleware');

const jwt = require('jsonwebtoken');

const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const bearer = authHeader && authHeader.split(' ')[1];
        const token = (bearer && bearer !== 'null' && bearer !== 'undefined') ? bearer : null;
        if (!token || !process.env.JWT_SECRET) {
            req.user = { id: null, role: 'visitor', full_name: 'Visitor' };
            return next();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
    } catch (_) {
        req.user = { id: null, role: 'visitor', full_name: 'Visitor' };
    }
    return next();
};

// Universal Role AI Tutor & 24/7 Chat Engine (Open to all visitors, learners, teachers, admins, parents, superadmins)
router.post('/ai-tutor/chat', optionalAuth, aiTutorController.sendChatMessage);
router.post('/ask-tutor', optionalAuth, aiTutorController.sendChatMessage);
router.get('/ai-tutor/subjects', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.getEnrolledSubjectsWithSyllabus);
router.get('/ai-tutor/conversations', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.getConversations);
router.get('/ai-tutor/conversations/:id', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.getConversationDetails);
router.post('/ai-tutor/new-session', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.startNewConversation);
router.delete('/ai-tutor/conversations/:id', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.deleteConversation);
router.get('/ai-tutor/physics/topics', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.getPhysicalSciencesTopics);
router.get('/ai-tutor/physics-grade10/topics', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.getPhysicalSciencesGrade10Topics);
router.post('/ai-tutor/physics/evaluate', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.evaluatePhysicalSciencesAnswer);
router.post('/ai-tutor/physics-grade10/evaluate', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.evaluatePhysicalSciencesAnswer);
router.get('/ai-tutor/math/topics', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.getMathematicsTopics);
router.post('/ai-tutor/math/evaluate', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.evaluateMathematicsAnswer);
router.get('/ai-tutor/life-sciences/topics', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.getLifeSciencesTopics);
router.post('/ai-tutor/life-sciences/evaluate', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.evaluateLifeSciencesAnswer);

const adaptivePracticeController = require('../controller/adaptivePracticeController');
router.get('/adaptive/practice', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), adaptivePracticeController.getPractice);
router.post('/adaptive/answer', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), adaptivePracticeController.submitAnswer);

// Shared learning assets & DBE resources (Open to learners, teachers, admins, and parents)
router.get('/subject-resources', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), learnerController.getSubjectResources);
router.get('/topics', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), learnerController.getTopics);
router.get('/subject-announcements', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), learnerController.getSubjectAnnouncements);

// Learner-specific academic routes (learner & admin only)
router.use(auth, requireRole(['learner', 'admin']));

// Study Material & Subject Management
router.get('/subjects', learnerController.getSubjects);
router.get('/my-subjects-overview', learnerController.getMySubjectsOverview);
router.get('/subjects-overview', learnerController.getMySubjectsOverview);
router.get('/subjects/overview', learnerController.getMySubjectsOverview);

router.get('/task', learnerController.getTask);
router.post('/summarize-topic', learnerController.summarizeTopic);
router.get('/generate-study-plan', learnerController.generateStudyPlan);
router.put('/home-language', learnerController.updateHomeLanguage);
router.post('/update-home-language', learnerController.updateHomeLanguage);
router.get('/career-pathway', learnerController.getCareerPathway);
router.post('/simulate-aps', learnerController.simulateAps);

// Assignments & Progress
router.get('/assignments', learnerController.getAssignments);
router.post('/grade-task', learnerController.gradeAITask);
router.post('/grade-assignment', learnerController.gradeAssignment);
router.post('/ai/grade-submission', learnerController.gradeLearnerSubmission);
router.get('/leaderboard', learnerController.getLeaderboard);

// Gamification Engine
router.get('/gamification', learnerController.getGamificationStats);
router.post('/gamification/award-xp', learnerController.awardGamificationXP);

const timetableController = require('../controller/timetableController');

// Learner Redesign Views Overviews (both hyphenated and slash-separated routes supported)
router.get('/attendance-overview', learnerController.getAttendanceOverview);
router.get('/attendance/overview', learnerController.getAttendanceOverview);
router.get('/achievements-overview', learnerController.getAchievementsOverview);
router.get('/achievements/overview', learnerController.getAchievementsOverview);
router.get('/grades-overview', learnerController.getGradesOverview);
router.get('/grades/overview', learnerController.getGradesOverview);
router.get('/announcements-overview', learnerController.getAnnouncementsOverview);
router.get('/announcements/overview', learnerController.getAnnouncementsOverview);
router.get('/timetable', timetableController.getLearnerTimetable);

module.exports = router;