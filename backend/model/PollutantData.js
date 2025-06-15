const mongoose = require("mongoose");

const pollutantDataSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  timestamp: { type: Date, required: true },
  time: { type: String, required: true }, // For display purposes (e.g., "00:00")
  pollutants: {
    pm25: { type: Number, required: true },
    pm10: { type: Number, required: true },
    co2: { type: Number, required: true },
    no2: { type: Number, required: true },
    so2: { type: Number, required: true },
  },
  location: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Index for efficient querying
pollutantDataSchema.index({ deviceId: 1, timestamp: -1 });
pollutantDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model("PollutantData", pollutantDataSchema);
