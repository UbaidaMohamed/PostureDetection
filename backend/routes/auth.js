const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const User = require("../models/User");
const { auth, userRateLimit } = require("../middleware/auth");

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  age: Joi.number().integer().min(13).max(120).optional(),
  height: Joi.number().positive().optional(),
  weight: Joi.number().positive().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", async (req, res) => {
  try {
    // Validate input
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const { name, email, password, age, height, weight } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: "User Already Exists",
        message: "A user with this email already exists",
      });
    }

    // Create user (password will be hashed by pre-save middleware)
    const user = new User({
      name,
      email: email.toLowerCase(),
      password, // Plain text password - middleware will hash it
      profile: {
        age,
        height,
        weight,
      },
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to register user",
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", async (req, res) => {
  try {
    console.log("🔐 Login attempt received:", {
      email: req.body.email,
      hasPassword: !!req.body.password,
    });

    // Validate input
    const { error } = loginSchema.validate(req.body);
    if (error) {
      console.log("❌ Validation error:", error.details[0].message);
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;
    console.log("🔍 Looking for user with email:", email.toLowerCase());

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log("❌ User not found for email:", email.toLowerCase());
      return res.status(401).json({
        error: "Invalid Credentials",
        message: "Invalid email or password",
      });
    }

    console.log("✅ User found:", {
      id: user._id,
      email: user.email,
      hasPassword: !!user.password,
    });

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log("🔑 Password comparison result:", isValidPassword);

    if (!isValidPassword) {
      console.log("❌ Invalid password for user:", user.email);
      return res.status(401).json({
        error: "Invalid Credentials",
        message: "Invalid email or password",
      });
    }

    console.log("✅ Login successful for user:", user.email);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to login",
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        error: "User Not Found",
        message: "User profile not found",
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to fetch profile",
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", auth, async (req, res) => {
  try {
    const updateSchema = Joi.object({
      name: Joi.string().min(2).max(50).optional(),
      age: Joi.number().integer().min(13).max(120).optional(),
      height: Joi.number().positive().optional(),
      weight: Joi.number().positive().optional(),
    });

    const { error } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        error: "User Not Found",
        message: "User not found",
      });
    }

    // Update user fields
    const { name, age, height, weight } = req.body;
    if (name) user.name = name;
    if (age !== undefined) user.profile.age = age;
    if (height !== undefined) user.profile.height = height;
    if (weight !== undefined) user.profile.weight = weight;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to update profile",
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post("/change-password", auth, async (req, res) => {
  try {
    const passwordSchema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(6).required(),
    });

    const { error } = passwordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        error: "User Not Found",
        message: "User not found",
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid Password",
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    user.password = hashedPassword;
    await user.save();

    res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({
      error: "Server Error",
      message: "Failed to change password",
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post("/logout", auth, (req, res) => {
  res.json({
    message: "Logout successful",
  });
});

module.exports = router;
