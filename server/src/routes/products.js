const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Product = require("../models/Product");
const { protect: auth } = require("../middleware/auth");
const Rental = require("../models/Rental");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};

// Create multer upload instance
const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
}).array("images", 5);

// Get all products with filtering
router.get("/", async (req, res) => {
  try {
    const {
      category,
      condition,
      minPrice,
      maxPrice,
      location,
      available,
      search,
      sort = "-createdAt",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Apply filters
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (location) query.location = { $regex: location, $options: "i" };
    if (available) query["availability.isAvailable"] = available === "true";
    if (minPrice) query["pricing.perDay"] = { $gte: Number(minPrice) };
    if (maxPrice)
      query["pricing.perDay"] = {
        ...query["pricing.perDay"],
        $lte: Number(maxPrice),
      };

    // Enhanced search functionality
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { location: searchRegex },
      ];
    }

    const products = await Product.find(query)
      .populate("owner", "name email")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res
      .status(500)
      .json({ message: "Error fetching products", error: error.message });
  }
});

// Get single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("owner", "name email")
      .populate("reviews.user", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching product", error: error.message });
  }
});

// Create product (protected, vendor only)
router.post("/", auth, (req, res, next) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return res
          .status(400)
          .json({ message: "File upload error", error: err.message });
      }
      console.error("Upload error:", err);
      return res
        .status(400)
        .json({ message: "Error uploading file", error: err.message });
    }

    try {
      console.log("Files received:", req.files);
      console.log("Form data received:", req.body);

      const productData = {
        ...req.body,
        owner: req.user._id,
        images: (req.files || []).map((file) => ({
          url: `uploads/${file.filename}`,
          public_id: file.filename,
        })),
      };

      // Convert pricing strings to numbers
      if (req.body["pricing[perDay]"]) {
        productData.pricing = {
          perDay: Number(req.body["pricing[perDay]"]),
        };
      }

      console.log("Product data to save:", productData);

      const product = new Product(productData);
      await product.save();

      console.log("Product saved:", product);
      res.status(201).json(product);
    } catch (error) {
      console.error("Product creation error:", error);
      next(error);
    }
  });
});

// Update product (protected, owner only)
router.put("/:id", auth, (req, res, next) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res
          .status(400)
          .json({ message: "File upload error", error: err.message });
      }
      return res
        .status(400)
        .json({ message: "Error uploading file", error: err.message });
    }

    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.owner.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this product" });
      }

      const updates = { ...req.body };

      // Handle new images if uploaded
      if (req.files && req.files.length > 0) {
        updates.images = [
          ...product.images,
          ...req.files.map((file) => ({
            url: `uploads/${file.filename}`,
            public_id: file.filename,
          })),
        ];
      }

      // Convert pricing strings to numbers if present
      if (updates.pricing) {
        updates.pricing = {
          perDay: Number(updates.pricing.perDay),
          perWeek: Number(updates.pricing.perWeek),
          perMonth: Number(updates.pricing.perMonth),
          securityDeposit: Number(updates.pricing.securityDeposit),
        };
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      );

      res.json(updatedProduct);
    } catch (error) {
      next(error);
    }
  });
});

// Delete product (protected, owner only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this product" });
    }

    // Delete product images from uploads directory
    product.images.forEach((image) => {
      const imagePath = path.join(uploadDir, image.public_id);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });

    await product.deleteOne();
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting product", error: error.message });
  }
});

// Add review to product (protected)
router.post("/:id/reviews", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user has already reviewed
    const hasReviewed = product.reviews.some(
      (review) => review.user.toString() === req.user._id.toString()
    );

    if (hasReviewed) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product" });
    }

    const review = {
      user: req.user._id,
      rating: Number(rating),
      comment,
    };

    product.reviews.push(review);

    // Update product rating
    const totalRating = product.reviews.reduce(
      (sum, item) => sum + item.rating,
      0
    );
    product.ratings.average = totalRating / product.reviews.length;
    product.ratings.count = product.reviews.length;

    await product.save();

    res.status(201).json(product);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error adding review", error: error.message });
  }
});

// Check product availability
router.get("/:id/availability", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const isAvailable = product.isAvailableForDates(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({ isAvailable });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error checking availability", error: error.message });
  }
});

// Get product rentals
router.get("/:id/rentals", async (req, res) => {
  try {
    const rentals = await Rental.find({
      product: req.params.id,
      status: { $in: ["approved", "active"] },
    })
      .populate("renter", "name")
      .select("startDate endDate status renter")
      .sort("startDate");

    res.json(rentals);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching rentals", error: error.message });
  }
});

module.exports = router;
