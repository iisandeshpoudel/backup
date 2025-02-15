const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Rental = require('../models/Rental');
const { protect: auth, authorize } = require('../middleware/auth');

// Helper function to transform image URLs
const addFullImageUrls = (rentals, req) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return rentals.map(rental => ({
    ...rental.toObject(),
    product: rental.product ? {
      ...rental.product,
      images: rental.product.images.map(image => ({
        ...image,
        url: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`
      }))
    } : null
  }));
};

// Apply auth middleware to all routes
router.use(auth);
router.use(authorize('customer'));

// Get customer stats
router.get('/stats', async (req, res) => {
  try {
    const [
      activeRentals,
      approvedRentals,
      totalRentals,
      pendingRequests,
      totalSpent
    ] = await Promise.all([
      Rental.countDocuments({
        renter: req.user._id,
        status: 'active'
      }),
      Rental.countDocuments({
        renter: req.user._id,
        status: 'approved'
      }),
      Rental.countDocuments({ renter: req.user._id }),
      Rental.countDocuments({
        renter: req.user._id,
        status: 'pending'
      }),
      Rental.aggregate([
        {
          $match: {
            renter: req.user._id,
            status: { $in: ['completed', 'active'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalPrice' }
          }
        }
      ])
    ]);

    res.json({
      activeRentals,
      approvedRentals,
      totalRentals,
      pendingRequests,
      totalSpent: totalSpent[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

// Get active rentals (ongoing rentals)
router.get('/rentals/active', async (req, res) => {
  try {
    const rentals = await Rental.find({
      renter: req.user._id,
      status: { $in: ['active', 'approved'] }
    })
      .populate('product')
      .populate('owner', 'name email')
      .sort('-createdAt');

    const rentalsWithFullUrls = addFullImageUrls(rentals, req);
    res.json(rentalsWithFullUrls);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active rentals', error: error.message });
  }
});

// Get approved rentals (not yet started)
router.get('/rentals/approved', async (req, res) => {
  try {
    const rentals = await Rental.find({
      renter: req.user._id,
      status: 'approved'
    })
      .populate('product')
      .populate('owner', 'name email')
      .sort('-createdAt');

    const rentalsWithFullUrls = addFullImageUrls(rentals, req);
    res.json(rentalsWithFullUrls);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching approved rentals', error: error.message });
  }
});

// Get rental history (completed, cancelled, rejected)
router.get('/rentals/history', async (req, res) => {
  try {
    const rentals = await Rental.find({
      renter: req.user._id,
      status: { $in: ['completed', 'cancelled', 'rejected'] }
    })
      .populate('product')
      .populate('owner', 'name email')
      .sort('-createdAt');

    const rentalsWithFullUrls = addFullImageUrls(rentals, req);
    res.json(rentalsWithFullUrls);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rental history', error: error.message });
  }
});

// Get pending rental requests
router.get('/rentals/pending', async (req, res) => {
  try {
    const rentals = await Rental.find({
      renter: req.user._id,
      status: 'pending'
    })
      .populate('product')
      .populate('owner', 'name email')
      .sort('-createdAt');

    const rentalsWithFullUrls = addFullImageUrls(rentals, req);
    res.json(rentalsWithFullUrls);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending rentals', error: error.message });
  }
});

// Cancel rental request
router.post('/rentals/:id/cancel', async (req, res) => {
  try {
    const rental = await Rental.findOne({
      _id: req.params.id,
      renter: req.user._id,
      status: { $in: ['pending', 'approved'] }
    });

    if (!rental) {
      return res.status(404).json({ message: 'Rental request not found' });
    }

    rental.status = 'cancelled';
    await rental.save();

    res.json(rental);
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling rental', error: error.message });
  }
});

// Submit product review
router.post('/rentals/:id/review', async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const rental = await Rental.findOne({
      _id: req.params.id,
      renter: req.user._id,
      status: 'completed'
    }).populate('product');

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found or not completed' });
    }

    const product = await Product.findById(rental.product._id);

    // Add review to product
    product.reviews.push({
      user: req.user._id,
      rating,
      comment
    });

    // Update product rating
    const totalRatings = product.reviews.length;
    const ratingSum = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    product.ratings = {
      average: ratingSum / totalRatings,
      count: totalRatings
    };

    await product.save();

    res.json({ message: 'Review submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting review', error: error.message });
  }
});

// Get customer rentals with search and filtering
router.get('/rentals/search', auth, authorize('customer'), async (req, res) => {
  try {
    const {
      status,
      startDate,
      endDate,
      search,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    const query = { renter: req.user._id };

    // Apply filters
    if (status) {
      if (status === 'active') {
        query.status = { $in: ['active', 'approved'] };
      } else if (status === 'history') {
        query.status = { $in: ['completed', 'cancelled', 'rejected'] };
      } else {
        query.status = status;
      }
    }

    if (startDate) query.startDate = { $gte: new Date(startDate) };
    if (endDate) query.endDate = { $lte: new Date(endDate) };
    
    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { 'product.title': searchRegex },
        { 'owner.name': searchRegex },
        { status: searchRegex }
      ];
    }

    const rentals = await Rental.find(query)
      .populate('product')
      .populate('owner', 'name email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Rental.countDocuments(query);

    const rentalsWithFullUrls = addFullImageUrls(rentals, req);
    
    res.json({
      rentals: rentalsWithFullUrls,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error searching rentals', error: error.message });
  }
});

// Get active rentals with search
router.get('/rentals/active/search', auth, authorize('customer'), async (req, res) => {
  try {
    const {
      search,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    const query = {
      renter: req.user._id,
      status: { $in: ['active', 'approved'] }
    };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchQuery = await Rental.find({
        renter: req.user._id,
        status: { $in: ['active', 'approved'] },
        $or: [
          { 'product.title': searchRegex },
          { 'owner.name': searchRegex }
        ]
      }).populate({
        path: 'product',
        match: { title: searchRegex }
      }).populate({
        path: 'owner',
        match: { name: searchRegex },
        select: 'name email'
      });

      // Filter out null populated fields
      query._id = { $in: searchQuery.filter(r => r.product || r.owner).map(r => r._id) };
    }

    const rentals = await Rental.find(query)
      .populate('product')
      .populate('owner', 'name email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Rental.countDocuments(query);
    const rentalsWithFullUrls = addFullImageUrls(rentals, req);

    res.json({
      rentals: rentalsWithFullUrls,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error searching active rentals', error: error.message });
  }
});

// Get pending rentals with search
router.get('/rentals/pending/search', auth, authorize('customer'), async (req, res) => {
  try {
    const {
      search,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    const query = {
      renter: req.user._id,
      status: 'pending'
    };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchQuery = await Rental.find({
        renter: req.user._id,
        status: 'pending',
        $or: [
          { 'product.title': searchRegex },
          { 'owner.name': searchRegex }
        ]
      }).populate({
        path: 'product',
        match: { title: searchRegex }
      }).populate({
        path: 'owner',
        match: { name: searchRegex },
        select: 'name email'
      });

      // Filter out null populated fields
      query._id = { $in: searchQuery.filter(r => r.product || r.owner).map(r => r._id) };
    }

    const rentals = await Rental.find(query)
      .populate('product')
      .populate('owner', 'name email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Rental.countDocuments(query);
    const rentalsWithFullUrls = addFullImageUrls(rentals, req);

    res.json({
      rentals: rentalsWithFullUrls,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error searching pending rentals', error: error.message });
  }
});

// Get completed rentals with search
router.get('/rentals/history/search', auth, authorize('customer'), async (req, res) => {
  try {
    const {
      search,
      status,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    const query = {
      renter: req.user._id,
      status: { $in: ['completed', 'cancelled', 'rejected'] }
    };

    if (status && ['completed', 'cancelled', 'rejected'].includes(status)) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchQuery = await Rental.find({
        renter: req.user._id,
        status: query.status,
        $or: [
          { 'product.title': searchRegex },
          { 'owner.name': searchRegex }
        ]
      }).populate({
        path: 'product',
        match: { title: searchRegex }
      }).populate({
        path: 'owner',
        match: { name: searchRegex },
        select: 'name email'
      });

      // Filter out null populated fields
      query._id = { $in: searchQuery.filter(r => r.product || r.owner).map(r => r._id) };
    }

    const rentals = await Rental.find(query)
      .populate('product')
      .populate('owner', 'name email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Rental.countDocuments(query);
    const rentalsWithFullUrls = addFullImageUrls(rentals, req);

    res.json({
      rentals: rentalsWithFullUrls,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error searching rental history', error: error.message });
  }
});

module.exports = router; 