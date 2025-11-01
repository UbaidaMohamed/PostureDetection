const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    profile: {
      age: {
        type: Number,
        min: [13, "Age must be at least 13"],
        max: [120, "Age cannot exceed 120"],
      },
      height: {
        type: Number,
        min: [50, "Height must be at least 50cm"],
        max: [300, "Height cannot exceed 300cm"],
      },
      weight: {
        type: Number,
        min: [20, "Weight must be at least 20kg"],
        max: [500, "Weight cannot exceed 500kg"],
      },
      avatar: {
        type: String,
        default: null,
      },
      bio: {
        type: String,
        maxlength: [500, "Bio cannot exceed 500 characters"],
      },
    },
    preferences: {
      units: {
        type: String,
        enum: ["metric", "imperial"],
        default: "metric",
      },
      timezone: {
        type: String,
        default: "UTC",
      },
      language: {
        type: String,
        default: "en",
        maxlength: [10, "Language code cannot exceed 10 characters"],
      },
    },
    accountStatus: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending_verification"],
      default: "active",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      count: {
        type: Number,
        default: 0,
      },
      lastAttempt: {
        type: Date,
        default: null,
      },
      lockedUntil: {
        type: Date,
        default: null,
      },
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    privacyPolicyAccepted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.loginAttempts;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(
    this.loginAttempts.lockedUntil &&
    this.loginAttempts.lockedUntil > Date.now()
  );
});

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (
    this.loginAttempts.lockedUntil &&
    this.loginAttempts.lockedUntil < Date.now()
  ) {
    return this.updateOne({
      $unset: { "loginAttempts.lockedUntil": 1 },
      $set: {
        "loginAttempts.count": 1,
        "loginAttempts.lastAttempt": Date.now(),
      },
    });
  }

  const updates = {
    $inc: { "loginAttempts.count": 1 },
    $set: { "loginAttempts.lastAttempt": Date.now() },
  };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts.count + 1 >= 5 && !this.isLocked) {
    updates.$set["loginAttempts.lockedUntil"] = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  }

  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: {
      "loginAttempts.count": 1,
      "loginAttempts.lastAttempt": 1,
      "loginAttempts.lockedUntil": 1,
    },
  });
};

// Static method to find by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActiveUsers = function () {
  return this.find({ accountStatus: "active" });
};

// Instance method to generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const crypto = require("crypto");
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Instance method to generate email verification token
userSchema.methods.createEmailVerificationToken = function () {
  const crypto = require("crypto");
  const verificationToken = crypto.randomBytes(32).toString("hex");

  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  return verificationToken;
};

// Static method to clean up expired tokens
userSchema.statics.cleanupExpiredTokens = function () {
  return this.updateMany(
    { passwordResetExpires: { $lt: Date.now() } },
    {
      $unset: {
        passwordResetToken: 1,
        passwordResetExpires: 1,
      },
    }
  );
};

// Pre-remove middleware to clean up related data
userSchema.pre("remove", async function (next) {
  try {
    // Remove user's posture logs
    await this.model("PostureLog").deleteMany({ userId: this._id });

    // Remove user's settings
    await this.model("UserSettings").deleteMany({ userId: this._id });

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("User", userSchema);
