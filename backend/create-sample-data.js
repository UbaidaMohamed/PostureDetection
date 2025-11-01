const mongoose = require("mongoose");
const User = require("./models/User");
const PostureLog = require("./models/PostureLog");
require("dotenv").config();

async function createSampleData() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/posture-correction"
    );
    console.log("✅ Connected to MongoDB");

    // Find test user
    const testUser = await User.findOne({ email: "test@example.com" });
    if (!testUser) {
      console.log(
        "❌ Test user not found. Please run create-test-user.js first"
      );
      return;
    }
    console.log("👤 Found test user:", testUser.email);

    // Clear existing posture logs for test user
    await PostureLog.deleteMany({ userId: testUser._id });
    console.log("🗑️ Cleared existing posture logs");

    // Create sample data for today (hourly data)
    const today = new Date();
    const todayLogs = [];

    for (let hour = 8; hour <= 18; hour++) {
      const timestamp = new Date(today);
      timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

      // Generate realistic posture scores (higher during work hours)
      let baseScore = 70;
      if (hour >= 9 && hour <= 12) baseScore = 80; // Morning productivity
      if (hour >= 14 && hour <= 17) baseScore = 75; // Afternoon work

      const postureScore = baseScore + Math.floor(Math.random() * 20) - 10; // ±10 variation

      todayLogs.push({
        userId: testUser._id,
        timestamp: timestamp,
        postureScore: Math.max(0, Math.min(100, postureScore)),
        postureType:
          postureScore >= 75
            ? "good"
            : postureScore >= 50
            ? "moderate"
            : "poor",
        imageData:
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
        duration: 30 + Math.floor(Math.random() * 30), // 30-60 minutes
      });
    }

    // Create sample data for the past week
    const weeklyLogs = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);

      // Generate multiple sessions per day
      for (let session = 0; session < 3; session++) {
        const timestamp = new Date(date);
        timestamp.setHours(
          9 + session * 3,
          Math.floor(Math.random() * 60),
          0,
          0
        );

        const postureScore = 60 + Math.floor(Math.random() * 30); // 60-90 range

        weeklyLogs.push({
          userId: testUser._id,
          timestamp: timestamp,
          postureScore: postureScore,
          postureType:
            postureScore >= 75
              ? "good"
              : postureScore >= 50
              ? "moderate"
              : "poor",
          imageData:
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
          duration: 45 + Math.floor(Math.random() * 30), // 45-75 minutes
        });
      }
    }

    // Insert all logs
    const allLogs = [...todayLogs, ...weeklyLogs];
    await PostureLog.insertMany(allLogs);

    console.log(
      `✅ Created ${todayLogs.length} today's logs and ${weeklyLogs.length} weekly logs`
    );
    console.log(`📊 Total sample data points: ${allLogs.length}`);

    // Display some stats
    const totalLogs = await PostureLog.countDocuments({ userId: testUser._id });
    const avgScore = await PostureLog.aggregate([
      { $match: { userId: testUser._id } },
      { $group: { _id: null, avgScore: { $avg: "$postureScore" } } },
    ]);

    console.log(`📈 Total logs in database: ${totalLogs}`);
    console.log(
      `📊 Average posture score: ${Math.round(avgScore[0]?.avgScore || 0)}%`
    );

    console.log("\n🎯 Sample data created successfully!");
    console.log("You can now test the dashboard with:");
    console.log("- Email: test@example.com");
    console.log("- Password: test123456");
  } catch (error) {
    console.error("❌ Error creating sample data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

createSampleData();
