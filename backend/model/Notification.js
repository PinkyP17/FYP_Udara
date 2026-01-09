// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  trigger: {
    type: {
      type: String,
      enum: ['threshold_exceeded', 'device_offline', 'data_quality', 'system_alert'],
      required: true
    },
    deviceId: {
      type: String,
      required: true,
      index: true
    },
    metric: String,
    value: Number,
    threshold: Number,
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info'
    }
  },
  
  sensorData: {
    timestamp: String,
    allMetrics: {
      pm2_5: Number,
      pm10: Number,
      temperature_c: Number,
      humidity_pct: Number,
      no2: Number,
      o3: Number,
      co: Number,
      so2: Number
    }
  },
  
  recipients: [{
    userId: {
      type: String,
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true
    },
    name: String,
    sentVia: [{
      type: String,
      enum: ['email', 'inApp', 'sms']
    }],
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'delivered'],
      default: 'pending'
    },
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    error: String
  }],
  
  content: {
    subject: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    violations: [{
      metric: String,
      value: Number,
      threshold: Number,
      threshold_type: String,
      severity: String,
      unit: String,
      message: String
    }]
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  sentBySystem: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: false // We're using createdAt manually
});

// Indexes for efficient queries
notificationSchema.index({ 'recipients.userId': 1, createdAt: -1 });
notificationSchema.index({ 'trigger.deviceId': 1, createdAt: -1 });
notificationSchema.index({ notificationId: 1 });

// Static method to get notifications for a user
notificationSchema.statics.findByUserId = function(userId, limit = 50) {
  return this.find({
    'recipients.userId': userId
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    'recipients.userId': userId,
    'recipients.readAt': null
  });
};

// Static method to mark as read
notificationSchema.statics.markAsRead = function(notificationId, userId) {
  return this.updateOne(
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
};

module.exports = mongoose.model('Notification', notificationSchema);