const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Rental = require('../models/Rental');
const { protect: auth, authorize } = require('../middleware/auth');

// Helper function to transform image URLs
const addFullImageUrls = (data, req) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  if (Array.isArray(data)) {
    return data.map(item => transformUrls(item, baseUrl));
  }
  return transformUrls(data, baseUrl);
};

const transformUrls = (item, baseUrl) => {
  if (!item) return null;
  const obj = item.toObject ? item.toObject() : item;

  // Transform product images if they exist
  if (obj.images) {
    obj.images = obj.images.map(image => ({
      ...image,
      url: image.url ? (
        image.url.startsWith('http') 
          ? image.url 
          : `${baseUrl}/api/${image.url.startsWith('/') ? image.url.slice(1) : image.url}`
      ) : null
    }));
  }

  // Transform product images in rentals if they exist
  if (obj.product && obj.product.images) {
    obj.product = {
      ...obj.product,
      images: obj.product.images.map(image => ({
        ...image,
        url: image.url ? (
          image.url.startsWith('http') 
            ? image.url 
            : `${baseUrl}/api/${image.url.startsWith('/') ? image.url.slice(1) : image.url}`
        ) : null
      }))
    };
  }

  return obj;
};

// Apply auth middleware to all routes
router.use(auth);
router.use(authorize('admin'));

// Get admin stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalRentals,
      activeRentals,
      revenue
    ] = await Promise.all([
      User.countDocuments({ isActive: { $ne: false } }),
      Product.countDocuments(),
      Rental.countDocuments(),
      Rental.countDocuments({ status: { $in: ['active', 'approved'] } }),
      Rental.aggregate([
        { 
          $match: { 
            status: { $in: ['completed', 'active', 'approved'] } 
          } 
        },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ])
    ]);

    res.json({
      totalUsers,
      totalProducts,
      totalRentals,
      activeRentals,
      totalRevenue: revenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

// Get recent users
router.get('/users/recent', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort('-createdAt')
      .limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Get all users with pagination and search
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const role = req.query.role;

    const query = {};
    
    // Only apply search if it's not empty or just whitespace
    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Only apply role filter if a valid role is provided
    if (role && ['customer', 'vendor', 'admin'].includes(role)) {
      query.role = role;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Get user details with their products and rentals
router.get('/users/:id', async (req, res) => {
  try {
    const [user, products, rentals] = await Promise.all([
      User.findById(req.params.id).select('-password'),
      Product.find({ owner: req.params.id }).sort('-createdAt'),
      Rental.find({
        $or: [
          { owner: req.params.id },
          { renter: req.params.id }
        ]
      })
        .populate('product')
        .populate('owner', 'name email')
        .populate('renter', 'name email')
        .sort('-createdAt')
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const response = {
      user,
      products: addFullImageUrls(products, req),
      rentals: addFullImageUrls(rentals, req)
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details', error: error.message });
  }
});

// Deactivate user
router.post('/users/:id/deactivate', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot deactivate admin users' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating user', error: error.message });
  }
});

// Activate user
router.post('/users/:id/activate', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = true;
    await user.save();

    res.json({ message: 'User activated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error activating user', error: error.message });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete the product using deleteOne
    await Product.deleteOne({ _id: req.params.id });

    // Return success response
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ 
      message: 'Error deleting product', 
      error: error.message 
    });
  }
});

// Get products with search and filters
router.get('/products/search', auth, authorize('admin'), async (req, res) => {
  try {
    const {
      search,
      status,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    let query = {};
    
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ];
    }

    if (status === 'available') {
      query.isAvailable = true;
    } else if (status === 'rented') {
      query.isAvailable = false;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('owner', 'name email')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Product.countDocuments(query)
    ]);

    console.log('Raw products from DB:', products.map(p => ({
      id: p._id,
      title: p.title,
      rawImages: p.images
    })));

    const productsWithUrls = addFullImageUrls(products, req);

    console.log('Transformed products:', productsWithUrls.map(p => ({
      id: p._id,
      title: p.title,
      transformedImages: p.images
    })));

    res.json({
      results: productsWithUrls,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    console.error('Error in /admin/products/search:', error);
    res.status(500).json({ message: 'Error searching products', error: error.message });
  }
});

