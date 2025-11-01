const mongoose = require('mongoose');
const User = require('./models/User');
const UserSettings = require('./models/UserSettings');
require('dotenv').config();

async function testSettings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/posture-correction');
    console.log('✅ Connected to MongoDB');
    
    const testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log('👤 Found test user:', testUser.email);
    
    // Check if settings exist
    let settings = await UserSettings.findOne({ userId: testUser._id });
    if (!settings) {
      console.log('📝 Creating default settings for test user');
      settings = new UserSettings({
        userId: testUser._id,
        notifications: {
          enabled: true,
          postureReminders: true,
          reminderInterval: 30
        },
        monitoring: {
          enabled: true,
          sensitivity: 'medium',
          cameraPermission: true
        }
      });
      await settings.save();
    }
    
    console.log('⚙️ User settings exist:', !!settings);
    console.log('📊 Settings data preview:');
    console.log('- Notifications enabled:', settings.notifications?.enabled);
    console.log('- Monitoring sensitivity:', settings.monitoring?.sensitivity);
    console.log('- Camera permission:', settings.monitoring?.cameraPermission);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

testSettings();