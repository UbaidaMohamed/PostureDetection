const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

async function createTestUser() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/posture-correction"
    );
    console.log("✅ Connected to MongoDB");

    // Delete existing test user if exists
    await User.deleteOne({ email: "test@example.com" });
    console.log("🗑️ Deleted existing test user if it existed");

    // Create a new test user with plain text password (pre-save middleware will hash it)
    const testPassword = "test123456";

    const testUser = new User({
      name: "Test User",
      email: "test@example.com",
      password: testPassword, // Plain text - middleware will hash it
      profile: {
        age: 25,
        height: 170,
        weight: 70,
      },
    });

    await testUser.save();
    console.log("✅ Created test user with email: test@example.com");
    console.log("🔑 Password: test123456");

    // Test password comparison using the model method
    const isMatch = await testUser.comparePassword(testPassword);
    console.log(
      `🔍 Password verification: ${isMatch ? "✅ SUCCESS" : "❌ FAILED"}`
    );

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    console.log("🧪 Now you can test login with:");
    console.log("   Email: test@example.com");
    console.log("   Password: test123456");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

createTestUser();
