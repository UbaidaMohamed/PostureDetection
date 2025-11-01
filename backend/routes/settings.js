const express = require("express");
const Joi = require("joi");
const UserSettings = require("../models/UserSettings");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Validation schema for settings
const settingsSchema = Joi.object({
  notifications: Joi.object({
    enabled: Joi.boolean().optional(),
    postureReminders: Joi.boolean().optional(),
    breakReminders: Joi.boolean().optional(),
    reminderInterval: Joi.number().integer().min(5).max(180).optional(), // minutes
    dailyReports: Joi.boolean().optional(),
    weeklyReports: Joi.boolean().optional(),
    achievementNotifications: Joi.boolean().optional(),
    reminderSound: Joi.string()
      .valid("chime", "bell", "notification", "gentle", "silent")
      .optional(),
    quietHours: Joi.object({
      enabled: Joi.boolean().optional(),
      startTime: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional(),
      endTime: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional(),
    }).optional(),
  }).optional(),
  monitoring: Joi.object({
    enabled: Joi.boolean().optional(),
    sensitivity: Joi.string().valid("low", "medium", "high").optional(),
    autoStart: Joi.boolean().optional(),
    cameraPermission: Joi.boolean().optional(),
    backgroundMonitoring: Joi.boolean().optional(),
    workingHours: Joi.object({
      enabled: Joi.boolean().optional(),
      startTime: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional(),
      endTime: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional(),
      days: Joi.array()
        .items(
          Joi.string().valid(
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday"
          )
        )
        .optional(),
    }).optional(),
    breaks: Joi.object({
      enabled: Joi.boolean().optional(),
      interval: Joi.number().integer().min(15).max(240).optional(), // minutes
      duration: Joi.number().integer().min(1).max(30).optional(), // minutes
      type: Joi.string().valid("micro", "short", "long").optional(),
    }).optional(),
  }).optional(),
  privacy: Joi.object({
    dataSharing: Joi.boolean().optional(),
    analytics: Joi.boolean().optional(),
    crashReports: Joi.boolean().optional(),
    usageStatistics: Joi.boolean().optional(),
    improveProduct: Joi.boolean().optional(),
    personalizedRecommendations: Joi.boolean().optional(),
  }).optional(),
  display: Joi.object({
    theme: Joi.string().valid("light", "dark", "auto", "system").optional(),
    language: Joi.string().max(10).optional(),
    units: Joi.string().valid("metric", "imperial").optional(),
    fontSize: Joi.string().valid("small", "medium", "large").optional(),
    colorScheme: Joi.string()
      .valid("default", "high-contrast", "blue-light-filter")
      .optional(),
    animations: Joi.boolean().optional(),
    showOnboarding: Joi.boolean().optional(),
  }).optional(),
  goals: Joi.object({
    dailyPostureScore: Joi.number().min(50).max(100).optional(),
    dailyMonitoringHours: Joi.number().min(1).max(16).optional(),
    weeklyImprovementTarget: Joi.number().min(1).max(20).optional(),
    monthlyStreakTarget: Joi.number().min(1).max(31).optional(),
    customGoals: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().max(50).required(),
          target: Joi.number().min(1).required(),
          unit: Joi.string().max(20).required(),
          period: Joi.string()
            .valid("daily", "weekly", "monthly")
            .default("daily"),
          active: Joi.boolean().default(true),
        })
      )
      .optional(),
  }).optional(),
  accessibility: Joi.object({
    highContrast: Joi.boolean().optional(),
    largeText: Joi.boolean().optional(),
    screenReader: Joi.boolean().optional(),
    keyboardNavigation: Joi.boolean().optional(),
    voiceAlerts: Joi.boolean().optional(),
    visualAlerts: Joi.boolean().optional(),
    reducedMotion: Joi.boolean().optional(),
  }).optional(),
  integrations: Joi.object({
    healthKit: Joi.object({
      enabled: Joi.boolean().optional(),
      syncFrequency: Joi.string()
        .valid("realtime", "hourly", "daily")
        .optional(),
    }).optional(),
    googleFit: Joi.object({
      enabled: Joi.boolean().optional(),
      syncFrequency: Joi.string()
        .valid("realtime", "hourly", "daily")
        .optional(),
    }).optional(),
    calendar: Joi.object({
      enabled: Joi.boolean().optional(),
      provider: Joi.string().valid("google", "outlook", "apple").optional(),
    }).optional(),
    slack: Joi.object({
      enabled: Joi.boolean().optional(),
      webhook: Joi.string().max(200).optional(),
    }).optional(),
  }).optional(),
  advanced: Joi.object({
    dataRetention: Joi.number().min(30).max(365).optional(),
    exportFormat: Joi.string().valid("json", "csv", "xlsx").optional(),
    backupFrequency: Joi.string()
      .valid("never", "weekly", "monthly")
      .optional(),
    debugMode: Joi.boolean().optional(),
    betaFeatures: Joi.boolean().optional(),
  }).optional(),
});

