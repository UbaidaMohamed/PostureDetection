const mongoose = require("mongoose");

const postureLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    postureScore: {
      type: Number,
      required: [true, "Posture score is required"],
      min: [0, "Posture score cannot be less than 0"],
      max: [100, "Posture score cannot exceed 100"],
    },
    postureType: {
      type: String,
      enum: {
        values: ["good", "moderate", "poor"],
        message: "Posture type must be either good, moderate, or poor",
      },
      required: [true, "Posture type is required"],
      index: true,
    },
    measurements: {
      neckAngle: {
        type: Number,
        min: [-90, "Neck angle cannot be less than -90 degrees"],
        max: [90, "Neck angle cannot exceed 90 degrees"],
      },
      shoulderAlignment: {
        type: Number,
        min: [-45, "Shoulder alignment cannot be less than -45 degrees"],
        max: [45, "Shoulder alignment cannot exceed 45 degrees"],
      },
      spineAlignment: {
        type: Number,
        min: [-180, "Spine alignment cannot be less than -180 degrees"],
        max: [180, "Spine alignment cannot exceed 180 degrees"],
      },
      headTilt: {
        type: Number,
        min: [-45, "Head tilt cannot be less than -45 degrees"],
        max: [45, "Head tilt cannot exceed 45 degrees"],
      },
      eyeToScreenDistance: {
        type: Number,
        min: [10, "Eye to screen distance cannot be less than 10cm"],
        max: [200, "Eye to screen distance cannot exceed 200cm"],
      },
    },
    duration: {
      type: Number,
      min: [1, "Duration must be at least 1 second"],
      max: [86400, "Duration cannot exceed 24 hours (86400 seconds)"], // 24 hours in seconds
      default: 1,
    },
    environment: {
      location: {
        type: String,
        maxlength: [100, "Location cannot exceed 100 characters"],
        trim: true,
      },
      activity: {
        type: String,
        enum: {
          values: [
            "working",
            "gaming",
            "studying",
            "watching",
            "reading",
            "browsing",
            "other",
          ],
          message:
            "Activity must be one of: working, gaming, studying, watching, reading, browsing, other",
        },
        default: "working",
      },
      device: {
        type: String,
        enum: {
          values: ["desktop", "laptop", "tablet", "mobile", "other"],
          message:
            "Device must be one of: desktop, laptop, tablet, mobile, other",
        },
        default: "desktop",
      },
      lightingCondition: {
        type: String,
        enum: {
          values: ["bright", "moderate", "dim", "dark"],
          message:
            "Lighting condition must be one of: bright, moderate, dim, dark",
        },
      },
      ergonomicSetup: {
        chairType: {
          type: String,
          enum: ["ergonomic", "office", "gaming", "dining", "sofa", "other"],
          default: "office",
        },
        deskHeight: {
          type: Number,
          min: [50, "Desk height cannot be less than 50cm"],
          max: [150, "Desk height cannot exceed 150cm"],
        },
        monitorHeight: {
          type: Number,
          min: [50, "Monitor height cannot be less than 50cm"],
          max: [200, "Monitor height cannot exceed 200cm"],
        },
        hasFootrest: {
          type: Boolean,
          default: false,
        },
        hasLumbarSupport: {
          type: Boolean,
          default: false,
        },
      },
    },
    feedback: {
      alertTriggered: {
        type: Boolean,
        default: false,
      },
      correctionSuggested: {
        type: String,
        maxlength: [200, "Correction suggestion cannot exceed 200 characters"],
      },
      userResponse: {
        type: String,
        enum: ["corrected", "ignored", "dismissed", "snoozed", null],
        default: null,
      },
      responseTime: {
        type: Number, // Time in seconds to respond to alert
        min: [0, "Response time cannot be negative"],
      },
    },
    metadata: {
      sessionId: {
        type: String,
        maxlength: [50, "Session ID cannot exceed 50 characters"],
      },
      appVersion: {
        type: String,
        maxlength: [20, "App version cannot exceed 20 characters"],
      },
      cameraUsed: {
        type: Boolean,
        default: false,
      },
      aiModelVersion: {
        type: String,
        maxlength: [20, "AI model version cannot exceed 20 characters"],
      },
      confidence: {
        type: Number,
        min: [0, "Confidence cannot be less than 0"],
        max: [1, "Confidence cannot exceed 1"],
      },
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      trim: true,
    },
    tags: [
      {
        type: String,
        maxlength: [20, "Tag cannot exceed 20 characters"],
        trim: true,
      },
    ],
    isManualEntry: {
      type: Boolean,
      default: false,
    },
    correctedAt: {
      type: Date,
      default: null,
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

// Compound indexes for efficient queries
postureLogSchema.index({ userId: 1, timestamp: -1 });
postureLogSchema.index({ userId: 1, postureType: 1, timestamp: -1 });
postureLogSchema.index({ userId: 1, "environment.activity": 1, timestamp: -1 });
postureLogSchema.index({ timestamp: -1 });

// Index for analytics queries
postureLogSchema.index({
  userId: 1,
  timestamp: -1,
  postureScore: 1,
});

// Virtual for formatted timestamp
postureLogSchema.virtual("formattedTimestamp").get(function () {
  return this.timestamp.toISOString();
});

// Virtual for posture status that matches frontend StatusBadge variants
postureLogSchema.virtual("postureStatus").get(function () {
  if (this.postureScore >= 80) return "good";
  if (this.postureScore >= 60) return "warning";
  return "bad";
});

// Virtual for posture grade
postureLogSchema.virtual("postureGrade").get(function () {
  if (this.postureScore >= 90) return "A+";
  if (this.postureScore >= 80) return "A";
  if (this.postureScore >= 70) return "B";
  if (this.postureScore >= 60) return "C";
  if (this.postureScore >= 50) return "D";
  return "F";
});

// Virtual for session duration in minutes
postureLogSchema.virtual("durationInMinutes").get(function () {
  return Math.round(this.duration / 60);
});

// Instance method to check if correction is needed
postureLogSchema.methods.needsCorrection = function () {
  return this.postureType === "poor" || this.postureScore < 60;
};

// Instance method to mark as corrected
postureLogSchema.methods.markAsCorrected = function () {
  this.correctedAt = new Date();
  this.feedback.userResponse = "corrected";
  return this.save();
};

// Static method to get user's average score
postureLogSchema.statics.getUserAverageScore = async function (
  userId,
  days = 7
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        averageScore: { $avg: "$postureScore" },
        totalLogs: { $sum: 1 },
        goodPosture: {
          $sum: { $cond: [{ $eq: ["$postureType", "good"] }, 1, 0] },
        },
        poorPosture: {
          $sum: { $cond: [{ $eq: ["$postureType", "poor"] }, 1, 0] },
        },
      },
    },
  ]);

  return (
    result[0] || {
      averageScore: 0,
      totalLogs: 0,
      goodPosture: 0,
      poorPosture: 0,
    }
  );
};

