const express = require('express');
const router = express.Router();
const staffInviteController = require('../controller/staffInviteController');

// Public endpoints for invited teachers
router.get('/verify', staffInviteController.verifyToken);
router.post('/apply', staffInviteController.submitTeacherApplication);
router.post('/register', staffInviteController.registerTeacherAccount);

module.exports = router;
