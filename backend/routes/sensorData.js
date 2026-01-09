// routes/sensorData.js - Complete version with timestamp_device fix
const express = require('express');
const router = express.Router();
const SensorReading = require('../model/SensorReading');
const Device = require('../model/Device');
const { processAllGases } = require('../utils/gasConversion');
const {calculateMalaysianAPI} = require('../utils/malaysianApi');

// GET /api/sensor/dashboard
// Get latest readings for all active devices (for map markers)
router.get('/dashboard', async (req, res) => {
  try {
    const devices = await Device.find({ isActive: true });
    
    const dashboardData = await Promise.all(
      devices.map(async (device) => {
        const latestReading = await SensorReading.getLatestByDevice(device.deviceId);
        
        // 1. Process Gases
        const gasData = processAllGases(latestReading?.alphasense_voltages || {});
        
        // 2. Calculate Official Malaysian API
        const apiInput = {
            pm10: latestReading?.pm10,
            pm2_5: latestReading?.pm2_5,
            ...gasData
        };
        const apiResult = calculateMalaysianAPI(apiInput);

        return {
          id: device._id,
          deviceId: device.deviceId,
          name: device.name,
          lat: device.location.coordinates.latitude,
          lng: device.location.coordinates.longitude,
          status: device.status || 'active',
          lastUpdate: latestReading?.metadata?.timestamp_server || null,
          
          // Use the Official API Result here
          aqi: { 
            value: apiResult.value, 
            status: apiResult.status 
          },
          
          // Send simplified metrics for the map preview
          pm2_5: latestReading?.pm2_5 || null,
          temperature: latestReading?.temperature_c || null,
          humidity: latestReading?.humidity_pct || null
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
    
    // 1. Get raw sensor data from DB
    const latestReading = await SensorReading.getLatestByDevice(deviceId);
    
    if (!latestReading) {
      return res.status(404).json({ message: 'No data found' });
    }
    
    // 2. Convert Voltages -> Gas Concentration (PPM/PPB)
    const gasConcentrations = processAllGases(latestReading.alphasense_voltages || {});

    // 3. Prepare data for API calculation
    const apiInput = {
      pm10: latestReading.pm10,
      pm2_5: latestReading.pm2_5,
      ...gasConcentrations
    };

    // 4. Calculate Official Malaysian API
    const apiResult = calculateMalaysianAPI(apiInput);

    // 5. Send Response
    res.json({
      device: { deviceId },
      reading: latestReading.toFrontendFormat(),
      
      aqi: {
        value: apiResult.value,
        status: apiResult.status,
        predominant: apiResult.predominant
      },
      
      gasData: gasConcentrations 
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
    
    const aggregatedData = await SensorReading.getHourlyAverages(deviceId, parseInt(hours));
    
    // Process gas data for each trend point
    const trendData = aggregatedData.map(point => {
      const gasData = processAllGases({
        SN1_WE_V: point.SN1_WE_V, SN1_AE_V: point.SN1_AE_V,
        SN2_WE_V: point.SN2_WE_V, SN2_AE_V: point.SN2_AE_V,
        SN3_WE_V: point.SN3_WE_V, SN3_AE_V: point.SN3_AE_V,
        SN4_WE_V: point.SN4_WE_V, SN4_AE_V: point.SN4_AE_V
      });

      return {
        timestamp: point.timestamp,
        time: point.hour,
        pm1_0: point.pm1_0,
        pm25: point.pm2_5,
        pm10: point.pm10,
        temperature: point.temperature_c,
        humidity: point.humidity_pct,
        pressure_hpa: point.pressure_hpa,
        no2: gasData.NO2_ppb,
        o3: gasData.O3_ppb,
        co: gasData.CO_ppm,
        so2: gasData.SO2_ppb
      };
    });
    
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
    
    // Process Gases
    const gasData = processAllGases(latestData.alphasense_voltages || {});

    // Format metrics for frontend display
    const metrics = {
      pm1_0: {
        value: latestData.pm1_0 || 0,
        unit: 'µg/m³',
        status: getPollutantStatus('pm1_0', latestData.pm1_0),
        trend: 'stable'
      },
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
      // GASES
      co: {
        value: gasData.CO_ppm || 0,
        unit: 'ppm',
        status: 'good',
        trend: 'stable'
      },
      no2: {
        value: gasData.NO2_ppb || 0,
        unit: 'ppb',
        status: 'good',
        trend: 'stable'
      },
      o3: {
        value: gasData.O3_ppb || 0,
        unit: 'ppb',
        status: 'good',
        trend: 'stable'
      },
      so2: {
        value: gasData.SO2_ppb || 0,
        unit: 'ppb',
        status: 'good',
        trend: 'stable'
      },
      // Environmental
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
    console.error('Error fetching metrics:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// ============================================
// ✅ UPDATED: HISTORY ROUTE WITH timestamp_device FIX
// ============================================
router.get('/history', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      deviceId, 
      viewMode = 'auto',
      limit = 5000,
      page = 1
    } = req.query;
    
    // Build match query
    let matchQuery = {};
    
    if (deviceId && deviceId !== 'all') {
      matchQuery['metadata.device_id'] = deviceId;
    }
    
    // ✅ CHANGED: Use timestamp_device instead of timestamp_server
    if (startDate || endDate) {
      matchQuery['metadata.timestamp_device'] = {};
      if (startDate) {
        // Convert to timestamp_device format (YYYY-MM-DD HH:MM:SS)
        const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
        matchQuery['metadata.timestamp_device'].$gte = startDateTime.toISOString().slice(0, 19).replace('T', ' ');
      }
      if (endDate) {
        const endDateTime = new Date(`${endDate}T23:59:59.999Z`);
        matchQuery['metadata.timestamp_device'].$lte = endDateTime.toISOString().slice(0, 19).replace('T', ' ');
      }
    } else {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      matchQuery['metadata.timestamp_device'] = { 
        $gte: sevenDaysAgo.toISOString().slice(0, 19).replace('T', ' ')
      };
    }
    
    // ✅ STEP 1: Count total documents
    const totalCount = await SensorReading.countDocuments(matchQuery);
    
    // ✅ STEP 2: Calculate date range
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date();
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // ✅ STEP 3: Determine strategy
    let shouldAggregate = false;
    let aggregationType = 'none';
    
    if (viewMode === 'detailed') {
      shouldAggregate = false;
    } else if (viewMode === 'aggregated') {
      shouldAggregate = true;
      aggregationType = daysDiff > 30 ? 'daily' : 'hourly';
    } else {
      // Auto mode
      if (totalCount > 1000 || daysDiff > 7) {
        shouldAggregate = true;
        aggregationType = daysDiff > 30 ? 'daily' : 'hourly';
      }
    }
    
    console.log(`📊 [${viewMode}] ${totalCount} points, ${daysDiff} days → ${shouldAggregate ? aggregationType + ' aggregation' : 'raw data'}`);
    
    // ============================================
    // OPTION A: RAW DATA
    // ============================================
    if (!shouldAggregate) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // ✅ CHANGED: Sort by timestamp_device
      const rawData = await SensorReading.find(matchQuery)
        .sort({ 'metadata.timestamp_device': 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
      
      // Populate device details
      const deviceIds = [...new Set(rawData.map(d => d.metadata.device_id))];
      const devices = await Device.find({ deviceId: { $in: deviceIds } }).lean();
      const deviceMap = {};
      devices.forEach(d => {
        deviceMap[d.deviceId] = d;
      });
      
      // Process each reading
      const enrichedData = rawData.map(reading => {
        const device = deviceMap[reading.metadata.device_id];
        const gasData = processAllGases(reading.alphasense_voltages || {});

        const apiInput = {
          pm10: reading.pm10,
          pm2_5: reading.pm2_5,
          ...gasData
        };
        const apiResult = calculateMalaysianAPI(apiInput);
        
        return {
          // ✅ CHANGED: Use timestamp_device as primary timestamp
          timestamp: reading.metadata.timestamp_device,
          device_id: reading.metadata.device_id,
          location: reading.metadata.location,
          
          pm2_5: reading.pm2_5 || 0,
          pm10: reading.pm10 || 0,
          pm1_0: reading.pm1_0 || 0,
          
          temperature_c: reading.temperature_c || 0,
          humidity_pct: reading.humidity_pct || 0,
          pressure_hpa: reading.pressure_hpa || 0,
          
          NO2_ppm: gasData.NO2_ppm,
          NO2_ppb: gasData.NO2_ppb,
          O3_ppm: gasData.O3_ppm,
          O3_ppb: gasData.O3_ppb,
          CO_ppm: gasData.CO_ppm,
          CO_ppb: gasData.CO_ppb,
          SO2_ppm: gasData.SO2_ppm,
          SO2_ppb: gasData.SO2_ppb,
          
          count: 1,
          isRaw: true,
          
          deviceDetails: device ? {
            name: device.name,
            location: device.location
          } : null,
          
          aqi: apiResult.value,
          aqi_status: apiResult.status
        };
      });
      
      return res.json({
        data: enrichedData,
        metadata: {
          total: totalCount,
          returned: enrichedData.length,
          page: parseInt(page),
          hasMore: totalCount > (skip + enrichedData.length),
          aggregated: false,
          aggregationType: 'none',
          viewMode: viewMode,
          dateRange: { 
            start: start.toISOString(), 
            end: end.toISOString(), 
            days: daysDiff 
          }
        }
      });
    }
    
    // ============================================
    // OPTION B: AGGREGATED DATA
    // ============================================
    // ✅ CHANGED: Group by timestamp_device substring
    let dateFormat = aggregationType === 'daily' ? "%Y-%m-%d" : "%Y-%m-%d %H:00";
    
    const pipeline = [
      { $match: matchQuery },
      {
        $addFields: {
          // ✅ Extract date portion from timestamp_device string
          timestamp_date_part: {
            $substr: [
              "$metadata.timestamp_device",
              0,
              aggregationType === 'daily' ? 10 : 13
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            period: "$timestamp_date_part",
            device_id: "$metadata.device_id"
          },
          // ✅ Use timestamp_device as reference
          timestamp: { $first: "$metadata.timestamp_device" },
          device_id: { $first: "$metadata.device_id" },
          location: { $first: "$metadata.location" },
          
          pm2_5: { $avg: "$pm2_5" },
          pm10: { $avg: "$pm10" },
          pm1_0: { $avg: "$pm1_0" },
          
          temperature_c: { $avg: "$temperature_c" },
          humidity_pct: { $avg: "$humidity_pct" },
          pressure_hpa: { $avg: "$pressure_hpa" },
          
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
      { $sort: { "timestamp": 1 } },
      {
        $project: {
          _id: 0,
          timestamp: 1,
          device_id: 1,
          location: 1,
          pm2_5: { $round: ["$pm2_5", 2] },
          pm10: { $round: ["$pm10", 2] },
          pm1_0: { $round: ["$pm1_0", 2] },
          temperature_c: { $round: ["$temperature_c", 2] },
          humidity_pct: { $round: ["$humidity_pct", 2] },
          pressure_hpa: { $round: ["$pressure_hpa", 2] },
          SN1_WE_V: 1,
          SN1_AE_V: 1,
          SN2_WE_V: 1,
          SN2_AE_V: 1,
          SN3_WE_V: 1,
          SN3_AE_V: 1,
          SN4_WE_V: 1,
          SN4_AE_V: 1,
          count: 1
        }
      }
    ];
    
    const aggregatedData = await SensorReading.aggregate(pipeline);
    
    const deviceIds = [...new Set(aggregatedData.map(d => d.device_id))];
    const devices = await Device.find({ deviceId: { $in: deviceIds } }).lean();
    const deviceMap = {};
    devices.forEach(d => {
      deviceMap[d.deviceId] = d;
    });
    
    const enrichedData = aggregatedData.map(reading => {
      const device = deviceMap[reading.device_id];
      
      const gasData = processAllGases({
        SN1_WE_V: reading.SN1_WE_V,
        SN1_AE_V: reading.SN1_AE_V,
        SN2_WE_V: reading.SN2_WE_V,
        SN2_AE_V: reading.SN2_AE_V,
        SN3_WE_V: reading.SN3_WE_V,
        SN3_AE_V: reading.SN3_AE_V,
        SN4_WE_V: reading.SN4_WE_V,
        SN4_AE_V: reading.SN4_AE_V
      });

      const apiInput = {
        pm10: reading.pm10,
        pm2_5: reading.pm2_5,
        ...gasData
      };
      const apiResult = calculateMalaysianAPI(apiInput);
      
      return {
        timestamp: reading.timestamp,
        device_id: reading.device_id,
        location: reading.location,
        
        pm2_5: reading.pm2_5,
        pm10: reading.pm10,
        pm1_0: reading.pm1_0,
        
        temperature_c: reading.temperature_c,
        humidity_pct: reading.humidity_pct,
        pressure_hpa: reading.pressure_hpa,
        
        NO2_ppm: gasData.NO2_ppm,
        NO2_ppb: gasData.NO2_ppb,
        O3_ppm: gasData.O3_ppm,
        O3_ppb: gasData.O3_ppb,
        CO_ppm: gasData.CO_ppm,
        CO_ppb: gasData.CO_ppb,
        SO2_ppm: gasData.SO2_ppm,
        SO2_ppb: gasData.SO2_ppb,
        
        count: reading.count,
        isAggregated: true,
        
        deviceDetails: device ? {
          name: device.name,
          location: device.location
        } : null,
        
        aqi: apiResult.value,
        aqi_status: apiResult.status
      };
    });
    
    res.json({
      data: enrichedData,
      metadata: {
        total: totalCount,
        returned: enrichedData.length,
        aggregated: true,
        aggregationType: aggregationType,
        viewMode: viewMode,
        dateRange: { 
          start: start.toISOString(), 
          end: end.toISOString(), 
          days: daysDiff 
        }
      }
    });
    
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// ============================================
// ✅ UPDATED: EXPORT ROUTE WITH timestamp_device FIX
// ============================================
router.get('/history/export', async (req, res) => {
  try {
    const { startDate, endDate, deviceId, format = 'json' } = req.query;
    
    let matchQuery = {};
    
    if (deviceId && deviceId !== 'all') {
      matchQuery['metadata.device_id'] = deviceId;
    }
    
    // ✅ CHANGED: Use timestamp_device for export
    if (startDate || endDate) {
      matchQuery['metadata.timestamp_device'] = {};
      if (startDate) {
        const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
        matchQuery['metadata.timestamp_device'].$gte = startDateTime.toISOString().slice(0, 19).replace('T', ' ');
      }
      if (endDate) {
        const endDateTime = new Date(`${endDate}T23:59:59.999Z`);
        matchQuery['metadata.timestamp_device'].$lte = endDateTime.toISOString().slice(0, 19).replace('T', ' ');
      }
    }
    
    // ✅ CHANGED: Sort by timestamp_device
    const rawData = await SensorReading.find(matchQuery)
      .sort({ 'metadata.timestamp_device': 1 })
      .limit(10000)
      .lean();
    
    const enrichedData = rawData.map(reading => {
      const gasData = processAllGases(reading.alphasense_voltages || {});
      
      const apiInput = {
        pm10: reading.pm10,
        pm2_5: reading.pm2_5,
        ...gasData
      };
      const apiResult = calculateMalaysianAPI(apiInput);
      
      return {
        // ✅ CHANGED: Export with device timestamp
        timestamp: reading.metadata.timestamp_device,
        device_id: reading.metadata.device_id,
        location: reading.metadata.location,
        pm2_5: reading.pm2_5 || 0,
        pm10: reading.pm10 || 0,
        pm1_0: reading.pm1_0 || 0,
        temperature_c: reading.temperature_c || 0,
        humidity_pct: reading.humidity_pct || 0,
        pressure_hpa: reading.pressure_hpa || 0,
        CO_ppm: gasData.CO_ppm,
        NO2_ppb: gasData.NO2_ppb,
        O3_ppb: gasData.O3_ppb,
        SO2_ppb: gasData.SO2_ppb,
        aqi: apiResult.value,
        aqi_status: apiResult.status
      };
    });
    
    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(enrichedData[0] || {}).join(',');
      const rows = enrichedData.map(row => 
        Object.values(row).map(val => 
          typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        ).join(',')
      );
      
      const csv = [headers, ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="air-quality-export-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.json({
        data: enrichedData,
        metadata: {
          total: enrichedData.length,
          exportedAt: new Date().toISOString()
        }
      });
    }
    
  } catch (err) {
    console.error("Error exporting data:", err);
    res.status(500).json({ message: "Export Error", error: err.message });
  }
});

// Helper function
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