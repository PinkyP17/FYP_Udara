// model/AirQualityReading.js - Corrected Model with AQI Calculation
const mongoose = require("mongoose");

// Individual pollutant reading schema - only raw values
const pollutantReadingSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

// AQI calculation breakpoints (US EPA standard)
const AQI_BREAKPOINTS = {
  pm25: [
    { min: 0, max: 12.0, aqiMin: 0, aqiMax: 50, status: "good" },
    { min: 12.1, max: 35.4, aqiMin: 51, aqiMax: 100, status: "moderate" },
    {
      min: 35.5,
      max: 55.4,
      aqiMin: 101,
      aqiMax: 150,
      status: "unhealthy_sensitive",
    },
    { min: 55.5, max: 150.4, aqiMin: 151, aqiMax: 200, status: "unhealthy" },
    {
      min: 150.5,
      max: 250.4,
      aqiMin: 201,
      aqiMax: 300,
      status: "very_unhealthy",
    },
    { min: 250.5, max: 350.4, aqiMin: 301, aqiMax: 400, status: "hazardous" },
    { min: 350.5, max: 500.4, aqiMin: 401, aqiMax: 500, status: "hazardous" },
  ],
  pm10: [
    { min: 0, max: 54, aqiMin: 0, aqiMax: 50, status: "good" },
    { min: 55, max: 154, aqiMin: 51, aqiMax: 100, status: "moderate" },
    {
      min: 155,
      max: 254,
      aqiMin: 101,
      aqiMax: 150,
      status: "unhealthy_sensitive",
    },
    { min: 255, max: 354, aqiMin: 151, aqiMax: 200, status: "unhealthy" },
    { min: 355, max: 424, aqiMin: 201, aqiMax: 300, status: "very_unhealthy" },
    { min: 425, max: 504, aqiMin: 301, aqiMax: 400, status: "hazardous" },
    { min: 505, max: 604, aqiMin: 401, aqiMax: 500, status: "hazardous" },
  ],
  o3: [
    { min: 0, max: 54, aqiMin: 0, aqiMax: 50, status: "good" },
    { min: 55, max: 70, aqiMin: 51, aqiMax: 100, status: "moderate" },
    {
      min: 71,
      max: 85,
      aqiMin: 101,
      aqiMax: 150,
      status: "unhealthy_sensitive",
    },
    { min: 86, max: 105, aqiMin: 151, aqiMax: 200, status: "unhealthy" },
    { min: 106, max: 200, aqiMin: 201, aqiMax: 300, status: "very_unhealthy" },
  ],
  no2: [
    { min: 0, max: 53, aqiMin: 0, aqiMax: 50, status: "good" },
    { min: 54, max: 100, aqiMin: 51, aqiMax: 100, status: "moderate" },
    {
      min: 101,
      max: 360,
      aqiMin: 101,
      aqiMax: 150,
      status: "unhealthy_sensitive",
    },
    { min: 361, max: 649, aqiMin: 151, aqiMax: 200, status: "unhealthy" },
    { min: 650, max: 1249, aqiMin: 201, aqiMax: 300, status: "very_unhealthy" },
    { min: 1250, max: 1649, aqiMin: 301, aqiMax: 400, status: "hazardous" },
    { min: 1650, max: 2049, aqiMin: 401, aqiMax: 500, status: "hazardous" },
  ],
  so2: [
    { min: 0, max: 35, aqiMin: 0, aqiMax: 50, status: "good" },
    { min: 36, max: 75, aqiMin: 51, aqiMax: 100, status: "moderate" },
    {
      min: 76,
      max: 185,
      aqiMin: 101,
      aqiMax: 150,
      status: "unhealthy_sensitive",
    },
    { min: 186, max: 304, aqiMin: 151, aqiMax: 200, status: "unhealthy" },
    { min: 305, max: 604, aqiMin: 201, aqiMax: 300, status: "very_unhealthy" },
    { min: 605, max: 804, aqiMin: 301, aqiMax: 400, status: "hazardous" },
    { min: 805, max: 1004, aqiMin: 401, aqiMax: 500, status: "hazardous" },
  ],
  co: [
    { min: 0, max: 4.4, aqiMin: 0, aqiMax: 50, status: "good" },
    { min: 4.5, max: 9.4, aqiMin: 51, aqiMax: 100, status: "moderate" },
    {
      min: 9.5,
      max: 12.4,
      aqiMin: 101,
      aqiMax: 150,
      status: "unhealthy_sensitive",
    },
    { min: 12.5, max: 15.4, aqiMin: 151, aqiMax: 200, status: "unhealthy" },
    {
      min: 15.5,
      max: 30.4,
      aqiMin: 201,
      aqiMax: 300,
      status: "very_unhealthy",
    },
    { min: 30.5, max: 40.4, aqiMin: 301, aqiMax: 400, status: "hazardous" },
    { min: 40.5, max: 50.4, aqiMin: 401, aqiMax: 500, status: "hazardous" },
  ],
};

