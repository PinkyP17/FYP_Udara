// index.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

//Model
const { AirQualityReading } = require("./model/AirQualityReading");

// Routes
const logsRouter = require("./routes/logs");
const devicesRouter = require("./routes/devices");
const pollutantDataRouter = require("./routes/pollutantData");
const userProfileRouter = require("./routes/userProfile");
const airQualityRouter = require("./routes/airQualityData");

app.use("/api/logs", logsRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/pollutant-data", pollutantDataRouter);
app.use("/api/user-profile", userProfileRouter);
app.use("/api/air-quality", airQualityRouter);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Server is running!",
    endpoints: [
      "GET /api/logs - Get all logs",
      "GET /api/devices - Get all devices",
      "GET /api/pollutant-data - Get pollutant data",
      "GET /api/pollutant-data/analysis - Get aggregated analysis data",
    ],
  });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
