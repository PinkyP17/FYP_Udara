// model/SensorReading.js - Matches Python subscriber's sensor_data_readings collection
const mongoose = require('mongoose');

const SensorReadingSchema = new mongoose.Schema({
  // Metadata
  metadata: {
    device_id: {  // Snake case - matches Python convention
      type: String, 
      required: true,
      index: true,
      trim: true
    },
    topic: { type: String },
    timestamp_server: { type: Date, required: true, index: -1 },
    timestamp_device: { type: String },
    location: { type: String, default: 'FSKTM' }
  },
  
  // Environmental data from BME280
  temperature_c: { type: Number },
  pressure_hpa: { type: Number },
  humidity_pct: { type: Number },
  
  // Particulate matter from PMS5003
  pm1_0: { type: Number },
  pm2_5: { type: Number },
  pm10: { type: Number },
  particles_0_3um: { type: Number },
  particles_2_5um: { type: Number },
  
  // Alphasense gas sensor voltages
  alphasense_voltages: {
    SN4_AE_V: { type: Number, default: null },
    SN4_WE_V: { type: Number, default: null },
    SN3_AE_V: { type: Number, default: null },
    SN3_WE_V: { type: Number, default: null },
    SN2_AE_V: { type: Number, default: null },
    SN2_WE_V: { type: Number, default: null },
    SN1_AE_V: { type: Number, default: null },
    SN1_WE_V: { type: Number, default: null },
    Pt1000_Pos_V: { type: Number, default: null },
    Pt1000_Neg_V: { type: Number, default: null }
  }
}, { 
  collection: 'sensor_data_readings',
  timestamps: false
});

// Virtual to populate device details
SensorReadingSchema.virtual('deviceDetails', {
  ref: 'Device',
  localField: 'metadata.device_id',
  foreignField: 'deviceId',  // Maps to Device collection's deviceId
  justOne: true
});

// Instance method to get formatted data for frontend
SensorReadingSchema.methods.toFrontendFormat = function() {
  return {
    deviceId: this.metadata.device_id,
    timestamp: this.metadata.timestamp_server,
    location: this.metadata.location,
    environmental: {
      temperature: this.temperature_c,
      humidity: this.humidity_pct,
      pressure: this.pressure_hpa
    },
    airQuality: {
      pm1_0: this.pm1_0,
      pm2_5: this.pm2_5,
      pm10: this.pm10
    },
    particles: {
      particles_0_3um: this.particles_0_3um,
      particles_2_5um: this.particles_2_5um
    }
  };
};

// Static method to get latest reading by device
SensorReadingSchema.statics.getLatestByDevice = function(deviceId) {
  return this.findOne({ 'metadata.device_id': deviceId })
    .sort({ 'metadata.timestamp_server': -1 });
};

// Static method to get readings in time range
SensorReadingSchema.statics.getTimeRange = function(deviceId, startTime, endTime) {
  return this.find({
    'metadata.device_id': deviceId,
    'metadata.timestamp_server': { $gte: startTime, $lte: endTime }
  }).sort({ 'metadata.timestamp_server': 1 });
};

// Static method to get hourly averages for graphs
SensorReadingSchema.statics.getHourlyAverages = function(deviceId, hours = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        'metadata.device_id': deviceId,
        'metadata.timestamp_server': { $gte: startTime }
      }
    },
    {
      $group: {
        _id: {
          hour: { $dateToString: { format: "%Y-%m-%d %H:00", date: "$metadata.timestamp_server" }}
        },
        time: { $first: { $dateToString: { format: "%H:%M", date: "$metadata.timestamp_server" }}},
        pm25: { $avg: "$pm2_5" },
        pm10: { $avg: "$pm10" },
        temperature: { $avg: "$temperature_c" },
        humidity: { $avg: "$humidity_pct" },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.hour": 1 }
    },
    {
      $project: {
        _id: 0,
        time: 1,
        pm25: { $round: ["$pm25", 1] },
        pm10: { $round: ["$pm10", 1] },
        temperature: { $round: ["$temperature", 1] },
        humidity: { $round: ["$humidity", 1] },
        count: 1
      }
    }
  ]);
};

// Indexes for performance
SensorReadingSchema.index({ 'metadata.device_id': 1, 'metadata.timestamp_server': -1 });
SensorReadingSchema.index({ 'metadata.timestamp_server': -1 });

module.exports = mongoose.model('SensorReading', SensorReadingSchema);