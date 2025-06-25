const express = require("express");
const router = express.Router();
const {
  AirQualityReading,
  calculateOverallAQI,
} = require("../model/AirQualityReading");
const Device = require("../model/Device");

// Validation middleware
const validateReadingData = (req, res, next) => {
  const { deviceId, readings } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  if (!readings) {
    return res.status(400).json({ error: "readings object is required" });
  }

  // Check required pollutants (pm25, o3, no2, so2, co are required)
  const requiredPollutants = ["pm25", "o3", "no2", "so2", "co"];
  const missingPollutants = requiredPollutants.filter(
    (pollutant) =>
      !readings[pollutant] ||
      readings[pollutant].value === undefined ||
      readings[pollutant].value === null
  );

  if (missingPollutants.length > 0) {
    return res.status(400).json({
      error: `Missing required pollutant readings: ${missingPollutants.join(
        ", "
      )}`,
    });
  }

  // Validate pollutant values are positive numbers
  for (const pollutant of requiredPollutants) {
    const value = readings[pollutant].value;
    if (typeof value !== "number" || value < 0) {
      return res.status(400).json({
        error: `Invalid value for ${pollutant}: must be a positive number`,
      });
    }
  }

  next();
};

// Get latest readings for all devices (for dashboard map)
router.get("/latest", async (req, res) => {
  try {
    const latestReadings = await AirQualityReading.aggregate([
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: "$deviceId",
          latestReading: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "devices",
          localField: "_id",
          foreignField: "deviceId",
          as: "device",
        },
      },
      {
        $unwind: "$device",
      },
      {
        $project: {
          deviceId: "$_id",
          name: "$device.name",
          location: "$device.location",
          aqi: "$latestReading.aqiData.overall.value",
          status: "$latestReading.aqiData.overall.status",
          dominantPollutant: "$latestReading.aqiData.overall.dominantPollutant",
          readings: "$latestReading.readings",
          aqiBreakdown: "$latestReading.aqiData.breakdown",
          timestamp: "$latestReading.timestamp",
          coordinates: {
            lat: "$device.location.coordinates.latitude",
            lng: "$device.location.coordinates.longitude",
          },
        },
      },
    ]);

    res.json(latestReadings);
  } catch (error) {
    console.error("Error fetching latest readings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get latest reading for specific device
router.get("/device/:deviceId/latest", async (req, res) => {
  try {
    const { deviceId } = req.params;

    const reading = await AirQualityReading.getLatestByDevice(deviceId);

    if (!reading) {
      return res
        .status(404)
        .json({ error: "No readings found for this device" });
    }

    res.json(reading);
  } catch (error) {
    console.error("Error fetching latest reading:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get trend data for specific device (for dashboard charts)
router.get("/device/:deviceId/trend", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { hours = 24, interval = "raw", startTime, endTime } = req.query;

    // Determine time range
    let queryStartTime, queryEndTime;

    if (startTime && endTime) {
      // Use custom date range
      queryStartTime = new Date(startTime);
      queryEndTime = new Date(endTime);
    } else if (startTime) {
      // Use custom start time + hours
      queryStartTime = new Date(startTime);
      queryEndTime = new Date(
        queryStartTime.getTime() + parseInt(hours) * 60 * 60 * 1000
      );
    } else {
      // Use hours from now (default behavior)
      queryStartTime = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
      queryEndTime = new Date();
    }

    if (interval === "hourly") {
      // For hourly averages, we need to modify the aggregation to use custom time range
      const trendData = await AirQualityReading.aggregate([
        {
          $match: {
            deviceId: deviceId.toUpperCase(),
            timestamp: { $gte: queryStartTime, $lte: queryEndTime },
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

      // Format for frontend chart - recalculate AQI for averaged values
      const formattedData = trendData.map((item) => {
        const avgReadings = {
          pm25: { value: item.avgPm25 },
          pm10: { value: item.avgPm10 },
          o3: { value: item.avgO3 },
          no2: { value: item.avgNo2 },
          so2: { value: item.avgSo2 },
          co: { value: item.avgCo },
        };

        // Recalculate AQI for the averaged values
        const aqiResult = calculateOverallAQI(avgReadings);

        return {
          time: item._id.hour.split(" ")[1], // Extract hour part "14:00"
          pm25: Math.round(item.avgPm25 * 10) / 10,
          pm10: Math.round((item.avgPm10 || 0) * 10) / 10,
          o3: Math.round(item.avgO3 * 10) / 10,
          no2: Math.round(item.avgNo2 * 10) / 10,
          so2: Math.round(item.avgSo2 * 10) / 10,
          co: Math.round(item.avgCo * 100) / 100, // CO has smaller values
          aqi: aqiResult.value,
          status: aqiResult.status,
          count: item.count,
        };
      });

      res.json(formattedData);
    } else {
      // Get raw readings
      const readings = await AirQualityReading.getTimeRange(
        deviceId,
        queryStartTime,
        queryEndTime
      );

      // Format for frontend chart
      const formattedData = readings.map((reading) => ({
        time: reading.timestamp.toISOString().substr(11, 5), // HH:MM format
        pm25: reading.readings.pm25?.value || 0,
        pm10: reading.readings.pm10?.value || 0,
        o3: reading.readings.o3?.value || 0,
        no2: reading.readings.no2?.value || 0,
        so2: reading.readings.so2?.value || 0,
        co: reading.readings.co?.value || 0,
        aqi: reading.aqiData.overall.value,
        status: reading.aqiData.overall.status,
        timestamp: reading.timestamp,
      }));

      res.json(formattedData);
    }
  } catch (error) {
    console.error("Error fetching trend data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create new air quality reading
router.post("/", validateReadingData, async (req, res) => {
  try {
    const { deviceId } = req.body;

    // Verify device exists
    const device = await Device.findOne({ deviceId: deviceId.toUpperCase() });
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Create reading - AQI will be calculated automatically in pre-save middleware
    const reading = new AirQualityReading({
      ...req.body,
      deviceId: deviceId.toUpperCase(),
      timestamp: req.body.timestamp || new Date(),
    });

    await reading.save();

    res.status(201).json({
      message: "Air quality reading created successfully",
      reading: {
        deviceId: reading.deviceId,
        timestamp: reading.timestamp,
        readings: reading.readings,
        aqiData: reading.aqiData,
        environmental: reading.environmental,
        metadata: reading.metadata,
      },
    });
  } catch (error) {
    console.error("Error creating reading:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk insert readings (for device data batches)
router.post("/bulk", async (req, res) => {
  try {
    const { readings } = req.body;

    if (!readings || !Array.isArray(readings)) {
      return res.status(400).json({ error: "readings array is required" });
    }

    // Validate all deviceIds exist
    const deviceIds = [
      ...new Set(readings.map((r) => r.deviceId.toUpperCase())),
    ];
    const devices = await Device.find({ deviceId: { $in: deviceIds } });
    const validDeviceIds = devices.map((d) => d.deviceId);

    const invalidReadings = readings.filter(
      (r) => !validDeviceIds.includes(r.deviceId.toUpperCase())
    );

    if (invalidReadings.length > 0) {
      return res.status(400).json({
        error: "Invalid device IDs found",
        invalidDeviceIds: invalidReadings.map((r) => r.deviceId),
      });
    }

    // Prepare readings with uppercase deviceIds
    const preparedReadings = readings.map((reading) => ({
      ...reading,
      deviceId: reading.deviceId.toUpperCase(),
      timestamp: reading.timestamp || new Date(),
    }));

    // Save all readings (AQI will be calculated automatically)
    const result = await AirQualityReading.insertMany(preparedReadings);

    res.status(201).json({
      message: `${result.length} readings created successfully`,
      count: result.length,
    });
  } catch (error) {
    console.error("Error bulk creating readings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get readings with filters
router.get("/", async (req, res) => {
  try {
    const {
      deviceId,
      startTime,
      endTime,
      limit = 100,
      page = 1,
      minAqi,
      maxAqi,
      status,
    } = req.query;

    // Build query
    let query = {};

    if (deviceId) {
      query.deviceId = deviceId.toUpperCase();
    }

    if (startTime || endTime) {
      query.timestamp = {};
      if (startTime) query.timestamp.$gte = new Date(startTime);
      if (endTime) query.timestamp.$lte = new Date(endTime);
    }

    if (minAqi || maxAqi) {
      query["aqiData.overall.value"] = {};
      if (minAqi) query["aqiData.overall.value"].$gte = parseInt(minAqi);
      if (maxAqi) query["aqiData.overall.value"].$lte = parseInt(maxAqi);
    }

    if (status) {
      query["aqiData.overall.status"] = status;
    }

    // Pagination
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;

    const readings = await AirQualityReading.find(query)
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .skip(skip);

    const total = await AirQualityReading.countDocuments(query);

    res.json({
      readings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching readings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get statistics for a device
router.get("/device/:deviceId/stats", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { days = 7 } = req.query;

    const startTime = new Date(
      Date.now() - parseInt(days) * 24 * 60 * 60 * 1000
    );

    const stats = await AirQualityReading.aggregate([
      {
        $match: {
          deviceId: deviceId.toUpperCase(),
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: null,
          avgAqi: { $avg: "$aqiData.overall.value" },
          minAqi: { $min: "$aqiData.overall.value" },
          maxAqi: { $max: "$aqiData.overall.value" },
          avgPm25: { $avg: "$readings.pm25.value" },
          avgPm10: { $avg: "$readings.pm10.value" },
          avgO3: { $avg: "$readings.o3.value" },
          avgNo2: { $avg: "$readings.no2.value" },
          avgSo2: { $avg: "$readings.so2.value" },
          avgCo: { $avg: "$readings.co.value" },
          totalReadings: { $sum: 1 },
          goodReadings: {
            $sum: {
              $cond: [{ $eq: ["$aqiData.overall.status", "good"] }, 1, 0],
            },
          },
          moderateReadings: {
            $sum: {
              $cond: [{ $eq: ["$aqiData.overall.status", "moderate"] }, 1, 0],
            },
          },
          unhealthyReadings: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$aqiData.overall.status",
                    [
                      "unhealthy_sensitive",
                      "unhealthy",
                      "very_unhealthy",
                      "hazardous",
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const result = stats[0] || {};

    // Calculate percentages
    if (result.totalReadings > 0) {
      result.goodPercentage = Math.round(
        (result.goodReadings / result.totalReadings) * 100
      );
      result.moderatePercentage = Math.round(
        (result.moderateReadings / result.totalReadings) * 100
      );
      result.unhealthyPercentage = Math.round(
        (result.unhealthyReadings / result.totalReadings) * 100
      );
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching device stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get AQI calculation for given pollutant values (utility endpoint)
router.post("/calculate-aqi", (req, res) => {
  try {
    const { readings } = req.body;

    if (!readings) {
      return res.status(400).json({ error: "readings object is required" });
    }

    const aqiResult = calculateOverallAQI(readings);

    res.json({
      overall: {
        aqi: aqiResult.value,
        status: aqiResult.status,
        dominantPollutant: aqiResult.dominantPollutant,
      },
      breakdown: aqiResult.breakdown,
    });
  } catch (error) {
    console.error("Error calculating AQI:", error);
    res.status(500).json({ error: error.message });
  }
});

// Recalculate AQI for existing readings (admin utility)
router.patch("/recalculate-aqi", async (req, res) => {
  try {
    const { deviceId, startTime, endTime } = req.body;

    let query = {};
    if (deviceId) query.deviceId = deviceId.toUpperCase();
    if (startTime || endTime) {
      query.timestamp = {};
      if (startTime) query.timestamp.$gte = new Date(startTime);
      if (endTime) query.timestamp.$lte = new Date(endTime);
    }

    const readings = await AirQualityReading.find(query);

    let updatedCount = 0;
    for (const reading of readings) {
      reading.recalculateAQI();
      await reading.save();
      updatedCount++;
    }

    res.json({
      message: `Recalculated AQI for ${updatedCount} readings`,
      updatedCount,
    });
  } catch (error) {
    console.error("Error recalculating AQI:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete readings (admin only - be careful!)
router.delete("/device/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { beforeDate } = req.query;

    let query = { deviceId: deviceId.toUpperCase() };

    if (beforeDate) {
      query.timestamp = { $lt: new Date(beforeDate) };
    }

    const result = await AirQualityReading.deleteMany(query);

    res.json({
      message: `Deleted ${result.deletedCount} readings for device ${deviceId}`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting readings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to create sample reading
router.post("/test-reading", async (req, res) => {
  try {
    const sampleReading = {
      deviceId: "AQ-UM-001",
      readings: {
        pm25: { value: 32.1, unit: "μg/m³" },
        pm10: { value: 45.2, unit: "μg/m³" },
        o3: { value: 38.7, unit: "μg/m³" },
        no2: { value: 24.2, unit: "μg/m³" },
        so2: { value: 11.8, unit: "μg/m³" },
        co: { value: 0.7, unit: "mg/m³" },
      },
      environmental: {
        temperature: 29.5,
        humidity: 78,
        windSpeed: 8.2,
        pressure: 1013.25,
      },
      metadata: {
        dataQuality: "validated",
        batteryLevel: 85,
        signalStrength: -67,
        calibrationStatus: "good",
      },
    };

    const reading = new AirQualityReading(sampleReading);
    await reading.save();

    res.status(201).json({
      message: "Test reading created successfully",
      reading,
      calculatedAQI: reading.aqiData,
    });
  } catch (error) {
    console.error("Error creating test reading:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
