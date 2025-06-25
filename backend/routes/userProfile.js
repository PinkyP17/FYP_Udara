const express = require("express");
const router = express.Router();
const UserProfile = require("../model/UserProfile");

// POST /api/user-profile
router.post("/", async (req, res) => {
  const { clerkUserId, phone, location } = req.body;

  if (!clerkUserId) {
    return res.status(400).json({ error: "Missing clerkUserId" });
  }

  try {
    // Avoid duplicate entries
    let user = await UserProfile.findOne({ clerkUserId });

    if (!user) {
      user = new UserProfile({ clerkUserId, phone, location });
      await user.save();
    } else {
      // Optional: update existing profile if it already exists
      user.phone = phone;
      user.location = location;
      await user.save();
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error saving user profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
