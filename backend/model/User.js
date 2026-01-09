// model/User.js - Simplified User Model for Air Quality System
const mongoose = require("mongoose");

// Subscription schema - one per device the user monitors
const subscriptionSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      uppercase: true,
    },
    deviceName: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    // Custom thresholds for this specific device
    customThresholds: {
      pm2_5: {
        enabled: { type: Boolean, default: true },
        warning: { type: Number, default: 35 },
        critical: { type: Number, default: 75 },
        unit: { type: String, default: "µg/m³" },
      },
      pm10: {
        enabled: { type: Boolean, default: true },
        warning: { type: Number, default: 50 },
        critical: { type: Number, default: 150 },
        unit: { type: String, default: "µg/m³" },
      },
      o3: {
        enabled: { type: Boolean, default: true },
        warning: { type: Number, default: 100 },
        critical: { type: Number, default: 160 },
        unit: { type: String, default: "ppb" },
      },
      no2: {
        enabled: { type: Boolean, default: true },
        warning: { type: Number, default: 100 },
        critical: { type: Number, default: 200 },
        unit: { type: String, default: "ppb" },
      },
      so2: {
        enabled: { type: Boolean, default: true },
        warning: { type: Number, default: 150 },
        critical: { type: Number, default: 350 },
        unit: { type: String, default: "ppb" },
      },
      co: {
        enabled: { type: Boolean, default: true },
        warning: { type: Number, default: 5 },
        critical: { type: Number, default: 9.4 },
        unit: { type: String, default: "ppm" },
      },
      temperature_c: {
        enabled: { type: Boolean, default: false },
        min: { type: Number, default: 15 },
        max: { type: Number, default: 40 },
        unit: { type: String, default: "°C" },
      },
      humidity_pct: {
        enabled: { type: Boolean, default: false },
        max: { type: Number, default: 85 },
        unit: { type: String, default: "%" },
      },
    },
    // Notification settings for this device
    notificationSettings: {
      email: {
        enabled: { type: Boolean, default: true },
        quietHours: {
          enabled: { type: Boolean, default: false },
          start: { type: String, default: "22:00" },
          end: { type: String, default: "08:00" },
        },
      },
      inApp: {
        enabled: { type: Boolean, default: true },
      },
    },
  },
  { _id: false }
);

// Recent notification schema (keep last 50 per user)
const recentNotificationSchema = new mongoose.Schema(
  {
    notificationId: String,
    deviceId: String,
    type: String, // 'threshold_exceeded', 'device_offline', etc.
    severity: String, // 'warning', 'critical'
    metric: String, // 'pm2_5', 'pm10', etc.
    value: Number,
    threshold: Number,
    message: String,
    sentAt: Date,
    sentVia: [String], // ['email', 'inApp']
    read: { type: Boolean, default: false },
    readAt: Date,
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: Date,
  },
  { _id: false }
);

// Main User schema
const userSchema = new mongoose.Schema({
  // === CLERK AUTHENTICATION ===
  clerkUserId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // === USER PROFILE ===
  userId: {
    type: String,
    unique: true,
    sparse: true, // Allows null/undefined values
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },

  // === USER ROLE ===
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  // === ACCOUNT STATUS ===
  isActive: {
    type: Boolean,
    default: true,
  },

  // === DEVICE SUBSCRIPTIONS ===
  subscriptions: [subscriptionSchema],

  // === RECENT NOTIFICATIONS ===
  recentNotifications: {
    type: [recentNotificationSchema],
    default: [],
  },

  // === STATISTICS ===
  statistics: {
    totalNotificationsReceived: { type: Number, default: 0 },
    lastNotificationAt: Date,
  },

  // === TIMESTAMPS ===
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// ===================================
// MIDDLEWARE
// ===================================

// Auto-generate userId and update timestamp
userSchema.pre("save", function (next) {
  this.updatedAt = new Date();

  // Generate userId like U2101912 if not exists
  if (!this.userId) {
    const timestamp = Date.now().toString();
    const uniqueId = timestamp.slice(-7);
    this.userId = `U${uniqueId}`;
  }

  next();
});

// ===================================
// INSTANCE METHODS
// ===================================

// Subscribe to a device with default threshold settings
userSchema.methods.subscribeToDevice = function (deviceId, deviceName) {
  const existingSubscription = this.subscriptions.find(
    (sub) => sub.deviceId.toUpperCase() === deviceId.toUpperCase()
  );

  if (existingSubscription) {
    existingSubscription.isActive = true;
    return existingSubscription;
  }

  const newSubscription = {
    deviceId: deviceId.toUpperCase(),
    deviceName: deviceName,
    isActive: true,
    subscribedAt: new Date(),
  };

  this.subscriptions.push(newSubscription);
  return newSubscription;
};

// Unsubscribe from a device
userSchema.methods.unsubscribeFromDevice = function (deviceId) {
  const subscription = this.subscriptions.find(
    (sub) => sub.deviceId.toUpperCase() === deviceId.toUpperCase()
  );

  if (subscription) {
    subscription.isActive = false;
  }
};

// Mark notification as read
userSchema.methods.markNotificationAsRead = function (notificationId) {
  const notification = this.recentNotifications.find(
    (n) => n.notificationId === notificationId
  );

  if (notification && !notification.read) {
    notification.read = true;
    notification.readAt = new Date();
  }
};

// Mark all notifications as read
userSchema.methods.markAllNotificationsAsRead = function () {
  const now = new Date();
  this.recentNotifications.forEach((notification) => {
    if (!notification.read) {
      notification.read = true;
      notification.readAt = now;
    }
  });
};

// Get unread notification count
userSchema.methods.getUnreadNotificationCount = function () {
  return this.recentNotifications.filter((n) => !n.read).length;
};

module.exports = mongoose.model("User", userSchema);