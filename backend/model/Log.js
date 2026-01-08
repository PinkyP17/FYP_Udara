const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    log_type: {
      type: String,
      required: true,
      default: "info",
    },
    category: {
      type: String,
      required: true,
      default: "system",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp_detected: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "resolved", "investigating", "closed"],
      default: "active",
    },
    severity: {
      type: String,
      enum: ["info", "low", "medium", "high", "critical"],
      default: "info",
    },
    device_id: {
      type: String,
      required: true,
    },
    location: {
      type: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    auto_generated: {
      type: Boolean,
      default: true,
    },
    timestamp_server: {
      type: Date,
      default: Date.now,
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
    notes: [
      {
        note: String,
        user: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    timestamp_resolved: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "device_logs",
    timestamps: { createdAt: false, updatedAt: false }, // We manage timestamps manually or via defaults
  }
);

// Indexes for common queries
logSchema.index({ timestamp_detected: -1 });
logSchema.index({ device_id: 1 });
logSchema.index({ status: 1 });
logSchema.index({ severity: 1 });

module.exports = mongoose.model("Log", logSchema);