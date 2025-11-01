const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Authentication middleware to verify JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        error: "Access Denied",
        message: "No authorization header provided",
      });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Access Denied",
        message: "Invalid token format. Use Bearer token",
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        error: "Access Denied",
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    );

    // Check if user still exists
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        error: "Access Denied",
        message: "User no longer exists",
      });
    }

    // Check if user account is active
    if (user.accountStatus !== "active") {
      return res.status(401).json({
        error: "Account Suspended",
        message: "Your account is not active. Please contact support.",
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(401).json({
        error: "Account Locked",
        message:
          "Your account is temporarily locked due to too many failed login attempts",
      });
    }

    // Add user info to request object
    req.userId = user._id;
    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Access Denied",
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Access Denied",
        message: "Token has expired",
      });
    }

    res.status(500).json({
      error: "Server Error",
      message: "Authentication failed",
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token is provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next(); // Continue without authentication
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    );
    const user = await User.findById(decoded.userId).select("-password");

    if (user && user.accountStatus === "active" && !user.isLocked) {
      req.userId = user._id;
      req.user = user;
    }

    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

/**
 * Admin authorization middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const adminAuth = async (req, res, next) => {
  try {
    // First run regular auth
    await auth(req, res, () => {});

    // Check if user is admin (you might want to add an 'role' field to User model)
    if (!req.user.isAdmin) {
      return res.status(403).json({
        error: "Access Forbidden",
        message: "Admin access required",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: "Server Error",
      message: "Authorization failed",
    });
  }
};

/**
 * Rate limiting per user
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
const userRateLimit = (maxRequests = 60, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.userId) {
      return next(); // Skip rate limiting for unauthenticated requests
    }

    const userId = req.userId.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create user's request history
    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      (timestamp) => timestamp > windowStart
    );

    // Check if user has exceeded the limit
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: "Rate Limit Exceeded",
        message: `Too many requests. Limit is ${maxRequests} requests per ${
          windowMs / 1000
        } seconds.`,
        retryAfter: Math.ceil((validRequests[0] - windowStart) / 1000),
      });
    }

    // Add current request
    validRequests.push(now);
    requests.set(userId, validRequests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance
      const cutoff = now - windowMs * 2;
      for (const [key, timestamps] of requests.entries()) {
        const filtered = timestamps.filter((t) => t > cutoff);
        if (filtered.length === 0) {
          requests.delete(key);
        } else {
          requests.set(key, filtered);
        }
      }
    }

    next();
  };
};

/**
 * Middleware to validate user owns the resource
 * @param {string} paramName - Name of the parameter containing the user ID
 */
const validateResourceOwnership = (paramName = "userId") => {
  return (req, res, next) => {
    const resourceUserId = req.params[paramName] || req.body[paramName];

    if (!resourceUserId) {
      return res.status(400).json({
        error: "Bad Request",
        message: `Missing ${paramName} parameter`,
      });
    }

    if (resourceUserId !== req.userId.toString()) {
      return res.status(403).json({
        error: "Access Forbidden",
        message: "You can only access your own resources",
      });
    }

    next();
  };
};

module.exports = {
  auth,
  optionalAuth,
  adminAuth,
  userRateLimit,
  validateResourceOwnership,
};
