const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  renter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  duration: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'active', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  returnStatus: {
    type: String,
    enum: ['pending', 'returned', 'damaged'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Method to check if dates overlap with existing rentals
rentalSchema.statics.checkAvailability = async function(productId, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const overlappingRentals = await this.find({
    product: productId,
    status: { $in: ['approved', 'active'] }, // Only check approved and active rentals
    $or: [
      {
        $and: [
          { startDate: { $lte: end } },
          { endDate: { $gte: start } }
        ]
      }
    ]
  }).populate('renter', 'name');

  // Log availability check results
  console.log('Availability check:', {
    productId,
    requestedStart: start,
    requestedEnd: end,
    overlappingRentals: overlappingRentals.map(r => ({
      id: r._id,
      renter: r.renter.name,
      start: r.startDate,
      end: r.endDate,
      status: r.status
    }))
  });

  return overlappingRentals.length === 0;
};

// Calculate rental price based on duration
rentalSchema.statics.calculatePrice = function(product, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  // Calculate total price based on daily rate
  const totalPrice = days * product.pricing.perDay;
  
  return { 
    duration: days.toString(), 
    totalPrice 
  };
};

const Rental = mongoose.model('Rental', rentalSchema);

module.exports = Rental; 