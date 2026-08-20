/**
 * Teacher Controller Master Module
 * Aggregates modularized sub-controllers for 100% backward compatibility.
 */
const overviewController = require('./teacher/teacherOverviewController');
const learnersController = require('./teacher/teacherLearnersController');
const attendanceController = require('./teacher/teacherAttendanceController');
const textbookController = require('./teacher/teacherTextbookController');
const profileController = require('./teacher/teacherProfileController');
const messagingController = require('./teacher/teacherMessagingController');
const timetableController = require('./timetableController'); // Corrected import
const lookupsController = require('./teacher/teacherLookupsController'); // New controller for lookups

module.exports = {
    // Overview & Performance Metrics
    getWorkload: overviewController.getWorkload,
    getTeacherOverviewStats: overviewController.getOverviewStats || overviewController.getTeacherOverviewStats,
    getMySubjectsOverview: overviewController.getMySubjectsOverview,
    getTeacherPerformanceOverview: overviewController.getTeacherPerformanceOverview,

    // Learners & Mark Sheets
    getMyLearners: learnersController.getMyLearners,
    getClassList: learnersController.getClassList,
    getClassRoster: learnersController.getClassRoster,
    saveClassMarks: learnersController.saveClassMarks,
    recordMark: learnersController.recordMark,
    getLearnerProgress: learnersController.getLearnerProgress,

    // Attendance Register
    getAttendanceRoster: attendanceController.getAttendanceRoster,
    submitAttendance: attendanceController.submitAttendance,

    // Textbooks, Past Papers & Learning Resources
    getMyTextbooks: textbookController.getMyTextbooks,
    uploadTextbook: textbookController.uploadTextbook,
    uploadResource: textbookController.uploadResource,
    deleteResource: textbookController.deleteResource,
    getTopicsFromTextbook: textbookController.getTopicsFromTextbook,
    generateAIQuestions: textbookController.generateAIQuestions,
    generateAILessonPlan: textbookController.generateAILessonPlan,
    generateAITestPaper: textbookController.generateAITestPaper,
    publishAssignment: textbookController.publishAssignment,
    publishTimetable: timetableController.saveAndPublishTimetable, // Corrected function

    // Profile Management
    getTeacherProfileDetails: profileController.getTeacherProfileDetails,
    updateTeacherProfileDetails: profileController.updateTeacherProfileDetails,

    // Messaging & Lookups
    getMessages: messagingController.getMessages,
    replyToParent: messagingController.replyToParent,
    getAllTeachers: lookupsController.getAllTeachers,
    getTimetableById: timetableController.getTimetableById, // Moved to timetable controller
    getRecipientsByRole: lookupsController.getRecipientsByRole
};