// Admin search across all entities
router.get('/search', auth, authorize('admin'), async (req, res) => {
  try {
    const {
      entity,
      status,
      startDate,
      endDate,
      search,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    let query = {};
    let results;
    let total;

    switch (entity) {
      case 'products':
        if (search && search.trim() !== '') {
          const searchRegex = new RegExp(search, 'i');
          query.$or = [
            { title: searchRegex },
            { description: searchRegex },
            { category: searchRegex }
          ];
        }
        if (status === 'available') {
          query.isAvailable = true;
        } else if (status === 'rented') {
          query.isAvailable = false;
        }
        
        results = await Product.find(query)
          .populate('owner', 'name email')
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(Number(limit));
        total = await Product.countDocuments(query);

        const response = {
          results: addFullImageUrls(results, req),
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
          total
        };

        return res.json(response);

      case 'users':
        if (search && search.trim() !== '') {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { role: { $regex: search, $options: 'i' } }
          ];
          if (status) query.status = status;
          
          results = await User.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));
          total = await User.countDocuments(query);
        } else {
          query = {};
          if (status) query.status = status;
          
          results = await User.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));
          total = await User.countDocuments(query);
        }
        break;

      case 'rentals':
        if (search && search.trim() !== '') {
          query.$or = [
            { status: { $regex: search, $options: 'i' } },
            { 'product.title': { $regex: search, $options: 'i' } },
            { 'owner.name': { $regex: search, $options: 'i' } },
            { 'renter.name': { $regex: search, $options: 'i' } }
          ];
          if (status) query.status = status;
          if (startDate) query.startDate = { $gte: new Date(startDate) };
          if (endDate) query.endDate = { $lte: new Date(endDate) };
        } else {
          query = {};
          if (status) query.status = status;
          if (startDate) query.startDate = { $gte: new Date(startDate) };
          if (endDate) query.endDate = { $lte: new Date(endDate) };
        }
        
        results = await Rental.find(query)
          .populate({
            path: 'product',
            select: 'title images pricing'
          })
          .populate('renter', 'name email')
          .populate('owner', 'name email')
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(Number(limit));
        total = await Rental.countDocuments(query);
        break;

      default:
        return res.status(400).json({ message: 'Invalid entity type' });
    }

    const response = {
      results,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Error performing search', error: error.message });
  }
});

// Get active rentals with search (admin)
router.get('/rentals/active/search', auth, authorize('admin'), async (req, res) => {
  try {
    const {
      search,
      owner,
      renter,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    const query = {
      status: { $in: ['active', 'approved'] }
    };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { 'product.title': searchRegex },
        { 'owner.name': searchRegex },
        { 'renter.name': searchRegex }
      ];
    }

    if (owner) query.owner = owner;
    if (renter) query.renter = renter;

    const rentals = await Rental.find(query)
      .populate('product')
      .populate('owner', 'name email')
      .populate('renter', 'name email')
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

// Get pending rentals with search (admin)
router.get('/rentals/pending/search', auth, authorize('admin'), async (req, res) => {
  try {
    const {
      search,
      owner,
      renter,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    const query = {
      status: 'pending'
    };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { 'product.title': searchRegex },
        { 'owner.name': searchRegex },
        { 'renter.name': searchRegex }
      ];
    }

    if (owner) query.owner = owner;
    if (renter) query.renter = renter;

    const rentals = await Rental.find(query)
      .populate('product')
      .populate('owner', 'name email')
      .populate('renter', 'name email')
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

// Get completed rentals with search (admin)
router.get('/rentals/history/search', auth, authorize('admin'), async (req, res) => {
  try {
    const {
      search,
      status,
      owner,
      renter,
      startDate,
      endDate,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    const query = {
      status: { $in: ['completed', 'cancelled', 'rejected'] }
    };

    // Allow filtering by specific status in history
    if (status && ['completed', 'cancelled', 'rejected'].includes(status)) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { 'product.title': searchRegex },
        { 'owner.name': searchRegex },
        { 'renter.name': searchRegex }
      ];
    }

    if (owner) query.owner = owner;
    if (renter) query.renter = renter;
    if (startDate) query.startDate = { $gte: new Date(startDate) };
    if (endDate) query.endDate = { $lte: new Date(endDate) };

    const rentals = await Rental.find(query)
      .populate('product')
      .populate('owner', 'name email')
      .populate('renter', 'name email')
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

// Get rentals with search and filters
router.get('/rentals/search', auth, authorize('admin'), async (req, res) => {
  try {
    const {
      search,
      status,
      sort = '-createdAt',
      page = 1,
      limit = 10
    } = req.query;

    let query = {};
    
    if (status) {
      query.status = status;
    }

    if (search && search.trim() !== ' ') {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { status: searchRegex }
      ];
    }

    const [rentals, total] = await Promise.all([
      Rental.find(query)
        .populate({
          path: 'product',
          select: 'title images pricing',
          match: search ? { title: new RegExp(search, 'i') } : {}
        })
        .populate({
          path: 'owner',
          select: 'name email',
          match: search ? { name: new RegExp(search, 'i') } : {}
        })
        .populate({
          path: 'renter',
          select: 'name email',
          match: search ? { name: new RegExp(search, 'i') } : {}
        })
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Rental.countDocuments(query)
    ]);

    // Filter out rentals where populated fields don't match search criteria
    let filteredRentals = rentals;
    if (search && search.trim() !== ' ') {
      filteredRentals = rentals.filter(rental => 
        rental.product || // Keep if product matches (due to match criteria)
        rental.owner || // Keep if owner matches
        rental.renter || // Keep if renter matches
        new RegExp(search, 'i').test(rental.status) // Keep if status matches
      );
    }

    const rentalsWithFullUrls = addFullImageUrls(filteredRentals, req);

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

module.exports = router; 