const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// MongoDB connection URL
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/rentoo";

async function createUserIfNotExists(userData) {
  try {
    const existingUser = await User.findOne({ email: userData.email });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        ...userData,
        password: hashedPassword,
      });
      await user.save();
      console.log(`Created ${userData.role} account:`, userData.email);
    } else {
      console.log(`${userData.role} account already exists:`, userData.email);
    }
  } catch (error) {
    console.error(`Error creating ${userData.role} account:`, error);
  }
}

async function initTestAccounts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create Admin Account
    await createUserIfNotExists({
      name: "Admin User",
      email: "admin@test.com",
      password: "admin123",
      role: "admin",
    });

    // Create Vendor Account
    await createUserIfNotExists({
      name: "Test Vendor",
      email: "vendor@test.com",
      password: "vendor123",
      role: "vendor",
    });

    // Create Customer Account
    await createUserIfNotExists({
      name: "Test Customer",
      email: "customer@test.com",
      password: "customer123",
      role: "customer",
    });

    console.log("Test accounts initialization completed");
  } catch (error) {
    console.error("Database initialization error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the initialization
initTestAccounts();