// Static method to get hourly patterns
postureLogSchema.statics.getHourlyPattern = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $hour: "$timestamp" },
        averageScore: { $avg: "$postureScore" },
        logCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Static method to get activity-based analytics
postureLogSchema.statics.getActivityAnalytics = async function (
  userId,
  days = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$environment.activity",
        averageScore: { $avg: "$postureScore" },
        totalDuration: { $sum: "$duration" },
        logCount: { $sum: 1 },
        worstScore: { $min: "$postureScore" },
        bestScore: { $max: "$postureScore" },
      },
    },
    { $sort: { averageScore: -1 } },
  ]);
};

// Pre-save middleware to set posture type based on score
postureLogSchema.pre("save", function (next) {
  if (this.isModified("postureScore")) {
    if (this.postureScore >= 80) {
      this.postureType = "good";
    } else if (this.postureScore >= 60) {
      this.postureType = "moderate";
    } else {
      this.postureType = "poor";
    }
  }
  next();
});

// Pre-save middleware to generate session ID if not provided
postureLogSchema.pre("save", function (next) {
  if (!this.metadata.sessionId && this.isNew) {
    this.metadata.sessionId = new mongoose.Types.ObjectId().toString();
  }
  next();
});

module.exports = mongoose.model("PostureLog", postureLogSchema);
