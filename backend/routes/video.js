const express = require("express");
const Joi = require("joi");
const mongoose = require("mongoose");
const PostureLog = require("../models/PostureLog");
const { auth } = require("../middleware/auth");
const {
  getPostureStatus,
  getAlertLevel,
  formatPostureForFrontend,
} = require("../utils/postureUtils");

const router = express.Router();

// Validation schemas
const monitoringSessionSchema = Joi.object({
  sessionId: Joi.string().required(),
  startTime: Joi.date().optional(),
  environment: Joi.object({
    location: Joi.string().max(100).optional(),
    activity: Joi.string()
      .valid(
        "working",
        "gaming",
        "studying",
        "watching",
        "reading",
        "browsing",
        "other"
      )
      .optional(),
    device: Joi.string()
      .valid("desktop", "laptop", "tablet", "mobile", "other")
      .optional(),
    lightingCondition: Joi.string()
      .valid("bright", "moderate", "dim", "dark")
      .optional(),
  }).optional(),
});

const postureDetectionSchema = Joi.object({
  sessionId: Joi.string().required(),
  postureScore: Joi.number().min(0).max(100).required(),
  measurements: Joi.object({
    neckAngle: Joi.number().min(-90).max(90).optional(),
    shoulderAlignment: Joi.number().min(-45).max(45).optional(),
    spineAlignment: Joi.number().min(-180).max(180).optional(),
    headTilt: Joi.number().min(-45).max(45).optional(),
    eyeToScreenDistance: Joi.number().min(10).max(200).optional(),
  }).optional(),
  metadata: Joi.object({
    confidence: Joi.number().min(0).max(1).optional(),
    aiModelVersion: Joi.string().max(20).optional(),
    cameraUsed: Joi.boolean().optional(),
  }).optional(),
});

// @route   POST /api/video/session/start
// @desc    Start a new monitoring session
// @access  Private
router.post("/session/start", auth, async (req, res) => {
  try {
    const { error } = monitoringSessionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const { sessionId, startTime, environment } = req.body;

    // Create initial session log
    const sessionLog = new PostureLog({
      userId: req.userId,
      timestamp: startTime || new Date(),
      postureScore: 100, // Start with perfect score
      postureType: "good",
      duration: 1,
      environment: environment || {},
      metadata: {
        sessionId,
        cameraUsed: true,
        appVersion: "1.0.0",
      },
      isManualEntry: false,
    });

    await sessionLog.save();

    res.status(201).json({
      message: "Monitoring session started successfully",
      sessionId,
      sessionLogId: sessionLog._id,
      startTime: sessionLog.timestamp,
    });
  } catch (error) {
    console.error("Session start error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to start monitoring session",
    });
  }
});

// @route   POST /api/video/detection
// @desc    Log real-time posture detection data
// @access  Private
router.post("/detection", auth, async (req, res) => {
  try {
    const { error } = postureDetectionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const { sessionId, postureScore, measurements, metadata } = req.body;

    // Use utility functions for consistent classification
    const postureStatus = getPostureStatus(postureScore);
    const alertConfig = getAlertLevel(postureScore);

    let postureType = "good";
    if (postureStatus === "warning") postureType = "moderate";
    if (postureStatus === "bad") postureType = "poor";

    // Create posture log entry
    const postureLog = new PostureLog({
      userId: req.userId,
      timestamp: new Date(),
      postureScore,
      postureType,
      measurements: measurements || {},
      duration: 1, // Real-time detection, 1 second intervals
      feedback: {
        alertTriggered: alertConfig.shouldAlert,
        correctionSuggested: alertConfig.message,
      },
      metadata: {
        sessionId,
        cameraUsed: true,
        confidence: metadata?.confidence || 0.9,
        aiModelVersion: metadata?.aiModelVersion || "1.0.0",
      },
      isManualEntry: false,
    });

    await postureLog.save();

    // Response for frontend using utility formatting
    const formattedResponse = formatPostureForFrontend(postureLog);

    const response = {
      logId: postureLog._id,
      postureStatus: postureStatus,
      postureScore,
      alertTriggered: alertConfig.shouldAlert,
      correctionSuggested: alertConfig.message,
      timestamp: postureLog.timestamp,
      ...formattedResponse,
    };

    res.json(response);
  } catch (error) {
    console.error("Posture detection error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to log posture detection",
    });
  }
});

