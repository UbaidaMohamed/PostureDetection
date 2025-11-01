const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

async function testLogin() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/posture-correction"
    );
    console.log("✅ Connected to MongoDB");

    // Get the first user
    const user = await User.findOne({ email: "3bida.25.mohamed@gmail.com" });
    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log("👤 Found user:", { email: user.email, name: user.name });
    console.log(
      "🔑 Stored password hash:",
      user.password.substring(0, 20) + "..."
    );

    // Test password comparison with different passwords
    const testPasswords = [
      "123456",
      "password",
      "wrongpassword",
      "test123",
      "Ubaida123",
    ];

    for (const testPassword of testPasswords) {
      const isMatch = await bcrypt.compare(testPassword, user.password);
      console.log(
        `🔍 Testing password "${testPassword}": ${
          isMatch ? "✅ MATCH" : "❌ NO MATCH"
        }`
      );
    }

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testLogin();