// Function to calculate AQI for a single pollutant
function calculatePollutantAQI(pollutant, concentration) {
  const breakpoints = AQI_BREAKPOINTS[pollutant];
  if (!breakpoints) return { aqi: 0, status: "good" };

  // Find the appropriate breakpoint
  const breakpoint = breakpoints.find(
    (bp) => concentration >= bp.min && concentration <= bp.max
  );

  if (!breakpoint) {
    // If concentration exceeds all breakpoints, use the highest
    const highest = breakpoints[breakpoints.length - 1];
    return { aqi: highest.aqiMax, status: highest.status };
  }

  // Calculate AQI using linear interpolation
  const aqi = Math.round(
    ((breakpoint.aqiMax - breakpoint.aqiMin) /
      (breakpoint.max - breakpoint.min)) *
      (concentration - breakpoint.min) +
      breakpoint.aqiMin
  );

  return { aqi, status: breakpoint.status };
}

// Function to calculate overall AQI from all pollutants
function calculateOverallAQI(readings) {
  const pollutantAQIs = {};
  let maxAQI = 0;
  let dominantPollutant = null;

  // Calculate AQI for each pollutant
  Object.keys(readings).forEach((pollutant) => {
    if (readings[pollutant] && readings[pollutant].value !== undefined) {
      const result = calculatePollutantAQI(
        pollutant,
        readings[pollutant].value
      );
      pollutantAQIs[pollutant] = result;

      if (result.aqi > maxAQI) {
        maxAQI = result.aqi;
        dominantPollutant = pollutant;
      }
    }
  });

  // Determine overall status based on highest AQI
  let overallStatus = "good";
  if (maxAQI <= 50) overallStatus = "good";
  else if (maxAQI <= 100) overallStatus = "moderate";
  else if (maxAQI <= 150) overallStatus = "unhealthy_sensitive";
  else if (maxAQI <= 200) overallStatus = "unhealthy";
  else if (maxAQI <= 300) overallStatus = "very_unhealthy";
  else overallStatus = "hazardous";

  return {
    value: maxAQI,
    status: overallStatus,
    dominantPollutant,
    breakdown: pollutantAQIs,
  };
}

// Main air quality reading schema
const airQualityReadingSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  timestamp: {
    type: Date,
    required: true,
    index: true,
  },

  // Raw pollutant readings (concentrations only)
  readings: {
    pm25: {
      type: pollutantReadingSchema,
      required: true,
    },
    pm10: {
      type: pollutantReadingSchema,
    },
    o3: {
      type: pollutantReadingSchema,
      required: true,
    },
    no2: {
      type: pollutantReadingSchema,
      required: true,
    },
    so2: {
      type: pollutantReadingSchema,
      required: true,
    },
    co: {
      type: pollutantReadingSchema,
      required: true,
    },
  },

  // Calculated AQI data (computed from readings)
  aqiData: {
    overall: {
      value: { type: Number, min: 0, max: 500 },
      status: {
        type: String,
        enum: [
          "good",
          "moderate",
          "unhealthy_sensitive",
          "unhealthy",
          "very_unhealthy",
          "hazardous",
        ],
      },
      dominantPollutant: {
        type: String,
        enum: ["pm25", "pm10", "o3", "no2", "so2", "co"],
      },
    },
    breakdown: {
      pm25: { aqi: Number, status: String },
      pm10: { aqi: Number, status: String },
      o3: { aqi: Number, status: String },
      no2: { aqi: Number, status: String },
      so2: { aqi: Number, status: String },
      co: { aqi: Number, status: String },
    },
  },

  // Optional: Environmental conditions
  environmental: {
    temperature: { type: Number }, // Celsius
    humidity: { type: Number }, // Percentage
    windSpeed: { type: Number }, // km/h
    windDirection: { type: Number }, // Degrees
    pressure: { type: Number }, // hPa
    rainfall: { type: Number }, // mm
  },

  // Data quality and device metadata
  metadata: {
    dataQuality: {
      type: String,
      enum: ["raw", "processed", "validated", "estimated"],
      default: "raw",
    },
    batteryLevel: { type: Number, min: 0, max: 100 },
    signalStrength: { type: Number },
    errorCodes: [{ type: String }],
    transmissionDelay: { type: Number },
    calibrationStatus: {
      type: String,
      enum: ["good", "warning", "error"],
      default: "good",
    },
  },

  createdAt: { type: Date, default: Date.now },
});

