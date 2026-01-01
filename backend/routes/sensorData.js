// routes/sensorData.js - Updated to serve real data for dashboard
const express = require('express');
const router = express.Router();
const SensorReading = require('../model/SensorReading');
const Device = require('../model/Device');

// GET /api/sensor/dashboard
// Get latest readings for all active devices (for map markers)
router.get('/dashboard', async (req, res) => {
  try {
    // Get all active devices
    const devices = await Device.find({ isActive: true });
    
    // Get latest reading for each device
    const dashboardData = await Promise.all(
      devices.map(async (device) => {
        const latestReading = await SensorReading.getLatestByDevice(device.deviceId);
        const aqiData = latestReading?.pm2_5 ? calculateSimpleAQI(latestReading.pm2_5) : { value: 0, status: 'good' };
        
        return {
          id: device._id,
          deviceId: device.deviceId,
          name: device.name,
          lat: device.location.coordinates.latitude,
          lng: device.location.coordinates.longitude,
          address: device.location.address,
          city: device.location.city || 'Unknown',
          status: device.status || 'active',
          // Latest sensor data
          pm2_5: latestReading?.pm2_5 || null,
          pm10: latestReading?.pm10 || null,
          temperature: latestReading?.temperature_c || null,
          humidity: latestReading?.humidity_pct || null,
          lastUpdate: latestReading?.metadata?.timestamp_server || null,
          aqi: aqiData
        };
      })
    );
    
    res.json(dashboardData);
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// GET /api/sensor/:deviceId/latest
// Get latest reading for a specific device
router.get('/:deviceId/latest', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const latestData = await SensorReading.getLatestByDevice(deviceId);
    
    if (!latestData) {
      return res.status(404).json({ message: 'No data found for this device' });
    }
    
    // Get device details
    const device = await Device.findOne({ deviceId: deviceId });
    
    res.json({
      device: {
        deviceId: device?.deviceId,
        name: device?.name,
        location: device?.location
      },
      reading: latestData.toFrontendFormat(),
      aqi: calculateSimpleAQI(latestData.pm2_5),
      rawData: latestData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// GET /api/sensor/:deviceId/trends
// Get 24-hour trend data for charts
router.get('/:deviceId/trends', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { hours = 24 } = req.query;
    
    const trendData = await SensorReading.getHourlyAverages(deviceId, parseInt(hours));
    
    res.json({
      deviceId,
      hours: parseInt(hours),
      data: trendData
    });
  } catch (err) {
    console.error('Error fetching trend data:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// GET /api/sensor/:deviceId/current-metrics
// Get current pollutant levels for detail cards
router.get('/:deviceId/current-metrics', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const latestData = await SensorReading.getLatestByDevice(deviceId);
    
    if (!latestData) {
      return res.status(404).json({ message: 'No data found' });
    }
    
    // Format metrics for frontend display
    const metrics = {
      pm25: {
        value: latestData.pm2_5 || 0,
        unit: 'µg/m³',
        status: getPollutantStatus('pm25', latestData.pm2_5),
        trend: 'stable'
      },
      pm10: {
        value: latestData.pm10 || 0,
        unit: 'µg/m³',
        status: getPollutantStatus('pm10', latestData.pm10),
        trend: 'stable'
      },
      temperature: {
        value: latestData.temperature_c || 0,
        unit: '°C',
        status: 'good',
        trend: 'stable'
      },
      humidity: {
        value: latestData.humidity_pct || 0,
        unit: '%',
        status: 'good',
        trend: 'stable'
      },
      pressure: {
        value: latestData.pressure_hpa || 0,
        unit: 'hPa',
        status: 'good',
        trend: 'stable'
      }
    };
    
    res.json({
      deviceId,
      timestamp: latestData.metadata.timestamp_server,
      metrics
    });
  } catch (err) {
    console.error('Error fetching current metrics:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// GET /api/sensor/history
// Historical data with filters (existing endpoint - kept for compatibility)
router.get('/history', async (req, res) => {
  try {
    const { startDate, endDate, deviceId } = req.query;
    
    let query = {};
    
    // Filter by Device ID
    if (deviceId && deviceId !== 'all') {
      query['metadata.device_id'] = deviceId;
    }
    
    // Filter by Date Range
    if (startDate || endDate) {
      query['metadata.timestamp_server'] = {};
      if (startDate) {
        query['metadata.timestamp_server'].$gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        query['metadata.timestamp_server'].$lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    } else {
      // Default: Last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query['metadata.timestamp_server'] = { $gte: sevenDaysAgo };
    }
    
    const history = await SensorReading.find(query)
      .sort({ 'metadata.timestamp_server': 1 })
      .limit(1000)
      .lean();
    
    res.json(history);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// Helper function to calculate simple AQI from PM2.5
function calculateSimpleAQI(pm25) {
  if (!pm25) return { value: 0, status: 'good' };
  
  const breakpoints = [
    { min: 0, max: 12.0, aqiMin: 0, aqiMax: 50, status: 'good' },
    { min: 12.1, max: 35.4, aqiMin: 51, aqiMax: 100, status: 'moderate' },
    { min: 35.5, max: 55.4, aqiMin: 101, aqiMax: 150, status: 'unhealthy' },
    { min: 55.5, max: 150.4, aqiMin: 151, aqiMax: 200, status: 'unhealthy' },
    { min: 150.5, max: 250.4, aqiMin: 201, aqiMax: 300, status: 'very unhealthy' },
    { min: 250.5, max: 500, aqiMin: 301, aqiMax: 500, status: 'hazardous' }
  ];
  
  const breakpoint = breakpoints.find(bp => pm25 >= bp.min && pm25 <= bp.max);
  
  if (!breakpoint) {
    return { value: 500, status: 'hazardous' };
  }
  
  const aqi = Math.round(
    ((breakpoint.aqiMax - breakpoint.aqiMin) / (breakpoint.max - breakpoint.min)) *
    (pm25 - breakpoint.min) + breakpoint.aqiMin
  );
  
  return { value: aqi, status: breakpoint.status };
}

// Helper function to get pollutant status
function getPollutantStatus(pollutant, value) {
  if (!value) return 'good';
  
  const thresholds = {
    pm25: { good: 12, moderate: 35.4, unhealthy: 55.4 },
    pm10: { good: 54, moderate: 154, unhealthy: 254 }
  };
  
  const threshold = thresholds[pollutant];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.moderate) return 'moderate';
  return 'unhealthy';
}

module.exports = router;