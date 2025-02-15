const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentoo');
    console.log('Connected to MongoDB');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@rentoo.com',
      password: 'admin123',
      role: 'admin'
    });

    console.log('Admin user created successfully:', adminUser);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser(); 