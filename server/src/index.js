const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const { createRentalNotification } = require("./utils/notifications");
const Rental = require("./models/Rental");

const app = express();

// Import routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const rentalRoutes = require("./routes/rentals");
const vendorRoutes = require("./routes/vendor");
const adminRoutes = require("./routes/admin");
const customerRoutes = require("./routes/customer");
const chatRoutes = require("./routes/chat"); // Changed from chatRoutes to chat
const notificationRoutes = require("./routes/notifications");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);

// Serve static files from uploads directory
app.use("/api/uploads", express.static(path.join(__dirname, "../uploads")));

// Serve static files from public directory (for placeholder images)
app.use("/api", express.static(path.join(__dirname, "../public")));

// Test route for static files
app.get("/api/test-static", (req, res) => {
  const uploadsPath = path.join(__dirname, "../uploads");
  const files = fs.readdirSync(uploadsPath);
  res.json({
    uploadsDirectory: uploadsPath,
    files: files,
    testImageUrl: files.length > 0 ? `/api/uploads/${files[0]}` : null,
  });
});

// Welcome route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Rentoo API" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error details:", {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
  });

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", "),
      details: err.errors,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      details: err.message,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      details: err.keyValue,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      details: err.message,
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      details: err.message,
    });
  }

  // Multer error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size cannot be larger than 5MB",
      details: err.message,
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong",
    ...(process.env.NODE_ENV === "development" && {
      details: err.stack,
      error: err,
    }),
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Set up rental reminder check every hour
    setInterval(async () => {
      try {
        // Find rentals that start tomorrow and haven't had a reminder sent
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        const rentalsStartingTomorrow = await Rental.find({
          startDate: {
            $gte: tomorrow,
            $lt: dayAfterTomorrow,
          },
          status: { $in: ["approved", "active"] },
        }).populate("product");

        // Send notifications for each rental
        for (const rental of rentalsStartingTomorrow) {
          await createRentalNotification(rental, "rental_reminder");
        }
      } catch (error) {
        console.error("Error sending rental reminders:", error);
      }
    }, 60 * 60 * 1000); // Check every hour
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
