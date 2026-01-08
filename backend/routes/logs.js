const express = require("express");
const router = express.Router();
const Log = require("../model/Log");

// Get all logs with filtering and pagination
router.get("/", async (req, res) => {
  try {
    const {
      status,
      severity,
      category,
      device_id,
      limit = 50,
      page = 1,
      search,
    } = req.query;

    const query = {};

    if (status) query.status = status;
    
    if (severity) {
      if (severity.includes(',')) {
        query.severity = { $in: severity.split(',') };
      } else {
        query.severity = severity;
      }
    }
    
    if (category) query.category = category;
    if (device_id) query.device_id = device_id;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { device_id: { $regex: search, $options: "i" } },
      ];
    }

    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;

    const logs = await Log.find(query)
      .sort({ timestamp_detected: -1 })
      .limit(limitNum)
      .skip(skip);

    const total = await Log.countDocuments(query);

    res.json({
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get log by ID
router.get("/:id", async (req, res) => {
  try {
    const log = await Log.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: "Log not found" });
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a log
router.post("/", async (req, res) => {
  try {
    const log = new Log(req.body);
    await log.save();
    res.status(201).json(log);
  } catch (error) {
    console.error("Error creating log:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a log
router.put("/:id", async (req, res) => {
  try {
    const { status, acknowledged, notes } = req.body;
    const updateData = { ...req.body };

    // Automatically set timestamp_resolved if status changes to resolved
    if (status === "resolved") {
      updateData.timestamp_resolved = new Date();
    }

    // Handle notes appending if sent as a single note object
    if (notes && !Array.isArray(notes)) {
      // If client sends a single note to add
      const log = await Log.findById(req.params.id);
      if (log) {
        log.notes.push(notes);
        if (status) log.status = status;
        if (acknowledged !== undefined) log.acknowledged = acknowledged;
        if (status === "resolved") log.timestamp_resolved = new Date();
        
        await log.save();
        return res.json(log);
      }
    }

    const log = await Log.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!log) {
      return res.status(404).json({ error: "Log not found" });
    }
    res.json(log);
  } catch (error) {
    console.error("Error updating log:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a log
router.delete("/:id", async (req, res) => {
  try {
    const log = await Log.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ error: "Log not found" });
    }
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting log:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get stats
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await Log.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
          critical: {
            $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
          },
          high: {
            $sum: { $cond: [{ $eq: ["$severity", "high"] }, 1, 0] },
          },
        },
      },
    ]);

    res.json(stats[0] || { total: 0, active: 0, resolved: 0, critical: 0, high: 0 });
  } catch (error) {
    console.error("Error fetching log stats:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;