const jwt = require("jsonwebtoken");
const User = require("../models/User");
const mongoose = require("mongoose");

// Protect routes - Authentication check
exports.protect = async (req, res, next) => {
  try {
    let token;
    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Convert decoded.id to ObjectId
      if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
        return res.status(401).json({
          success: false,
          message: "Invalid user ID in token",
        });
      }

      // Get user from token with specific fields
      const user = await User.findById(decoded.id).select(
        "_id name email role"
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error("JWT verification error:", err);
      return res.status(401).json({
        success: false,
        message:
          err.name === "JsonWebTokenError"
            ? "Invalid token"
            : "Token validation failed",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    next(error);
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
