const NotificationService = require('../services/notificationService');

/**
 * Controller for retrieving and updating user notifications.
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit || '30', 10);
    const notifications = await NotificationService.getUserNotifications(userId, limit);
    const unreadCount = await NotificationService.getUnreadCount(userId);

    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await NotificationService.getUnreadCount(userId);
    res.json({
      success: true,
      unreadCount
    });
  } catch (err) {
    console.error('Error getting unread count:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch unread count.' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id, 10);

    const updated = await NotificationService.markAsRead(notificationId, userId);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Notification not found or unauthorized.' });
    }

    const unreadCount = await NotificationService.getUnreadCount(userId);
    res.json({
      success: true,
      message: 'Notification marked as read.',
      unreadCount
    });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ success: false, error: 'Failed to update notification.' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await NotificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: `Marked ${count} notifications as read.`,
      unreadCount: 0
    });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read.' });
  }
};
