// model/Device.js - Enhanced Device Model
const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true, // Ensure consistent format like "AQ-UM-001"
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    // Keep original location string for backward compatibility
    address: {
      type: String,
      required: true,
    },
    // Add coordinates for map functionality
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
    },
    // GeoJSON format for MongoDB geospatial queries
    geoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        index: "2dsphere",
      },
    },
    // Additional location metadata
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, default: "Malaysia", trim: true },
  },
  status: {
    type: String,
    enum: ["active", "inactive", "maintenance", "error"],
    default: "active",
  },
  // Device hardware and configuration info
  deviceInfo: {
    model: { type: String, trim: true },
    firmware: { type: String, trim: true },
    installationDate: { type: Date },
    lastMaintenance: { type: Date },
    calibrationDate: { type: Date },
  },
  // Measurement settings
  settings: {
    measurementInterval: {
      type: Number,
      default: 300, // 5 minutes in seconds
      min: 60, // Minimum 1 minute
    },
    dataTransmissionInterval: {
      type: Number,
      default: 900, // 15 minutes in seconds
      min: 300, // Minimum 5 minutes
    },
    alertThresholds: {
      pm25: { type: Number, default: 75 },
      pm10: { type: Number, default: 100 },
      o3: { type: Number, default: 160 },
      no2: { type: Number, default: 200 },
      so2: { type: Number, default: 350 },
      co: { type: Number, default: 9.4 },
    },
  },
  // Metadata
  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true }, // Admin notes about the device
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-validate middleware to update geoLocation and updatedAt
deviceSchema.pre("validate", function (next) {
  this.updatedAt = new Date();

  // Automatically set geoLocation based on coordinates
  if (
    this.location.coordinates &&
    this.location.coordinates.latitude !== undefined &&
    this.location.coordinates.latitude !== null &&
    this.location.coordinates.longitude !== undefined &&
    this.location.coordinates.longitude !== null
  ) {
    this.location.geoLocation = {
      type: "Point",
      coordinates: [
        this.location.coordinates.longitude,
        this.location.coordinates.latitude,
      ],
    };
  }

  next();
});

// Instance methods
deviceSchema.methods.getCoordinates = function () {
  return {
    lat: this.location.coordinates.latitude,
    lng: this.location.coordinates.longitude,
  };
};

deviceSchema.methods.isOnline = function () {
  // You can implement logic to check if device is actively sending data
  return this.status === "active" && this.isActive;
};

// Static methods
deviceSchema.statics.findActive = function () {
  return this.find({
    isActive: true,
    status: { $in: ["active", "maintenance"] },
  });
};

deviceSchema.statics.findNearby = function (
  longitude,
  latitude,
  maxDistanceMeters = 10000
) {
  return this.find({
    "location.geoLocation": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistanceMeters,
      },
    },
  });
};

// Indexes for performance
deviceSchema.index({ deviceId: 1 }, { unique: true });
deviceSchema.index({ status: 1, isActive: 1 });
deviceSchema.index({ "location.geoLocation": "2dsphere" });
deviceSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Device", deviceSchema);
