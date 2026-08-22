const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const timetableController = require('../controller/timetableController');
const { auth, isAdmin } = require('../../../authMiddleware.js');

// Admin Dashboard Stats
router.get('/stats', auth, isAdmin, adminController.getDashboardStats);

// User & Account Management
router.get('/users', auth, isAdmin, adminController.getAllUsers);
router.get('/users/:role', auth, isAdmin, adminController.getUsersByRole);
router.delete('/users/:id', auth, isAdmin, adminController.deleteUser);
router.get('/teachers', auth, isAdmin, adminController.getAllTeachers);

// Employee Management (matching employees table in schema.sql)
router.get('/employees', auth, isAdmin, adminController.getAllEmployees);
router.post('/employees', auth, isAdmin, adminController.createEmployee);

// Parent Management (matching users & parent_children tables)
router.get('/parents', auth, isAdmin, adminController.getAllParents);
router.post('/parents', auth, isAdmin, adminController.createParent);
router.post('/register-parent', auth, isAdmin, adminController.createParent);

// Learner Management (matching children table in schema.sql)
router.get('/learners', auth, isAdmin, adminController.getAllLearners);
router.post('/learners', auth, isAdmin, adminController.createLearner);

// School Metadata (departments, classes, subjects, roles)
router.get('/metadata', auth, isAdmin, adminController.getSchoolMetadata);

// AI Timetable Generation
router.post('/generate-timetable', auth, isAdmin, timetableController.generateAITimetable);
router.post('/publish-to-teachers', auth, isAdmin, timetableController.publishToTeachers);
router.post('/publish-timetable', auth, isAdmin, timetableController.publishToTeachers);
router.get('/timetables', auth, isAdmin, timetableController.getTimetables);
router.get('/timetables/:id', auth, isAdmin, timetableController.getTimetableById);
router.delete('/timetables/:id', auth, isAdmin, timetableController.deleteTimetable);
router.patch('/timetables/:id', auth, isAdmin, timetableController.updateTimetable);

// Behavior Incidents
router.post('/incidents', auth, isAdmin, adminController.createBehaviorIncident);

// Reports Management
router.get('/reports/recent', auth, isAdmin, adminController.getRecentReports);
router.post('/reports/generate', auth, isAdmin, adminController.generateReport);
// Academics Overview & Assessment Audits
router.get('/academics/overview', auth, isAdmin, adminController.getAcademicOverview);
router.post('/academics/moderate', auth, isAdmin, adminController.moderateAssessmentBatch);

// Admissions Management
router.get('/admissions', auth, isAdmin, adminController.getAllAdmissions);
router.get('/admissions/:id', auth, isAdmin, adminController.getAdmissionById);
router.post('/admissions/:id/ocr-inspect', auth, isAdmin, adminController.inspectAdmissionDocOCR);
router.patch('/admissions/:id', auth, isAdmin, adminController.updateAdmissionStatus);

module.exports = router;