// Pre-save middleware to calculate AQI automatically
airQualityReadingSchema.pre("save", function (next) {
  // Calculate AQI from readings
  const aqiResult = calculateOverallAQI(this.readings);

  this.aqiData = {
    overall: {
      value: aqiResult.value,
      status: aqiResult.status,
      dominantPollutant: aqiResult.dominantPollutant,
    },
    breakdown: aqiResult.breakdown,
  };

  next();
});

// Compound indexes for efficient queries
airQualityReadingSchema.index({ deviceId: 1, timestamp: -1 });
airQualityReadingSchema.index({ timestamp: -1 });
airQualityReadingSchema.index({ "aqiData.overall.value": -1 });
airQualityReadingSchema.index({ "aqiData.overall.status": 1 });

// Instance methods
airQualityReadingSchema.methods.getPollutantValues = function () {
  const pollutants = {};
  Object.keys(this.readings).forEach((key) => {
    if (this.readings[key]) {
      pollutants[key] = this.readings[key].value;
    }
  });
  return pollutants;
};

airQualityReadingSchema.methods.getAQIBreakdown = function () {
  return this.aqiData.breakdown;
};

airQualityReadingSchema.methods.recalculateAQI = function () {
  const aqiResult = calculateOverallAQI(this.readings);
  this.aqiData = {
    overall: {
      value: aqiResult.value,
      status: aqiResult.status,
      dominantPollutant: aqiResult.dominantPollutant,
    },
    breakdown: aqiResult.breakdown,
  };
  return this;
};

// Static methods
airQualityReadingSchema.statics.getLatestByDevice = function (deviceId) {
  return this.findOne({ deviceId: deviceId.toUpperCase() }).sort({
    timestamp: -1,
  });
};

airQualityReadingSchema.statics.getTimeRange = function (
  deviceId,
  startTime,
  endTime
) {
  return this.find({
    deviceId: deviceId.toUpperCase(),
    timestamp: { $gte: startTime, $lte: endTime },
  }).sort({ timestamp: 1 });
};

airQualityReadingSchema.statics.getHourlyAverages = function (
  deviceId,
  hours = 24
) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        deviceId: deviceId.toUpperCase(),
        timestamp: { $gte: startTime },
      },
    },
    {
      $group: {
        _id: {
          hour: {
            $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" },
          },
        },
        avgPm25: { $avg: "$readings.pm25.value" },
        avgPm10: { $avg: "$readings.pm10.value" },
        avgO3: { $avg: "$readings.o3.value" },
        avgNo2: { $avg: "$readings.no2.value" },
        avgSo2: { $avg: "$readings.so2.value" },
        avgCo: { $avg: "$readings.co.value" },
        avgAqi: { $avg: "$aqiData.overall.value" },
        count: { $sum: 1 },
        timestamp: { $first: "$timestamp" },
      },
    },
    {
      $sort: { "_id.hour": 1 },
    },
  ]);
};

// Export the model and utility functions
module.exports = {
  AirQualityReading: mongoose.model(
    "AirQualityReading",
    airQualityReadingSchema
  ),
  calculatePollutantAQI,
  calculateOverallAQI,
  AQI_BREAKPOINTS,
};
