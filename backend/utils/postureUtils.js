/**
 * Utility functions for posture classification and status mapping
 * to match frontend StatusBadge component variants
 */

/**
 * Get posture status based on score for StatusBadge component
 * @param {number} score - Posture score (0-100)
 * @returns {string} - Status variant ('good', 'warning', 'bad', 'neutral')
 */
const getPostureStatus = (score) => {
  if (score >= 80) return "good";
  if (score >= 60) return "warning";
  if (score > 0) return "bad";
  return "neutral";
};

/**
 * Get posture description text
 * @param {number} score - Posture score (0-100)
 * @returns {string} - Human readable description
 */
const getPostureDescription = (score) => {
  if (score >= 90) return "Excellent Posture";
  if (score >= 80) return "Good Posture";
  if (score >= 70) return "Fair Posture";
  if (score >= 60) return "Slouching Detected";
  if (score >= 40) return "Poor Posture";
  if (score > 0) return "Very Poor Posture";
  return "No Data";
};

/**
 * Get alert level based on posture score
 * @param {number} score - Posture score (0-100)
 * @returns {object} - Alert configuration
 */
const getAlertLevel = (score) => {
  if (score >= 80) {
    return {
      level: "none",
      message: "",
      shouldAlert: false,
      priority: "low",
    };
  }

  if (score >= 60) {
    return {
      level: "warning",
      message: "Consider adjusting your sitting position",
      shouldAlert: true,
      priority: "medium",
    };
  }

  return {
    level: "critical",
    message: "Please sit up straight and adjust your posture",
    shouldAlert: true,
    priority: "high",
  };
};

/**
 * Calculate posture trend from recent scores
 * @param {number[]} scores - Array of recent posture scores
 * @returns {object} - Trend analysis
 */
const calculatePostureTrend = (scores) => {
  if (scores.length < 2) {
    return {
      direction: "stable",
      change: 0,
      description: "Insufficient data",
    };
  }

  const recent = scores.slice(-5); // Last 5 measurements
  const older = scores.slice(-10, -5); // Previous 5 measurements

  const recentAvg =
    recent.reduce((sum, score) => sum + score, 0) / recent.length;
  const olderAvg =
    older.length > 0
      ? older.reduce((sum, score) => sum + score, 0) / older.length
      : recentAvg;

  const change = recentAvg - olderAvg;

  let direction = "stable";
  let description = "Posture is stable";

  if (change > 5) {
    direction = "improving";
    description = "Posture is improving";
  } else if (change < -5) {
    direction = "declining";
    description = "Posture is declining";
  }

  return {
    direction,
    change: Math.round(change),
    description,
    recentAverage: Math.round(recentAvg),
    previousAverage: Math.round(olderAvg),
  };
};

/**
 * Format posture data for frontend consumption
 * @param {object} postureLog - PostureLog document
 * @returns {object} - Formatted data for frontend
 */
const formatPostureForFrontend = (postureLog) => {
  const status = getPostureStatus(postureLog.postureScore);
  const description = getPostureDescription(postureLog.postureScore);
  const alert = getAlertLevel(postureLog.postureScore);

  return {
    id: postureLog._id,
    timestamp: postureLog.timestamp,
    score: postureLog.postureScore,
    status: status,
    description: description,
    alert: alert,
    measurements: postureLog.measurements || {},
    environment: postureLog.environment || {},
    duration: postureLog.duration,
    grade: postureLog.postureGrade,
    feedback: postureLog.feedback || {},
  };
};

/**
 * Generate recommendations based on posture data
 * @param {object} postureData - Recent posture measurements
 * @returns {string[]} - Array of recommendations
 */
const generateRecommendations = (postureData) => {
  const recommendations = [];

  if (postureData.measurements) {
    const { neckAngle, shoulderAlignment, spineAlignment } =
      postureData.measurements;

    if (neckAngle && neckAngle > 15) {
      recommendations.push(
        "Keep your head in a neutral position, avoid looking down"
      );
    }

    if (shoulderAlignment && Math.abs(shoulderAlignment) > 10) {
      recommendations.push("Keep your shoulders level and relaxed");
    }

    if (spineAlignment && Math.abs(spineAlignment) > 20) {
      recommendations.push("Maintain the natural curve of your spine");
    }
  }

  if (postureData.postureScore < 60) {
    recommendations.push("Take a break and stretch every 30 minutes");
    recommendations.push("Consider adjusting your chair height");
    recommendations.push("Ensure your monitor is at eye level");
  }

  return recommendations;
};

module.exports = {
  getPostureStatus,
  getPostureDescription,
  getAlertLevel,
  calculatePostureTrend,
  formatPostureForFrontend,
  generateRecommendations,
};
