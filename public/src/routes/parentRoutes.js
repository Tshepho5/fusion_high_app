const express = require('express');
const router = express.Router();
const parentController = require('../controller/parentController');
const { auth, requireRole } = require('../../../authMiddleware');

// All routes in this file are protected and require the 'parent' role.
router.use(auth, requireRole(['parent', 'admin']));

router.get('/children', parentController.getChildren);
router.post('/link-child', parentController.linkChild);
router.post('/children/activate', parentController.activateChild);
router.post('/children/link-sibling', parentController.linkSibling);
router.post('/children/deactivate/:childId', parentController.deactivateChild);
router.get('/assignments', parentController.getChildrensAssignments);
router.get('/child-overview/:childId', parentController.getChildOverview);
router.post('/contact-teacher', parentController.contactTeacher);
router.get('/overview', parentController.getParentOverview);
router.get('/children-detailed', parentController.getChildrenDetailedOverview);
router.get('/child-performance', parentController.getChildPerformanceOverview);
router.get('/child-attendance', parentController.getChildAttendanceOverview);
router.get('/child-assignments', parentController.getChildAssignments);
router.get('/child-timetable', parentController.getChildTimetable);
router.get('/child-alerts', parentController.getChildAlerts);

module.exports = router;