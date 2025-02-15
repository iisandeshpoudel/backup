const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Electronics', 'Furniture', 'Sports', 'Tools', 'Vehicles', 'Others']
  },
  condition: {
    type: String,
    required: true,
    enum: ['New', 'Like New', 'Good', 'Fair'],
    default: 'Good'
  },
  pricing: {
    perDay: {
      type: Number,
      required: true,
      min: [0, 'Price per day cannot be negative']
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    public_id: String
  }],
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  availability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    unavailableDates: [{
      startDate: Date,
      endDate: Date
    }]
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({ title: 'text', description: 'text', category: 'text', location: 'text' });

// Method to check product availability for a given date range
productSchema.methods.isAvailableForDates = function(startDate, endDate) {
  if (!this.availability.isAvailable) return false;
  
  return !this.availability.unavailableDates.some(dateRange => {
    return (startDate <= dateRange.endDate) && (endDate >= dateRange.startDate);
  });
};

// Virtual for calculating average daily price
productSchema.virtual('averageDailyPrice').get(function() {
  return this.pricing.perDay;
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 