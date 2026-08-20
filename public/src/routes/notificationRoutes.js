const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const { auth } = require('../../../authMiddleware');

router.use(auth);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
