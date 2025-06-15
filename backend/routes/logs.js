const express = require("express");
const router = express.Router();
const Log = require("../model/Log");

// Get all logs
router.get("/", async (req, res) => {
  try {
    console.log("Getting all logs...");
    const logs = await Log.find();
    console.log("Found logs:", logs.length);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a log
router.post("/", async (req, res) => {
  try {
    console.log("Creating log with data:", req.body);
    const log = new Log(req.body);
    await log.save();
    console.log("Log created successfully:", log);
    res.status(201).json(log);
  } catch (error) {
    console.error("Error creating log:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a log (e.g., mark as resolved)
router.put("/:id", async (req, res) => {
  try {
    console.log("Updating log:", req.params.id, "with data:", req.body);
    const log = await Log.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!log) {
      return res.status(404).json({ error: "Log not found" });
    }
    console.log("Log updated successfully:", log);
    res.json(log);
  } catch (error) {
    console.error("Error updating log:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a log
router.delete("/:id", async (req, res) => {
  try {
    console.log("Deleting log:", req.params.id);
    const log = await Log.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ error: "Log not found" });
    }
    console.log("Log deleted successfully");
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting log:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
