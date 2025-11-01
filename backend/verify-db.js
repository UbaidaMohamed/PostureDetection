const mongoose = require("mongoose");
const User = require("./models/User");
const PostureLog = require("./models/PostureLog");
require("dotenv").config();

async function verify() {
  const uri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/posture-correction";
  // Mask password for logging
  const masked = uri.replace(/:(?:[^:@]+)@/, ":*****@");
  console.log("Using MONGODB_URI:", masked);

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    console.log("DB name:", mongoose.connection.name);

    const userCount = await User.countDocuments();
    const logCount = await PostureLog.countDocuments();
    console.log(`Users: ${userCount}, PostureLogs: ${logCount}`);

    const testUser = await User.findOne({ email: "test@example.com" });
    if (testUser) {
      console.log("Found test user id:", testUser._id.toString());
      const sample = await PostureLog.findOne({ userId: testUser._id })
        .sort({ timestamp: -1 })
        .lean();
      if (sample) {
        console.log("Sample PostureLog (latest):");
        console.log({
          _id: sample._id.toString(),
          timestamp: sample.timestamp,
          postureScore: sample.postureScore,
          postureType: sample.postureType,
        });
      } else {
        console.log("No posture logs found for test user.");
      }
    } else {
      console.log("Test user not found.");
    }
  } catch (err) {
    console.error("❌ Error verifying DB:", err.message || err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected");
  }
}

verify();
