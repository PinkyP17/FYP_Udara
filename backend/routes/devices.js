const express = require("express");
const router = express.Router();
const Device = require("../model/Device");

// Get all devices
router.get("/", async (req, res) => {
  try {
    const devices = await Device.find().sort({ createdAt: -1 });
    res.json(devices);
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a device
router.post("/", async (req, res) => {
  try {
    const device = new Device(req.body);
    await device.save();
    res.status(201).json(device);
  } catch (error) {
    console.error("Error creating device:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a device
router.put("/:id", async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    res.json(device);
  } catch (error) {
    console.error("Error updating device:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a device
router.delete("/:id", async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting device:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
