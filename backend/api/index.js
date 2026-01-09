// api/index.js - Serverless version for Vercel
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://udara-frontend.vercel.app',  
  ],
  credentials: true
}));
app.use(express.json());

// MongoDB connection with caching for serverless
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    
    cachedDb = connection;
    console.log("MongoDB connected successfully");
    return connection;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

// Connect to DB before handling requests
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Routes
const logsRouter = require("../routes/logs");
const devicesRouter = require("../routes/devices");
const userProfileRouter = require("../routes/userRoute");
const airQualityRouter = require("../routes/airQualityData");
const sensorDataRoute = require('../routes/sensorData');
const notificationRoute = require('../routes/notificationRoute');
const csvUploadRoute = require('../routes/csvUpload');

app.use("/api/logs", logsRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/user", userProfileRouter);
app.use("/api/air-quality", airQualityRouter);
app.use("/api/sensor", sensorDataRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/csv-upload", csvUploadRoute);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Server is running on Vercel!",
    endpoints: [
      "GET /api/logs - Get all logs",
      "GET /api/devices - Get all devices",
      "GET /api/user - Get user data",
      "GET /api/air-quality - Get air quality data",
      "GET /api/sensor - Get sensor data",
      "GET /api/notifications - Get notifications",
      "POST /api/csv-upload - Upload CSV data",
    ],
  });
});

app.get("/api", (req, res) => {
  res.json({
    message: "API is working!",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Export for Vercel serverless
module.exports = app;

// Add this part for local development:
if (process.env.NODE_VALUE !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server is running locally on http://localhost:${PORT}`);
  });
}