const express = require('express');
const router = express.Router();
const learnerController = require('../controller/learnerController');
const { auth, requireRole } = require('../../../authMiddleware');

// All routes in this file are protected and require the 'learner' role.
router.use(auth, requireRole(['learner', 'admin']));

// AI Tutor & Study Material
router.get('/subjects', learnerController.getSubjects);
router.get('/my-subjects-overview', learnerController.getMySubjectsOverview);
router.get('/topics', learnerController.getTopics);
router.get('/subject-resources', learnerController.getSubjectResources);
router.get('/subject-announcements', learnerController.getSubjectAnnouncements);

router.get('/task', learnerController.getTask);
router.post('/ask-tutor', learnerController.askAITutor);
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