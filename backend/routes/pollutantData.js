const express = require("express");
const router = express.Router();
const PollutantData = require("../model/PollutantData");

// Get pollutant data with optional filters
router.get("/", async (req, res) => {
  try {
    const { deviceIds, startDate, endDate, period, pollutants } = req.query;

    let query = {};

    // Filter by device IDs
    if (deviceIds) {
      const deviceIdArray = Array.isArray(deviceIds)
        ? deviceIds
        : deviceIds.split(",");
      query.deviceId = { $in: deviceIdArray };
    }

    // Filter by date range
    if (startDate || endDate || period) {
      query.timestamp = {};

      if (period) {
        const now = new Date();
        let startDateTime;

        switch (period) {
          case "7days":
            startDateTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30days":
            startDateTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "3months":
            startDateTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDateTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        query.timestamp.$gte = startDateTime;
      } else {
        if (startDate) {
          query.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(endDate);
        }
      }
    }

    console.log("Query:", JSON.stringify(query, null, 2));

    const data = await PollutantData.find(query).sort({ timestamp: 1 }).lean();

    // If specific pollutants are requested, filter the response
    let responseData = data;
    if (pollutants) {
      const pollutantArray = Array.isArray(pollutants)
        ? pollutants
        : pollutants.split(",");
      responseData = data.map((item) => {
        const filteredPollutants = {};
        pollutantArray.forEach((pollutant) => {
          if (item.pollutants[pollutant] !== undefined) {
            filteredPollutants[pollutant] = item.pollutants[pollutant];
          }
        });
        return {
          ...item,
          pollutants: filteredPollutants,
        };
      });
    }

    console.log(`Found ${responseData.length} pollutant data records`);
    res.json(responseData);
  } catch (error) {
    console.error("Error fetching pollutant data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create pollutant data
router.post("/", async (req, res) => {
  try {
    const pollutantData = new PollutantData(req.body);
    await pollutantData.save();
    res.status(201).json(pollutantData);
  } catch (error) {
    console.error("Error creating pollutant data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk create pollutant data
router.post("/bulk", async (req, res) => {
  try {
    const dataArray = req.body;
    const result = await PollutantData.insertMany(dataArray);
    res.status(201).json({
      message: `${result.length} records created successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error bulk creating pollutant data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get aggregated data for analysis
router.get("/analysis", async (req, res) => {
  try {
    const {
      deviceIds,
      startDate,
      endDate,
      period,
      groupBy = "hour", // hour, day, week
    } = req.query;

    let matchStage = {};

    // Filter by device IDs
    if (deviceIds) {
      const deviceIdArray = Array.isArray(deviceIds)
        ? deviceIds
        : deviceIds.split(",");
      matchStage.deviceId = { $in: deviceIdArray };
    }

    // Filter by date range
    if (startDate || endDate || period) {
      matchStage.timestamp = {};

      if (period) {
        const now = new Date();
        let startDateTime;

        switch (period) {
          case "7days":
            startDateTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30days":
            startDateTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "3months":
            startDateTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDateTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        matchStage.timestamp.$gte = startDateTime;
      } else {
        if (startDate) {
          matchStage.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          matchStage.timestamp.$lte = new Date(endDate);
        }
      }
    }

    // Define grouping based on groupBy parameter
    let groupByStage;
    switch (groupBy) {
      case "day":
        groupByStage = {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" },
        };
        break;
      case "week":
        groupByStage = {
          year: { $year: "$timestamp" },
          week: { $week: "$timestamp" },
        };
        break;
      default: // hour
        groupByStage = {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" },
          hour: { $hour: "$timestamp" },
        };
    }

    const aggregatedData = await PollutantData.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupByStage,
          avgPm25: { $avg: "$pollutants.pm25" },
          avgPm10: { $avg: "$pollutants.pm10" },
          avgCo2: { $avg: "$pollutants.co2" },
          avgNo2: { $avg: "$pollutants.no2" },
          avgSo2: { $avg: "$pollutants.so2" },
          maxPm25: { $max: "$pollutants.pm25" },
          maxPm10: { $max: "$pollutants.pm10" },
          maxCo2: { $max: "$pollutants.co2" },
          maxNo2: { $max: "$pollutants.no2" },
          maxSo2: { $max: "$pollutants.so2" },
          minPm25: { $min: "$pollutants.pm25" },
          minPm10: { $min: "$pollutants.pm10" },
          minCo2: { $min: "$pollutants.co2" },
          minNo2: { $min: "$pollutants.no2" },
          minSo2: { $min: "$pollutants.so2" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
    ]);

    res.json(aggregatedData);
  } catch (error) {
    console.error("Error getting analysis data:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
