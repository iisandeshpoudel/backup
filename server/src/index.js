const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const rentalRoutes = require('./routes/rentals');
const vendorRoutes = require('./routes/vendor');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes first
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);

// Serve static files from uploads directory
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static files from public directory (for placeholder images)
app.use('/api', express.static(path.join(__dirname, '../public')));

// Test route for static files
app.get('/api/test-static', (req, res) => {
  const uploadsPath = path.join(__dirname, '../uploads');
  const files = fs.readdirSync(uploadsPath);
  res.json({
    uploadsDirectory: uploadsPath,
    files: files,
    testImageUrl: files.length > 0 ? `/api/uploads/${files[0]}` : null
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Rentoo API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }

  // Multer error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size cannot be larger than 5MB'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Something went wrong'
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
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 