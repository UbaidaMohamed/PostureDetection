const express = require("express");
const Joi = require("joi");
const mongoose = require("mongoose");
const PostureLog = require("../models/PostureLog");
const { auth } = require("../middleware/auth");
const {
  getPostureStatus,
  formatPostureForFrontend,
  generateRecommendations,
} = require("../utils/postureUtils");

const router = express.Router();

// Validation schemas
const postureLogSchema = Joi.object({
  timestamp: Joi.date().optional(),
  postureScore: Joi.number().min(0).max(100).required(),
  postureType: Joi.string().valid("good", "poor", "moderate").required(),
  neckAngle: Joi.number().optional(),
  shoulderAlignment: Joi.number().optional(),
  spineAlignment: Joi.number().optional(),
  duration: Joi.number().positive().optional(),
  environment: Joi.object({
    location: Joi.string().max(100).optional(),
    activity: Joi.string().max(100).optional(),
    device: Joi.string().max(50).optional(),
  }).optional(),
  notes: Joi.string().max(500).optional(),
});

const querySchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  postureType: Joi.string().valid("good", "poor", "moderate").optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1),
});

// @route   POST /api/posture/log
// @desc    Log a new posture measurement
// @access  Private
router.post("/log", auth, async (req, res) => {
  try {
    // Validate input
    const { error } = postureLogSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const postureData = {
      ...req.body,
      userId: req.userId,
      timestamp: req.body.timestamp || new Date(),
    };

    const postureLog = new PostureLog(postureData);
    await postureLog.save();

    res.status(201).json({
      message: "Posture log created successfully",
      data: postureLog,
    });
  } catch (error) {
    console.error("Posture log creation error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to create posture log",
    });
  }
});

// @route   GET /api/posture/logs
// @desc    Get posture logs for the authenticated user
// @access  Private
router.get("/logs", auth, async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const { startDate, endDate, postureType, limit, page } = value;
    const skip = (page - 1) * limit;

    // Build query
    const query = { userId: req.userId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (postureType) {
      query.postureType = postureType;
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      PostureLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
      PostureLog.countDocuments(query),
    ]);

    res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Posture logs fetch error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to fetch posture logs",
    });
  }
});

// @route   GET /api/posture/analytics
// @desc    Get posture analytics for the authenticated user
// @access  Private
router.get("/analytics", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date query
    const dateQuery = { userId: req.userId };
    if (startDate || endDate) {
      dateQuery.timestamp = {};
      if (startDate) dateQuery.timestamp.$gte = new Date(startDate);
      if (endDate) dateQuery.timestamp.$lte = new Date(endDate);
    }

    // Aggregate posture data
    const analytics = await PostureLog.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          averageScore: { $avg: "$postureScore" },
          goodPosture: {
            $sum: { $cond: [{ $eq: ["$postureType", "good"] }, 1, 0] },
          },
          moderatePosture: {
            $sum: { $cond: [{ $eq: ["$postureType", "moderate"] }, 1, 0] },
          },
          poorPosture: {
            $sum: { $cond: [{ $eq: ["$postureType", "poor"] }, 1, 0] },
          },
          maxScore: { $max: "$postureScore" },
          minScore: { $min: "$postureScore" },
          totalDuration: { $sum: "$duration" },
        },
      },
    ]);

    // Get daily trends
    const dailyTrends = await PostureLog.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
          },
          averageScore: { $avg: "$postureScore" },
          logCount: { $sum: 1 },
          goodCount: {
            $sum: { $cond: [{ $eq: ["$postureType", "good"] }, 1, 0] },
          },
          poorCount: {
            $sum: { $cond: [{ $eq: ["$postureType", "poor"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Get hourly patterns
    const hourlyPattern = await PostureLog.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: { $hour: "$timestamp" },
          averageScore: { $avg: "$postureScore" },
          logCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result = {
      summary: analytics[0] || {
        totalLogs: 0,
        averageScore: 0,
        goodPosture: 0,
        moderatePosture: 0,
        poorPosture: 0,
        maxScore: 0,
        minScore: 0,
        totalDuration: 0,
      },
      dailyTrends,
      hourlyPattern,
    };

    res.json(result);
  } catch (error) {
    console.error("Analytics fetch error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to fetch analytics",
    });
  }
});

// @route   GET /api/posture/latest
// @desc    Get the latest posture measurement
// @access  Private
router.get("/latest", auth, async (req, res) => {
  try {
    const latestLog = await PostureLog.findOne({ userId: req.userId }).sort({
      timestamp: -1,
    });

    if (!latestLog) {
      return res.status(404).json({
        error: "No Data Found",
        message: "No posture logs found for this user",
      });
    }

    res.json({
      data: latestLog,
    });
  } catch (error) {
    console.error("Latest posture fetch error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to fetch latest posture data",
    });
  }
});

// @route   DELETE /api/posture/logs/:id
// @desc    Delete a specific posture log
// @access  Private
router.delete("/logs/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const log = await PostureLog.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!log) {
      return res.status(404).json({
        error: "Log Not Found",
        message: "Posture log not found or unauthorized",
      });
    }

    res.json({
      message: "Posture log deleted successfully",
    });
  } catch (error) {
    console.error("Posture log deletion error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to delete posture log",
    });
  }
});

