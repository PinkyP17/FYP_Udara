const express = require("express");
const router = express.Router();
const Device = require("../model/Device");

// Validation middleware
const validateDeviceData = (req, res, next) => {
  const { deviceId, name, location } = req.body;

  if (!deviceId || !name) {
    return res.status(400).json({
      error: "deviceId and name are required",
    });
  }

  if (location && location.coordinates) {
    const { latitude, longitude } = location.coordinates;
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        error: "Latitude must be between -90 and 90",
      });
    }
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: "Longitude must be between -180 and 180",
      });
    }
  }

  next();
};

// Get all devices
router.get("/", async (req, res) => {
  try {
    const { status, active, search, limit, page } = req.query;

    // Build query
    let query = {};

    if (status) {
      query.status = status;
    }

    if (active !== undefined) {
      query.isActive = active === "true";
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { deviceId: { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const limitNum = parseInt(limit) || 50;
    const pageNum = parseInt(page) || 1;
    const skip = (pageNum - 1) * limitNum;

    const devices = await Device.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    const total = await Device.countDocuments(query);

    res.json({
      devices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get active devices only (for dashboard map)
router.get("/active", async (req, res) => {
  try {
    const devices = await Device.findActive().select(
      "deviceId name location status createdAt"
    );

    // Format for frontend map component
    const mapDevices = devices.map((device) => ({
      id: device._id,
      deviceId: device.deviceId,
      name: device.name,
      lat: device.location.coordinates.latitude,
      lng: device.location.coordinates.longitude,
      address: device.location.address,
      city: device.location.city,
      status: device.status,
      coordinates: device.getCoordinates(),
    }));

    res.json(mapDevices);
  } catch (error) {
    console.error("Error fetching active devices:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get device by ID or deviceId
router.get("/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try to find by MongoDB _id first, then by deviceId
    let device = await Device.findById(identifier);
    if (!device) {
      device = await Device.findOne({ deviceId: identifier.toUpperCase() });
    }

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json(device);
  } catch (error) {
    console.error("Error fetching device:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a device
router.post("/", validateDeviceData, async (req, res) => {
  try {
    // Check if deviceId already exists
    const existingDevice = await Device.findOne({
      deviceId: req.body.deviceId.toUpperCase(),
    });

    if (existingDevice) {
      return res.status(409).json({
        error: "Device with this deviceId already exists",
      });
    }

    const device = new Device(req.body);
    await device.save();

    res.status(201).json({
      message: "Device created successfully",
      device,
    });
  } catch (error) {
    console.error("Error creating device:", error);
    if (error.code === 11000) {
      res
        .status(409)
        .json({ error: "Device with this deviceId already exists" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update a device
router.put("/:id", validateDeviceData, async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({
      message: "Device updated successfully",
      device,
    });
  } catch (error) {
    console.error("Error updating device:", error);
    if (error.code === 11000) {
      res
        .status(409)
        .json({ error: "Device with this deviceId already exists" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update device status only
router.patch("/:id/status", async (req, res) => {
  try {
    const { status, isActive } = req.body;

    const updateData = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;

    const device = await Device.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({
      message: "Device status updated successfully",
      device: {
        _id: device._id,
        deviceId: device.deviceId,
        name: device.name,
        status: device.status,
        isActive: device.isActive,
      },
    });
  } catch (error) {
    console.error("Error updating device status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Find devices nearby a location
router.get("/nearby/:longitude/:latitude", async (req, res) => {
  try {
    const { longitude, latitude } = req.params;
    const { maxDistance = 10000 } = req.query; // Default 10km

    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const devices = await Device.findNearby(lng, lat, parseInt(maxDistance));

    res.json(devices);
  } catch (error) {
    console.error("Error finding nearby devices:", error);
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

    res.json({
      message: "Device deleted successfully",
      deletedDevice: {
        _id: device._id,
        deviceId: device.deviceId,
        name: device.name,
      },
    });
  } catch (error) {
    console.error("Error deleting device:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk operations
router.post("/bulk/status", async (req, res) => {
  try {
    const { deviceIds, status, isActive } = req.body;

    if (!deviceIds || !Array.isArray(deviceIds)) {
      return res.status(400).json({ error: "deviceIds array is required" });
    }

    const updateData = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await Device.updateMany(
      { _id: { $in: deviceIds } },
      updateData
    );

    res.json({
      message: `Updated ${result.modifiedCount} devices`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error bulk updating devices:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