// @route   GET /api/settings
// @desc    Get user settings
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    let userSettings = await UserSettings.findOne({ userId: req.userId });

    // If no settings exist, create default settings
    if (!userSettings) {
      userSettings = new UserSettings({
        userId: req.userId,
        notifications: {
          enabled: true,
          postureReminders: true,
          breakReminders: true,
          reminderInterval: 30,
          dailyReports: true,
          weeklyReports: true,
        },
        monitoring: {
          enabled: true,
          sensitivity: "medium",
          autoStart: false,
          workingHours: {
            enabled: false,
            startTime: "09:00",
            endTime: "17:00",
            days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
          },
        },
        privacy: {
          dataSharing: false,
          analytics: true,
          crashReports: true,
        },
        display: {
          theme: "auto",
          language: "en",
          units: "metric",
        },
        goals: {
          dailyPostureScore: 80,
          dailyMonitoringHours: 6,
          weeklyImprovementTarget: 5,
        },
      });

      await userSettings.save();
    }

    res.json({
      data: userSettings,
    });
  } catch (error) {
    console.error("Settings fetch error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to fetch settings",
    });
  }
});

// @route   PUT /api/settings
// @desc    Update user settings
// @access  Private
router.put("/", auth, async (req, res) => {
  try {
    // Validate input
    const { error } = settingsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    let userSettings = await UserSettings.findOne({ userId: req.userId });

    if (!userSettings) {
      // Create new settings if they don't exist
      userSettings = new UserSettings({
        userId: req.userId,
        ...req.body,
      });
    } else {
      // Update existing settings (deep merge)
      Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === "object" && req.body[key] !== null) {
          userSettings[key] = { ...userSettings[key], ...req.body[key] };
        } else {
          userSettings[key] = req.body[key];
        }
      });
    }

    await userSettings.save();

    res.json({
      message: "Settings updated successfully",
      data: userSettings,
    });
  } catch (error) {
    console.error("Settings update error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to update settings",
    });
  }
});

// @route   PUT /api/settings/notifications
// @desc    Update notification settings specifically
// @access  Private
router.put("/notifications", auth, async (req, res) => {
  try {
    const notificationSchema = Joi.object({
      enabled: Joi.boolean().optional(),
      postureReminders: Joi.boolean().optional(),
      breakReminders: Joi.boolean().optional(),
      reminderInterval: Joi.number().integer().min(5).max(180).optional(),
      dailyReports: Joi.boolean().optional(),
      weeklyReports: Joi.boolean().optional(),
    });

    const { error } = notificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const userSettings = await UserSettings.findOneAndUpdate(
      { userId: req.userId },
      { $set: { notifications: req.body } },
      { new: true, upsert: true }
    );

    res.json({
      message: "Notification settings updated successfully",
      data: userSettings.notifications,
    });
  } catch (error) {
    console.error("Notification settings update error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to update notification settings",
    });
  }
});

