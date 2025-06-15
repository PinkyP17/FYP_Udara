const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  title: String,
  timestamp: String,
  status: { type: String, enum: ["resolved", "unresolved"] },
  category: { type: String, enum: ["all", "iot", "cloud"] },
  icon: String, // You can store a string identifier for the icon
  message: String,
  details: Object,
});

module.exports = mongoose.model("Log", logSchema);
