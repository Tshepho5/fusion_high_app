const express = require('express');
const router = express.Router();
const learnerController = require('../controller/learnerController');
const aiTutorController = require('../controller/aiTutorController');
const { auth, requireRole } = require('../../../authMiddleware');

// Universal Role AI Tutor & 24/7 Chat Engine (Open to all authenticated roles: learner, teacher, admin, parent)
router.post('/ai-tutor/chat', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.sendChatMessage);
router.post('/ask-tutor', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.sendChatMessage);
router.get('/ai-tutor/subjects', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.getEnrolledSubjectsWithSyllabus);
router.get('/ai-tutor/conversations', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.getConversations);
router.get('/ai-tutor/conversations/:id', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.getConversationDetails);
router.post('/ai-tutor/new-session', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.startNewConversation);
router.delete('/ai-tutor/conversations/:id', auth, requireRole(['learner', 'teacher', 'admin', 'parent']), aiTutorController.deleteConversation);

// Learner-specific academic routes (learner & admin only)
router.use(auth, requireRole(['learner', 'admin']));

// Study Material & Subject Management
router.get('/subjects', learnerController.getSubjects);
router.get('/my-subjects-overview', learnerController.getMySubjectsOverview);
router.get('/topics', learnerController.getTopics);
router.get('/subject-resources', learnerController.getSubjectResources);
router.get('/subject-announcements', learnerController.getSubjectAnnouncements);

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

// Learner Redesign Views Overviews
router.get('/attendance-overview', learnerController.getAttendanceOverview);
router.get('/achievements-overview', learnerController.getAchievementsOverview);
router.get('/grades-overview', learnerController.getGradesOverview);
router.get('/announcements-overview', learnerController.getAnnouncementsOverview);
router.get('/timetable', timetableController.getLearnerTimetable);

module.exports = router;