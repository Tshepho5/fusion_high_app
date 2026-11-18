const NotificationService = require('../services/notificationService');
const WebPushService = require('../services/webPushService');

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

exports.getPushPublicKey = async (req, res) => {
  try {
    const publicKey = await WebPushService.getPublicKey();
    res.json({ success: true, publicKey });
  } catch (err) {
    console.error('Error reading push key:', err.message);
    res.status(503).json({ success: false, error: 'Phone notifications are not available right now.' });
  }
};

exports.subscribePush = async (req, res) => {
  try {
    const subscription = req.body?.subscription || req.body;
    await WebPushService.saveSubscription(req.user.id, subscription, req.get('user-agent'));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Could not save this phone for notifications.' });
  }
};

exports.unsubscribePush = async (req, res) => {
  try {
    await WebPushService.removeSubscription(req.user.id, req.body?.endpoint);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true });
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