// @route   PUT /api/settings/monitoring
// @desc    Update monitoring settings specifically
// @access  Private
router.put("/monitoring", auth, async (req, res) => {
  try {
    const monitoringSchema = Joi.object({
      enabled: Joi.boolean().optional(),
      sensitivity: Joi.string().valid("low", "medium", "high").optional(),
      autoStart: Joi.boolean().optional(),
      workingHours: Joi.object({
        enabled: Joi.boolean().optional(),
        startTime: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .optional(),
        endTime: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .optional(),
        days: Joi.array()
          .items(
            Joi.string().valid(
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday"
            )
          )
          .optional(),
      }).optional(),
    });

    const { error } = monitoringSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const userSettings = await UserSettings.findOneAndUpdate(
      { userId: req.userId },
      { $set: { monitoring: req.body } },
      { new: true, upsert: true }
    );

    res.json({
      message: "Monitoring settings updated successfully",
      data: userSettings.monitoring,
    });
  } catch (error) {
    console.error("Monitoring settings update error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to update monitoring settings",
    });
  }
});

// @route   PUT /api/settings/goals
// @desc    Update goal settings specifically
// @access  Private
router.put("/goals", auth, async (req, res) => {
  try {
    const goalsSchema = Joi.object({
      dailyPostureScore: Joi.number().min(50).max(100).optional(),
      dailyMonitoringHours: Joi.number().min(1).max(16).optional(),
      weeklyImprovementTarget: Joi.number().min(1).max(20).optional(),
    });

    const { error } = goalsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const userSettings = await UserSettings.findOneAndUpdate(
      { userId: req.userId },
      { $set: { goals: req.body } },
      { new: true, upsert: true }
    );

    res.json({
      message: "Goal settings updated successfully",
      data: userSettings.goals,
    });
  } catch (error) {
    console.error("Goal settings update error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to update goal settings",
    });
  }
});

// @route   DELETE /api/settings/reset
// @desc    Reset settings to default
// @access  Private
router.delete("/reset", auth, async (req, res) => {
  try {
    const defaultSettings = {
      userId: req.userId,
      notifications: {
        enabled: true,
        postureReminders: true,
        breakReminders: true,
        reminderInterval: 30,
        dailyReports: true,
        weeklyReports: true,
      },
      monitoring: {
        enabled: true,
        sensitivity: "medium",
        autoStart: false,
        workingHours: {
          enabled: false,
          startTime: "09:00",
          endTime: "17:00",
          days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        },
      },
      privacy: {
        dataSharing: false,
        analytics: true,
        crashReports: true,
      },
      display: {
        theme: "auto",
        language: "en",
        units: "metric",
      },
      goals: {
        dailyPostureScore: 80,
        dailyMonitoringHours: 6,
        weeklyImprovementTarget: 5,
      },
    };

    const userSettings = await UserSettings.findOneAndUpdate(
      { userId: req.userId },
      defaultSettings,
      { new: true, upsert: true }
    );

    res.json({
      message: "Settings reset to default successfully",
      data: userSettings,
    });
  } catch (error) {
    console.error("Settings reset error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to reset settings",
    });
  }
});

// @route   GET /api/settings/export
// @desc    Export user settings as JSON
// @access  Private
router.get("/export", auth, async (req, res) => {
  try {
    const userSettings = await UserSettings.findOne({ userId: req.userId });

    if (!userSettings) {
      return res.status(404).json({
        error: "Settings Not Found",
        message: "No settings found for this user",
      });
    }

    // Remove sensitive information
    const exportData = {
      notifications: userSettings.notifications,
      monitoring: userSettings.monitoring,
      display: userSettings.display,
      goals: userSettings.goals,
      exportedAt: new Date().toISOString(),
    };

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="posture-settings.json"'
    );
    res.setHeader("Content-Type", "application/json");
    res.json(exportData);
  } catch (error) {
    console.error("Settings export error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to export settings",
    });
  }
});

module.exports = router;
