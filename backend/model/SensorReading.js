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
        timestamp: { $first: "$metadata.timestamp_server" },
        pm1_0: { $avg: "$pm1_0" },
        pm2_5: { $avg: "$pm2_5" },
        pm10: { $avg: "$pm10" },
        temperature_c: { $avg: "$temperature_c" },
        humidity_pct: { $avg: "$humidity_pct" },
        pressure_hpa: { $avg: "$pressure_hpa" },
        
        // Average the voltages so we can convert them to concentration later
        SN1_WE_V: { $avg: "$alphasense_voltages.SN1_WE_V" },
        SN1_AE_V: { $avg: "$alphasense_voltages.SN1_AE_V" },
        SN2_WE_V: { $avg: "$alphasense_voltages.SN2_WE_V" },
        SN2_AE_V: { $avg: "$alphasense_voltages.SN2_AE_V" },
        SN3_WE_V: { $avg: "$alphasense_voltages.SN3_WE_V" },
        SN3_AE_V: { $avg: "$alphasense_voltages.SN3_AE_V" },
        SN4_WE_V: { $avg: "$alphasense_voltages.SN4_WE_V" },
        SN4_AE_V: { $avg: "$alphasense_voltages.SN4_AE_V" },
        
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.hour": 1 }
    },
    {
      $project: {
        _id: 0,
        hour: "$_id.hour",
        timestamp: 1,
        pm1_0: { $round: ["$pm1_0", 1] },
        pm2_5: { $round: ["$pm2_5", 1] },
        pm10: { $round: ["$pm10", 1] },
        temperature_c: { $round: ["$temperature_c", 1] },
        humidity_pct: { $round: ["$humidity_pct", 1] },
        pressure_hpa: { $round: ["$pressure_hpa", 1] },
        SN1_WE_V: 1, SN1_AE_V: 1,
        SN2_WE_V: 1, SN2_AE_V: 1,
        SN3_WE_V: 1, SN3_AE_V: 1,
        SN4_WE_V: 1, SN4_AE_V: 1,
        count: 1
      }
    }
  ]);
};

// Indexes for performance
SensorReadingSchema.index({ 'metadata.device_id': 1, 'metadata.timestamp_server': -1 });
SensorReadingSchema.index({ 'metadata.timestamp_server': -1 });

module.exports = mongoose.model('SensorReading', SensorReadingSchema);