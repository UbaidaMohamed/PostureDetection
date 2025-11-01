const bcrypt = require("bcryptjs");

async function testBcrypt() {
  try {
    console.log("🧪 Testing bcrypt functionality...");

    const password = "test123456";
    console.log("📝 Original password:", password);

    // Test different salt rounds
    for (const saltRounds of [10, 12]) {
      console.log(`\n🔧 Testing with salt rounds: ${saltRounds}`);

      const hash = await bcrypt.hash(password, saltRounds);
      console.log("🔐 Generated hash:", hash.substring(0, 30) + "...");

      const isMatch = await bcrypt.compare(password, hash);
      console.log("✅ Comparison result:", isMatch ? "SUCCESS" : "FAILED");

      // Test with wrong password
      const wrongMatch = await bcrypt.compare("wrongpassword", hash);
      console.log(
        "❌ Wrong password test:",
        wrongMatch ? "FAILED (should be false)" : "SUCCESS (correctly false)"
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testBcrypt();
