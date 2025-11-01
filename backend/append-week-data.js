const mongoose = require("mongoose");
const User = require("./models/User");
const PostureLog = require("./models/PostureLog");
require("dotenv").config();

async function appendWeekData() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/posture-correction"
    );
    console.log("✅ Connected to MongoDB");

    const testUser = await User.findOne({ email: "test@example.com" });
    if (!testUser) {
      console.log("❌ Test user not found. Please create test user first.");
      return;
    }

    const now = new Date();

    // We'll create additional logs for the previous 7 days (not including today)
    // Days 1-3: lower scores (40-55) to lower the average
    // Days 4-7: higher scores (80-95) to raise the average
    const extraLogs = [];

    for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
      const date = new Date(now);
      date.setDate(now.getDate() - daysAgo);

      // create between 2 and 5 sessions per day
      const sessions = 3 + Math.floor(Math.random() * 3);
      for (let s = 0; s < sessions; s++) {
        const timestamp = new Date(date);
        timestamp.setHours(
          8 + s * 3 + Math.floor(Math.random() * 3),
          Math.floor(Math.random() * 60),
          0,
          0
        );

        let postureScore;
        if (daysAgo <= 3) {
          postureScore = 40 + Math.floor(Math.random() * 16); // 40-55
        } else {
          postureScore = 80 + Math.floor(Math.random() * 16); // 80-95
        }

        extraLogs.push({
          userId: testUser._id,
          timestamp,
          postureScore,
          postureType:
            postureScore >= 75
              ? "good"
              : postureScore >= 50
              ? "moderate"
              : "poor",
          duration: 30 * 60 + Math.floor(Math.random() * 30) * 60, // 30-60 minutes
          measurements: {
            neckAngle: Math.round((Math.random() * 30 - 15) * 10) / 10,
            spineAlignment: Math.round((Math.random() * 60 - 30) * 10) / 10,
            headTilt: Math.round((Math.random() * 20 - 10) * 10) / 10,
            eyeToScreenDistance: 50 + Math.floor(Math.random() * 60),
          },
          feedback: {
            alertTriggered: postureScore < 60,
          },
        });
      }
    }

    const result = await PostureLog.insertMany(extraLogs);
    console.log(
      `✅ Inserted ${result.length} additional posture logs for last week`
    );

    const total = await PostureLog.countDocuments({ userId: testUser._id });
    const avg = await PostureLog.aggregate([
      { $match: { userId: testUser._id } },
      { $group: { _id: null, avgScore: { $avg: "$postureScore" } } },
    ]);

    console.log(`📊 Total logs for user: ${total}`);
    console.log(
      `📈 New average posture score: ${Math.round(avg[0]?.avgScore || 0)}%`
    );
  } catch (err) {
    console.error("❌ Error appending week data:", err);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

appendWeekData();
