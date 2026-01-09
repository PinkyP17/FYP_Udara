// routes/notifications.js
const express = require('express');
const router = express.Router();
const Notification = require('../model/Notification');
const User = require('../model/User');

// GET /api/user/:userId/notifications
// Get all notifications for a user with pagination
router.get('/:userId/notifications', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0, unreadOnly = false } = req.query;

    // Build query
    const query = { 'recipients.userId': userId };
    
    if (unreadOnly === 'true') {
      query['recipients.readAt'] = null;
    }

    // Get notifications from standalone collection
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // Get total count
    const totalCount = await Notification.countDocuments(query);
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({
      'recipients.userId': userId,
      'recipients.readAt': null
    });

    // Also get notifications from user's recentNotifications array (in-app)
    const user = await User.findOne({ userId: userId })
      .select('recentNotifications')
      .lean();

    const inAppNotifications = user?.recentNotifications || [];

    // Combine and deduplicate
    const allNotifications = [
      ...notifications.map(notif => ({
        ...notif,
        source: 'notifications_collection'
      })),
      ...inAppNotifications.map(notif => ({
        ...notif,
        source: 'user_profile'
      }))
    ];

    // Remove duplicates based on notificationId
    const uniqueNotifications = Array.from(
      new Map(allNotifications.map(n => [n.notificationId, n])).values()
    );

    // Sort by sentAt/createdAt
    uniqueNotifications.sort((a, b) => {
      const dateA = new Date(a.sentAt || a.createdAt);
      const dateB = new Date(b.sentAt || b.createdAt);
      return dateB - dateA;
    });

    res.json({
      success: true,
      notifications: uniqueNotifications.slice(0, parseInt(limit)),
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + notifications.length < totalCount
      },
      unreadCount
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

// GET /api/user/:userId/notifications/unread-count
// Get count of unread notifications
router.get('/:userId/notifications/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;

    const unreadCount = await Notification.countDocuments({
      'recipients.userId': userId,
      'recipients.readAt': null
    });

    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

// PATCH /api/user/:userId/notifications/:notificationId/read
// Mark notification as read
router.patch('/:userId/notifications/:notificationId/read', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;

    // Update in notifications collection
    await Notification.updateOne(
      {
        notificationId: notificationId,
        'recipients.userId': userId
      },
      {
        $set: {
          'recipients.$.readAt': new Date()
        }
      }
    );

    // Also update in user's recentNotifications
    await User.updateOne(
      {
        userId: userId,
        'recentNotifications.notificationId': notificationId
      },
      {
        $set: {
          'recentNotifications.$.read': true,
          'recentNotifications.$.readAt': new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// PATCH /api/user/:userId/notifications/mark-all-read
// Mark all notifications as read for a user
router.patch('/:userId/notifications/mark-all-read', async (req, res) => {
  try {
    const { userId } = req.params;

    // Update in notifications collection
    await Notification.updateMany(
      {
        'recipients.userId': userId,
        'recipients.readAt': null
      },
      {
        $set: {
          'recipients.$.readAt': new Date()
        }
      }
    );

    // Update in user's recentNotifications
    await User.updateOne(
      { userId: userId },
      {
        $set: {
          'recentNotifications.$[elem].read': true,
          'recentNotifications.$[elem].readAt': new Date()
        }
      },
      {
        arrayFilters: [{ 'elem.read': false }]
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all as read'
    });
  }
});

// DELETE /api/user/:userId/notifications/:notificationId
// Delete a notification
router.delete('/:userId/notifications/:notificationId', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;

    // Remove from notifications collection
    await Notification.deleteOne({
      notificationId: notificationId,
      'recipients.userId': userId
    });

    // Remove from user's recentNotifications
    await User.updateOne(
      { userId: userId },
      {
        $pull: {
          recentNotifications: { notificationId: notificationId }
        }
      }
    );

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

// GET /api/user/:userId/notifications/by-device/:deviceId
// Get notifications for a specific device
router.get('/:userId/notifications/by-device/:deviceId', async (req, res) => {
  try {
    const { userId, deviceId } = req.params;
    const { limit = 20 } = req.query;

    const notifications = await Notification.find({
      'recipients.userId': userId,
      'trigger.deviceId': deviceId
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

    res.json({
      success: true,
      notifications,
      deviceId
    });

  } catch (error) {
    console.error('Error fetching device notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device notifications'
    });
  }
});

module.exports = router;