const mongoose = require("mongoose");

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
      index: true,
    },
    notifications: {
      enabled: {
        type: Boolean,
        default: true,
      },
      postureReminders: {
        type: Boolean,
        default: true,
      },
      breakReminders: {
        type: Boolean,
        default: true,
      },
      reminderInterval: {
        type: Number,
        min: [5, "Reminder interval cannot be less than 5 minutes"],
        max: [180, "Reminder interval cannot exceed 180 minutes"],
        default: 30,
      },
      dailyReports: {
        type: Boolean,
        default: true,
      },
      weeklyReports: {
        type: Boolean,
        default: true,
      },
      achievementNotifications: {
        type: Boolean,
        default: true,
      },
      reminderSound: {
        type: String,
        enum: ["chime", "bell", "notification", "gentle", "silent"],
        default: "chime",
      },
      quietHours: {
        enabled: {
          type: Boolean,
          default: false,
        },
        startTime: {
          type: String,
          match: [
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            "Start time must be in HH:MM format",
          ],
          default: "22:00",
        },
        endTime: {
          type: String,
          match: [
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            "End time must be in HH:MM format",
          ],
          default: "08:00",
        },
      },
    },
    monitoring: {
      enabled: {
        type: Boolean,
        default: true,
      },
      sensitivity: {
        type: String,
        enum: {
          values: ["low", "medium", "high"],
          message: "Sensitivity must be low, medium, or high",
        },
        default: "medium",
      },
      autoStart: {
        type: Boolean,
        default: false,
      },
      cameraPermission: {
        type: Boolean,
        default: false,
      },
      backgroundMonitoring: {
        type: Boolean,
        default: true,
      },
      workingHours: {
        enabled: {
          type: Boolean,
          default: false,
        },
        startTime: {
          type: String,
          match: [
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            "Start time must be in HH:MM format",
          ],
          default: "09:00",
        },
        endTime: {
          type: String,
          match: [
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            "End time must be in HH:MM format",
          ],
          default: "17:00",
        },
        days: [
          {
            type: String,
            enum: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ],
          },
        ],
        default: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      },
      breaks: {
        enabled: {
          type: Boolean,
          default: true,
        },
        interval: {
          type: Number,
          min: [15, "Break interval cannot be less than 15 minutes"],
          max: [240, "Break interval cannot exceed 240 minutes"],
          default: 60,
        },
        duration: {
          type: Number,
          min: [1, "Break duration cannot be less than 1 minute"],
          max: [30, "Break duration cannot exceed 30 minutes"],
          default: 5,
        },
        type: {
          type: String,
          enum: ["micro", "short", "long"],
          default: "short",
        },
      },
    },
    privacy: {
      dataSharing: {
        type: Boolean,
        default: false,
      },
      analytics: {
        type: Boolean,
        default: true,
      },
      crashReports: {
        type: Boolean,
        default: true,
      },
      usageStatistics: {
        type: Boolean,
        default: true,
      },
      improveProduct: {
        type: Boolean,
        default: false,
      },
      personalizedRecommendations: {
        type: Boolean,
        default: true,
      },
    },
    display: {
      theme: {
        type: String,
        enum: {
          values: ["light", "dark", "auto"],
          message: "Theme must be light, dark, or auto",
        },
        default: "auto",
      },
      language: {
        type: String,
        maxlength: [10, "Language code cannot exceed 10 characters"],
        default: "en",
      },
      units: {
        type: String,
        enum: {
          values: ["metric", "imperial"],
          message: "Units must be metric or imperial",
        },
        default: "metric",
      },
      fontSize: {
        type: String,
        enum: ["small", "medium", "large"],
        default: "medium",
      },
      colorScheme: {
        type: String,
        enum: ["default", "high-contrast", "blue-light-filter"],
        default: "default",
      },
      animations: {
        type: Boolean,
        default: true,
      },
      showOnboarding: {
        type: Boolean,
        default: true,
      },
    },
    goals: {
      dailyPostureScore: {
        type: Number,
        min: [50, "Daily posture score goal cannot be less than 50"],
        max: [100, "Daily posture score goal cannot exceed 100"],
        default: 80,
      },
      dailyMonitoringHours: {
        type: Number,
        min: [1, "Daily monitoring hours cannot be less than 1"],
        max: [16, "Daily monitoring hours cannot exceed 16"],
        default: 6,
      },
      weeklyImprovementTarget: {
        type: Number,
        min: [1, "Weekly improvement target cannot be less than 1%"],
        max: [20, "Weekly improvement target cannot exceed 20%"],
        default: 5,
      },
      monthlyStreakTarget: {
        type: Number,
        min: [1, "Monthly streak target cannot be less than 1 day"],
        max: [31, "Monthly streak target cannot exceed 31 days"],
        default: 20,
      },
      customGoals: [
        {
          name: {
            type: String,
            maxlength: [50, "Goal name cannot exceed 50 characters"],
            required: true,
          },
          target: {
            type: Number,
            required: true,
            min: [1, "Goal target must be at least 1"],
          },
          unit: {
            type: String,
            maxlength: [20, "Goal unit cannot exceed 20 characters"],
            required: true,
          },
          period: {
            type: String,
            enum: ["daily", "weekly", "monthly"],
            default: "daily",
          },
          active: {
            type: Boolean,
            default: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    accessibility: {
      highContrast: {
        type: Boolean,
        default: false,
      },
      largeText: {
        type: Boolean,
        default: false,
      },
      screenReader: {
        type: Boolean,
        default: false,
      },
      keyboardNavigation: {
        type: Boolean,
        default: false,
      },
      voiceAlerts: {
        type: Boolean,
        default: false,
      },
      visualAlerts: {
        type: Boolean,
        default: true,
      },
      reducedMotion: {
        type: Boolean,
        default: false,
      },
    },
    integrations: {
      healthKit: {
        enabled: {
          type: Boolean,
          default: false,
        },
        syncFrequency: {
          type: String,
          enum: ["realtime", "hourly", "daily"],
          default: "daily",
        },
      },
      googleFit: {
        enabled: {
          type: Boolean,
          default: false,
        },
        syncFrequency: {
          type: String,
          enum: ["realtime", "hourly", "daily"],
          default: "daily",
        },
      },
      calendar: {
        enabled: {
          type: Boolean,
          default: false,
        },
        provider: {
          type: String,
          enum: ["google", "outlook", "apple"],
          default: "google",
        },
      },
      slack: {
        enabled: {
          type: Boolean,
          default: false,
        },
        webhook: {
          type: String,
          maxlength: [200, "Webhook URL cannot exceed 200 characters"],
        },
      },
    },
    advanced: {
      dataRetention: {
        type: Number,
        min: [30, "Data retention cannot be less than 30 days"],
        max: [365, "Data retention cannot exceed 365 days"],
        default: 90,
      },
      exportFormat: {
        type: String,
        enum: ["json", "csv", "xlsx"],
        default: "json",
      },
      backupFrequency: {
        type: String,
        enum: ["never", "weekly", "monthly"],
        default: "monthly",
      },
      debugMode: {
        type: Boolean,
        default: false,
      },
      betaFeatures: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for efficient queries
userSettingsSchema.index({ userId: 1 });
userSettingsSchema.index({ "notifications.enabled": 1 });
userSettingsSchema.index({ "monitoring.enabled": 1 });

// Virtual for checking if user is in quiet hours
userSettingsSchema.virtual("isInQuietHours").get(function () {
  if (!this.notifications.quietHours.enabled) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  const startTime = this.notifications.quietHours.startTime;
  const endTime = this.notifications.quietHours.endTime;

  // Handle case where quiet hours span midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
});

// Virtual for checking if user is in working hours
userSettingsSchema.virtual("isInWorkingHours").get(function () {
  if (!this.monitoring.workingHours.enabled) return true;

  const now = new Date();
  const currentDay = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  // Check if current day is in working days
  if (!this.monitoring.workingHours.days.includes(currentDay)) return false;

  const startTime = this.monitoring.workingHours.startTime;
  const endTime = this.monitoring.workingHours.endTime;

  return currentTime >= startTime && currentTime <= endTime;
});

// Instance method to get notification preferences
userSettingsSchema.methods.getNotificationPreferences = function () {
  return {
    enabled: this.notifications.enabled && !this.isInQuietHours,
    postureReminders: this.notifications.postureReminders,
    breakReminders: this.notifications.breakReminders,
    reminderInterval: this.notifications.reminderInterval,
    sound: this.notifications.reminderSound,
  };
};

// Instance method to get monitoring preferences
userSettingsSchema.methods.getMonitoringPreferences = function () {
  return {
    enabled: this.monitoring.enabled && this.isInWorkingHours,
    sensitivity: this.monitoring.sensitivity,
    backgroundMonitoring: this.monitoring.backgroundMonitoring,
    cameraPermission: this.monitoring.cameraPermission,
  };
};

// Instance method to check if feature is enabled
userSettingsSchema.methods.isFeatureEnabled = function (feature) {
  const features = {
    notifications: this.notifications.enabled,
    monitoring: this.monitoring.enabled,
    breaks: this.monitoring.breaks.enabled,
    dataSharing: this.privacy.dataSharing,
    analytics: this.privacy.analytics,
    betaFeatures: this.advanced.betaFeatures,
  };

  return features[feature] || false;
};

// Instance method to update a specific setting category
userSettingsSchema.methods.updateCategory = function (category, settings) {
  if (this[category]) {
    Object.assign(this[category], settings);
    return this.save();
  }
  throw new Error(`Invalid settings category: ${category}`);
};

// Static method to get default settings
userSettingsSchema.statics.getDefaultSettings = function () {
  return {
    notifications: {
      enabled: true,
      postureReminders: true,
      breakReminders: true,
      reminderInterval: 30,
      dailyReports: true,
      weeklyReports: true,
      achievementNotifications: true,
      reminderSound: "chime",
      quietHours: {
        enabled: false,
        startTime: "22:00",
        endTime: "08:00",
      },
    },
    monitoring: {
      enabled: true,
      sensitivity: "medium",
      autoStart: false,
      cameraPermission: false,
      backgroundMonitoring: true,
      workingHours: {
        enabled: false,
        startTime: "09:00",
        endTime: "17:00",
        days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      },
      breaks: {
        enabled: true,
        interval: 60,
        duration: 5,
        type: "short",
      },
    },
    privacy: {
      dataSharing: false,
      analytics: true,
      crashReports: true,
      usageStatistics: true,
      improveProduct: false,
      personalizedRecommendations: true,
    },
    display: {
      theme: "auto",
      language: "en",
      units: "metric",
      fontSize: "medium",
      colorScheme: "default",
      animations: true,
      showOnboarding: true,
    },
    goals: {
      dailyPostureScore: 80,
      dailyMonitoringHours: 6,
      weeklyImprovementTarget: 5,
      monthlyStreakTarget: 20,
      customGoals: [],
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      screenReader: false,
      keyboardNavigation: false,
      voiceAlerts: false,
      visualAlerts: true,
      reducedMotion: false,
    },
    integrations: {
      healthKit: { enabled: false, syncFrequency: "daily" },
      googleFit: { enabled: false, syncFrequency: "daily" },
      calendar: { enabled: false, provider: "google" },
      slack: { enabled: false },
    },
    advanced: {
      dataRetention: 90,
      exportFormat: "json",
      backupFrequency: "monthly",
      debugMode: false,
      betaFeatures: false,
    },
  };
};

// Pre-save middleware to validate working hours
userSettingsSchema.pre("save", function (next) {
  if (this.monitoring.workingHours.enabled) {
    if (this.monitoring.workingHours.days.length === 0) {
      return next(new Error("At least one working day must be selected"));
    }
  }
  next();
});

// Pre-save middleware to validate quiet hours
userSettingsSchema.pre("save", function (next) {
  if (this.notifications.quietHours.enabled) {
    const startTime = this.notifications.quietHours.startTime;
    const endTime = this.notifications.quietHours.endTime;

    if (startTime === endTime) {
      return next(
        new Error("Quiet hours start and end time cannot be the same")
      );
    }
  }
  next();
});

module.exports = mongoose.model("UserSettings", userSettingsSchema);
