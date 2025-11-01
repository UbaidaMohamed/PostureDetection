const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

async function checkUsers() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/posture-correction"
    );
    console.log("✅ Connected to MongoDB");

    const users = await User.find({});
    console.log("📊 Number of users in database:", users.length);

    if (users.length > 0) {
      console.log("👤 Sample users:");
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. Email: ${user.email}, Name: ${user.name}`);
      });
    } else {
      console.log("❌ No users found in database");
    }

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkUsers();