// @route   PUT /api/posture/logs/:id
// @desc    Update a specific posture log
// @access  Private
router.put("/logs/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    const { error } = postureLogSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const log = await PostureLog.findOneAndUpdate(
      { _id: id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!log) {
      return res.status(404).json({
        error: "Log Not Found",
        message: "Posture log not found or unauthorized",
      });
    }

    res.json({
      message: "Posture log updated successfully",
      data: log,
    });
  } catch (error) {
    console.error("Posture log update error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to update posture log",
    });
  }
});

// @route   GET /api/posture/dashboard/today
// @desc    Get today's hourly posture data for dashboard charts
// @access  Private
router.get("/dashboard/today", auth, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const hourlyData = await PostureLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
          timestamp: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: { $hour: "$timestamp" },
          avgScore: { $avg: "$postureScore" },
          goodCount: {
            $sum: { $cond: [{ $eq: ["$postureType", "good"] }, 1, 0] },
          },
          poorCount: {
            $sum: { $cond: [{ $eq: ["$postureType", "poor"] }, 1, 0] },
          },
          totalCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format data for frontend charts
    const formattedData = Array.from({ length: 24 }, (_, hour) => {
      const hourData = hourlyData.find((h) => h._id === hour);
      const good = hourData
        ? Math.round((hourData.goodCount / hourData.totalCount) * 100)
        : 0;
      const poor = hourData
        ? Math.round((hourData.poorCount / hourData.totalCount) * 100)
        : 0;

      return {
        time: `${hour.toString().padStart(2, "0")}:00`,
        good: good || 0,
        poor: poor || 0,
        score: hourData ? Math.round(hourData.avgScore) : 0,
      };
    }).filter((item) => item.score > 0); // Only return hours with data

    res.json({
      data: formattedData,
    });
  } catch (error) {
    console.error("Dashboard today data fetch error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to fetch today's dashboard data",
    });
  }
});

// @route   GET /api/posture/dashboard/week
// @desc    Get weekly posture data for dashboard charts
// @access  Private
router.get("/dashboard/week", auth, async (req, res) => {
  try {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date();
    endOfWeek.setHours(23, 59, 59, 999);

    const weeklyData = await PostureLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
          timestamp: { $gte: startOfWeek, $lte: endOfWeek },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
          },
          avgScore: { $avg: "$postureScore" },
          sessionCount: { $sum: 1 },
          totalDuration: { $sum: "$duration" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Format data for frontend charts
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const formattedData = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);

      const dayData = weeklyData.find(
        (d) =>
          d._id.year === date.getFullYear() &&
          d._id.month === date.getMonth() + 1 &&
          d._id.day === date.getDate()
      );

      formattedData.push({
        day: dayNames[date.getDay()],
        score: dayData ? Math.round(dayData.avgScore) : 0,
        sessions: dayData ? dayData.sessionCount : 0,
      });
    }

    res.json({
      data: formattedData,
    });
  } catch (error) {
    console.error("Dashboard week data fetch error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to fetch weekly dashboard data",
    });
  }
});

// @route   GET /api/posture/dashboard/stats
// @desc    Get dashboard overview statistics
// @access  Private
router.get("/dashboard/stats", auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(today);
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Today's stats
    const todayStats = await PostureLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
          timestamp: { $gte: startOfDay },
        },
      },
      {
        $group: {
          _id: null,
          currentScore: { $avg: "$postureScore" },
          totalHours: { $sum: { $divide: ["$duration", 3600] } },
          alertCount: {
            $sum: {
              $cond: [{ $eq: ["$feedback.alertTriggered", true] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Yesterday's stats for comparison
    const yesterdayStats = await PostureLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
          timestamp: { $gte: yesterday, $lte: endOfYesterday },
        },
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: { $divide: ["$duration", 3600] } },
          alertCount: {
            $sum: {
              $cond: [{ $eq: ["$feedback.alertTriggered", true] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Weekly average
    const weeklyStats = await PostureLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
          timestamp: { $gte: startOfWeek },
        },
      },
      {
        $group: {
          _id: null,
          weeklyAverage: { $avg: "$postureScore" },
        },
      },
    ]);

    const todayData = todayStats[0] || {
      currentScore: 0,
      totalHours: 0,
      alertCount: 0,
    };
    const yesterdayData = yesterdayStats[0] || { totalHours: 0, alertCount: 0 };
    const weeklyData = weeklyStats[0] || { weeklyAverage: 0 };

    const hoursDiff = todayData.totalHours - yesterdayData.totalHours;
    const alertsDiff = yesterdayData.alertCount - todayData.alertCount;

    res.json({
      currentScore: Math.round(todayData.currentScore) || 0,
      todayHours: Math.round(todayData.totalHours * 10) / 10,
      weeklyAverage: Math.round(weeklyData.weeklyAverage) || 0,
      totalAlerts: todayData.alertCount,
      hoursChange:
        hoursDiff > 0
          ? `+${Math.round(hoursDiff * 10) / 10}h`
          : `${Math.round(hoursDiff * 10) / 10}h`,
      alertsChange:
        alertsDiff > 0 ? `-${alertsDiff}` : `+${Math.abs(alertsDiff)}`,
      weeklyChange: 3, // Mock value - would need more complex calculation
    });
  } catch (error) {
    console.error("Dashboard stats fetch error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to fetch dashboard statistics",
    });
  }
});

module.exports = router;
