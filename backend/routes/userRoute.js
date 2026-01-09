// routes/user.js - User Management Routes
const express = require("express");
const router = express.Router();
const User = require("../model/User");

// ===================================
// USER PROFILE ROUTES
// ===================================

/**
 * POST /api/user
 * Create or update user profile (called during registration)
 * Required: clerkUserId, email, name
 * Optional: phone, location
 */
router.post("/", async (req, res) => {
  const { clerkUserId, email, name, phone, location } = req.body;

  // Validation
  if (!clerkUserId || !email || !name) {
    return res.status(400).json({
      error: "Missing required fields: clerkUserId, email, and name are required",
    });
  }

  try {
    // Check if user already exists
    let user = await User.findOne({ clerkUserId });

    if (user) {
      // Update existing user
      user.email = email;
      user.name = name;
      if (phone) user.phone = phone;
      if (location) user.location = location;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "User profile updated",
        user: {
          userId: user.userId,
          clerkUserId: user.clerkUserId,
          email: user.email,
          name: user.name,
          phone: user.phone,
          location: user.location,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    }

    // Create new user
    user = new User({
      clerkUserId,
      email,
      name,
      phone,
      location,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User profile created successfully",
      user: {
        userId: user.userId,
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
        phone: user.phone,
        location: user.location,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating/updating user:", error);

    if (error.code === 11000) {
      // Duplicate key error
      return res.status(409).json({
        error: "User with this email or clerkUserId already exists",
      });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/user/:clerkUserId
 * Get user profile by Clerk ID
 */
router.get("/:clerkUserId", async (req, res) => {
  const { clerkUserId } = req.params;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      success: true,
      user: {
        userId: user.userId,
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
        phone: user.phone,
        location: user.location,
        role: user.role,
        isActive: user.isActive,
        subscriptions: user.subscriptions,
        statistics: user.statistics,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/user/:clerkUserId
 * Update user profile information
 */
router.patch("/:clerkUserId", async (req, res) => {
  const { clerkUserId } = req.params;
  const { name, phone, location } = req.body;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User profile updated",
      user: {
        userId: user.userId,
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
        phone: user.phone,
        location: user.location,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/user/:clerkUserId
 * Soft delete user (set isActive to false)
 */
router.delete("/:clerkUserId", async (req, res) => {
  const { clerkUserId } = req.params;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User account deactivated",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===================================
// DEVICE SUBSCRIPTION ROUTES
// ===================================

/**
 * POST /api/user/:clerkUserId/subscribe
 * Subscribe user to a device
 * Body: { deviceId, deviceName }
 */
router.post("/:clerkUserId/subscribe", async (req, res) => {
  const { clerkUserId } = req.params;
  const { deviceId, deviceName } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Use the model's instance method
    const subscription = user.subscribeToDevice(deviceId, deviceName);
    await user.save();

    res.status(200).json({
      success: true,
      message: `Subscribed to device ${deviceId}`,
      subscription,
    });
  } catch (error) {
    console.error("Error subscribing to device:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/user/:clerkUserId/subscribe/:deviceId
 * Unsubscribe user from a device
 */
router.delete("/:clerkUserId/subscribe/:deviceId", async (req, res) => {
  const { clerkUserId, deviceId } = req.params;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.unsubscribeFromDevice(deviceId);
    await user.save();

    res.status(200).json({
      success: true,
      message: `Unsubscribed from device ${deviceId}`,
    });
  } catch (error) {
    console.error("Error unsubscribing from device:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/user/:clerkUserId/subscriptions
 * Get all device subscriptions for a user
 */
router.get("/:clerkUserId/subscriptions", async (req, res) => {
  const { clerkUserId } = req.params;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      success: true,
      subscriptions: user.subscriptions,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===================================
// THRESHOLD MANAGEMENT ROUTES
// ===================================

/**
 * GET /api/user/:clerkUserId/thresholds/:deviceId
 * Get threshold settings for a specific device
 */
router.get("/:clerkUserId/thresholds/:deviceId", async (req, res) => {
  const { clerkUserId, deviceId } = req.params;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = user.subscriptions.find(
      (sub) => sub.deviceId.toUpperCase() === deviceId.toUpperCase()
    );

    if (!subscription) {
      return res.status(404).json({
        error: `No subscription found for device ${deviceId}`,
      });
    }

    res.status(200).json({
      success: true,
      deviceId: subscription.deviceId,
      deviceName: subscription.deviceName,
      customThresholds: subscription.customThresholds,
    });
  } catch (error) {
    console.error("Error fetching thresholds:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/user/:clerkUserId/thresholds/:deviceId
 * Update threshold settings for a specific device
 * Body: { metric: 'pm2_5', enabled: true, warning: 40, critical: 80 }
 */
router.patch("/:clerkUserId/thresholds/:deviceId", async (req, res) => {
  const { clerkUserId, deviceId } = req.params;
  const updates = req.body; // { pm2_5: { warning: 40, critical: 80 }, ... }

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = user.subscriptions.find(
      (sub) => sub.deviceId.toUpperCase() === deviceId.toUpperCase()
    );

    if (!subscription) {
      return res.status(404).json({
        error: `No subscription found for device ${deviceId}`,
      });
    }

    // Update thresholds
    for (const [metric, values] of Object.entries(updates)) {
      if (subscription.customThresholds[metric]) {
        Object.assign(subscription.customThresholds[metric], values);
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Thresholds updated successfully",
      customThresholds: subscription.customThresholds,
    });
  } catch (error) {
    console.error("Error updating thresholds:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/user/:clerkUserId/thresholds/:deviceId/reset
 * Reset thresholds to default values for a specific device
 */
router.put("/:clerkUserId/thresholds/:deviceId/reset", async (req, res) => {
  const { clerkUserId, deviceId } = req.params;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = user.subscriptions.find(
      (sub) => sub.deviceId.toUpperCase() === deviceId.toUpperCase()
    );

    if (!subscription) {
      return res.status(404).json({
        error: `No subscription found for device ${deviceId}`,
      });
    }

    // Reset to default values (as defined in schema)
    subscription.customThresholds = {
      pm2_5: {
        enabled: true,
        warning: 35,
        critical: 75,
        unit: "µg/m³",
      },
      pm10: {
        enabled: true,
        warning: 50,
        critical: 150,
        unit: "µg/m³",
      },
      o3: {
        enabled: true,
        warning: 100,
        critical: 160,
        unit: "ppb",
      },
      no2: {
        enabled: true,
        warning: 100,
        critical: 200,
        unit: "ppb",
      },
      so2: {
        enabled: true,
        warning: 150,
        critical: 350,
        unit: "ppb",
      },
      co: {
        enabled: true,
        warning: 5,
        critical: 9.4,
        unit: "ppm",
      },
      temperature_c: {
        enabled: false,
        min: 15,
        max: 40,
        unit: "°C",
      },
      humidity_pct: {
        enabled: false,
        max: 85,
        unit: "%",
      },
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: "Thresholds reset to default values",
      customThresholds: subscription.customThresholds,
    });
  } catch (error) {
    console.error("Error resetting thresholds:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===================================
// NOTIFICATION SETTINGS ROUTES
// ===================================

/**
 * GET /api/user/:clerkUserId/notification-settings/:deviceId
 * Get notification settings for a specific device
 */
router.get("/:clerkUserId/notification-settings/:deviceId", async (req, res) => {
  const { clerkUserId, deviceId } = req.params;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = user.subscriptions.find(
      (sub) => sub.deviceId.toUpperCase() === deviceId.toUpperCase()
    );

    if (!subscription) {
      return res.status(404).json({
        error: `No subscription found for device ${deviceId}`,
      });
    }

    res.status(200).json({
      success: true,
      deviceId: subscription.deviceId,
      notificationSettings: subscription.notificationSettings,
    });
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/user/:clerkUserId/notification-settings/:deviceId
 * Update notification settings for a specific device
 * Body: { email: { enabled: true, quietHours: {...} }, inApp: { enabled: true } }
 */
router.patch("/:clerkUserId/notification-settings/:deviceId", async (req, res) => {
  const { clerkUserId, deviceId } = req.params;
  const { email, inApp } = req.body;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = user.subscriptions.find(
      (sub) => sub.deviceId.toUpperCase() === deviceId.toUpperCase()
    );

    if (!subscription) {
      return res.status(404).json({
        error: `No subscription found for device ${deviceId}`,
      });
    }

    // Update notification settings
    if (email) {
      Object.assign(subscription.notificationSettings.email, email);
    }
    if (inApp) {
      Object.assign(subscription.notificationSettings.inApp, inApp);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Notification settings updated",
      notificationSettings: subscription.notificationSettings,
    });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===================================
// NOTIFICATION HISTORY ROUTES
// ===================================

/**
 * GET /api/user/:clerkUserId/notifications
 * Get recent notifications for a user
 * Query params: ?limit=50&unreadOnly=false
 */
router.get("/:clerkUserId/notifications", async (req, res) => {
  const { clerkUserId } = req.params;
  const { limit = 50, unreadOnly = "false" } = req.query;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let notifications = user.recentNotifications;

    // Filter unread only if requested
    if (unreadOnly === "true") {
      notifications = notifications.filter((n) => !n.read);
    }

    // Limit results
    const limitNum = parseInt(limit);
    notifications = notifications.slice(0, limitNum);

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount: user.getUnreadNotificationCount(),
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/user/:clerkUserId/notifications/:notificationId/read
 * Mark a notification as read
 */
router.patch("/:clerkUserId/notifications/:notificationId/read", async (req, res) => {
  const { clerkUserId, notificationId } = req.params;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.markNotificationAsRead(notificationId);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/user/:clerkUserId/notifications/read-all
 * Mark all notifications as read
 */
router.patch("/:clerkUserId/notifications/read-all", async (req, res) => {
  const { clerkUserId } = req.params;

  try {
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.markAllNotificationsAsRead();
    await user.save();

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===================================
// ADMIN ROUTES
// ===================================

/**
 * GET /api/user/admin/all
 * Get all users (admin only)
 * Query params: ?role=user&isActive=true
 */
router.get("/admin/all", async (req, res) => {
  const { role, isActive } = req.query;

  try {
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const users = await User.find(query).select(
      "userId clerkUserId email name role isActive createdAt statistics"
    );

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;