// @route   POST /api/video/session/end
// @desc    End a monitoring session
// @access  Private
router.post("/session/end", auth, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Session ID is required",
      });
    }

    // Calculate session statistics
    const sessionStats = await PostureLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
          "metadata.sessionId": sessionId,
        },
      },
      {
        $group: {
          _id: null,
          averageScore: { $avg: "$postureScore" },
          totalDuration: { $sum: "$duration" },
          alertCount: {
            $sum: {
              $cond: [{ $eq: ["$feedback.alertTriggered", true] }, 1, 0],
            },
          },
          goodPosture: {
            $sum: { $cond: [{ $eq: ["$postureType", "good"] }, 1, 0] },
          },
          poorPosture: {
            $sum: { $cond: [{ $eq: ["$postureType", "poor"] }, 1, 0] },
          },
          totalLogs: { $sum: 1 },
          minScore: { $min: "$postureScore" },
          maxScore: { $max: "$postureScore" },
        },
      },
    ]);

    const stats = sessionStats[0] || {
      averageScore: 0,
      totalDuration: 0,
      alertCount: 0,
      goodPosture: 0,
      poorPosture: 0,
      totalLogs: 0,
      minScore: 0,
      maxScore: 0,
    };

    res.json({
      message: "Monitoring session ended successfully",
      sessionId,
      sessionSummary: {
        averageScore: Math.round(stats.averageScore),
        totalDuration: Math.round(stats.totalDuration),
        alertCount: stats.alertCount,
        goodPosturePercentage: Math.round(
          (stats.goodPosture / stats.totalLogs) * 100
        ),
        poorPosturePercentage: Math.round(
          (stats.poorPosture / stats.totalLogs) * 100
        ),
        totalDetections: stats.totalLogs,
        scoreRange: {
          min: stats.minScore,
          max: stats.maxScore,
        },
      },
    });
  } catch (error) {
    console.error("Session end error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to end monitoring session",
    });
  }
});

// @route   GET /api/video/session/:sessionId/stats
// @desc    Get real-time session statistics
// @access  Private
router.get("/session/:sessionId/stats", auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionStats = await PostureLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
          "metadata.sessionId": sessionId,
        },
      },
      {
        $group: {
          _id: null,
          currentScore: { $last: "$postureScore" },
          averageScore: { $avg: "$postureScore" },
          alertCount: {
            $sum: {
              $cond: [{ $eq: ["$feedback.alertTriggered", true] }, 1, 0],
            },
          },
          recentScores: { $push: "$postureScore" },
        },
      },
    ]);

    const stats = sessionStats[0] || {
      currentScore: 0,
      averageScore: 0,
      alertCount: 0,
      recentScores: [],
    };

    // Get last 10 scores for trend analysis
    const recentTrend = stats.recentScores.slice(-10);

    res.json({
      currentScore: stats.currentScore,
      averageScore: Math.round(stats.averageScore),
      alertCount: stats.alertCount,
      trend: recentTrend,
      status:
        stats.currentScore >= 80
          ? "good"
          : stats.currentScore >= 60
          ? "warning"
          : "bad",
    });
  } catch (error) {
    console.error("Session stats error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to fetch session statistics",
    });
  }
});

// @route   POST /api/video/alert/dismiss
// @desc    Dismiss or respond to an alert
// @access  Private
router.post("/alert/dismiss", auth, async (req, res) => {
  try {
    const { logId, response } = req.body;

    if (!logId || !response) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Log ID and response are required",
      });
    }

    const validResponses = ["corrected", "ignored", "dismissed", "snoozed"];
    if (!validResponses.includes(response)) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid response type",
      });
    }

    const postureLog = await PostureLog.findOneAndUpdate(
      { _id: logId, userId: req.userId },
      {
        "feedback.userResponse": response,
        "feedback.responseTime": Date.now() - new Date().getTime(),
      },
      { new: true }
    );

    if (!postureLog) {
      return res.status(404).json({
        error: "Log Not Found",
        message: "Posture log not found or unauthorized",
      });
    }

    res.json({
      message: "Alert response recorded successfully",
      response: response,
    });
  } catch (error) {
    console.error("Alert dismiss error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to dismiss alert",
    });
  }
});

module.exports = router;
