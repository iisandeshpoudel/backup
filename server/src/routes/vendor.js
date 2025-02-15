const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Rental = require("../models/Rental");
const { protect: auth, authorize } = require("../middleware/auth");
const { createRentalNotification } = require("../utils/notifications");

// Helper function to transform image URLs
const addFullImageUrls = (products, req) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return products.map((product) => ({
    ...product.toObject(),
    images: product.images.map((image) => ({
      ...image,
      url: image.url
        ? image.url.startsWith("http")
          ? image.url
          : `${baseUrl}/api/${
              image.url.startsWith("/") ? image.url.slice(1) : image.url
            }`
        : null,
    })),
  }));
};

// Apply auth middleware to all routes
router.use(auth);
router.use(authorize("vendor"));

// Get vendor stats
router.get("/stats", async (req, res) => {
  try {
    const [totalProducts, activeRentals, totalRentals, pendingRequests] =
      await Promise.all([
        Product.countDocuments({ owner: req.user._id }),
        Rental.countDocuments({
          "product.owner": req.user._id,
          status: "active",
        }),
        Rental.countDocuments({
          "product.owner": req.user._id,
          status: { $in: ["completed", "active"] },
        }),
        Rental.countDocuments({
          "product.owner": req.user._id,
          status: "pending",
        }),
      ]);

    // Calculate total revenue
    const completedRentals = await Rental.find({
      "product.owner": req.user._id,
      status: "completed",
    });

    const totalRevenue = completedRentals.reduce(
      (sum, rental) => sum + rental.totalPrice,
      0
    );

    res.json({
      totalProducts,
      activeRentals,
      totalRentals,
      pendingRequests,
      totalRevenue,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching vendor stats", error: error.message });
  }
});

// Get all vendor's products
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find({ owner: req.user._id }).sort(
      "-createdAt"
    );

    console.log(
      "Raw products from DB:",
      products.map((p) => ({
        id: p._id,
        title: p.title,
        rawImages: p.images,
      }))
    );

    // Transform image URLs
    const productsWithFullUrls = addFullImageUrls(products, req);

    console.log(
      "Transformed products:",
      productsWithFullUrls.map((p) => ({
        id: p._id,
        title: p.title,
        transformedImages: p.images,
      }))
    );

    res.json(productsWithFullUrls);
  } catch (error) {
    console.error("Error in /vendor/products:", error);
    res
      .status(500)
      .json({ message: "Error fetching products", error: error.message });
  }
});

// Get vendor's recent products
router.get("/products/recent", async (req, res) => {
  try {
    const products = await Product.find({ owner: req.user._id })
      .sort("-createdAt")
      .limit(5);

    // Transform image URLs
    const productsWithFullUrls = addFullImageUrls(products, req);

    res.json(productsWithFullUrls);
  } catch (error) {
    console.error("Error in /products/recent:", error);
    res
      .status(500)
      .json({
        message: "Error fetching recent products",
        error: error.message,
      });
  }
});

// Get single product
router.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Transform image URLs
    const productWithFullUrls = {
      ...product.toObject(),
      images: product.images.map((image) => ({
        ...image,
        url: image.url.startsWith("http")
          ? image.url
          : `${req.protocol}://${req.get("host")}${image.url}`,
      })),
    };

    res.json(productWithFullUrls);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching product", error: error.message });
  }
});

// Delete product
router.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting product", error: error.message });
  }
});

// Toggle product availability
router.patch("/products/:id/availability", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.availability.isAvailable = req.body.isAvailable;
    await product.save();

    res.json(product);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error updating product availability",
        error: error.message,
      });
  }
});

// Update product
router.patch("/products/:id", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update allowed fields
    const updates = req.body;
    const allowedUpdates = [
      "title",
      "description",
      "category",
      "condition",
      "pricing",
      "location",
    ];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        if (field === "pricing") {
          // Handle pricing object - only daily rate
          product.pricing = {
            perDay: Number(updates.pricing.perDay),
          };
        } else {
          product[field] = updates[field];
        }
      }
    });

    await product.save();
    res.json(product);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating product", error: error.message });
  }
});

// Get active rentals
router.get("/rentals/active", async (req, res) => {
  try {
    const rentals = await Rental.find({
      owner: req.user._id,
      status: { $in: ["active", "approved"] },
    })
      .populate("product")
      .populate("renter", "name email");

    res.json(rentals);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching active rentals", error: error.message });
  }
});

// Get rental history
router.get("/rentals/history", async (req, res) => {
  try {
    const rentals = await Rental.find({
      owner: req.user._id,
      status: { $in: ["completed", "cancelled", "rejected"] },
    })
      .populate("product")
      .populate("renter", "name email");

    res.json(rentals);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching rental history", error: error.message });
  }
});

// Get pending rental requests
router.get("/rentals/pending", async (req, res) => {
  try {
    const rentals = await Rental.find({
      owner: req.user._id,
      status: "pending",
    })
      .populate("product")
      .populate("renter", "name email")
      .sort("-createdAt");

    // Transform image URLs if needed
    const rentalsWithFullUrls = rentals.map((rental) => ({
      ...rental.toObject(),
      product: {
        ...rental.product.toObject(),
        images: rental.product.images.map((image) => ({
          ...image,
          url: image.url.startsWith("http")
            ? image.url
            : `${req.protocol}://${req.get("host")}${image.url}`,
        })),
      },
    }));

    res.json(rentalsWithFullUrls);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching pending rentals",
        error: error.message,
      });
  }
});

// Update rental status
router.patch("/rentals/:id/status", async (req, res) => {
  try {
    console.log("Updating rental status:", {
      rentalId: req.params.id,
      userId: req.user._id,
      newStatus: req.body.status,
    });

    const rental = await Rental.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!rental) {
      console.log("Rental not found:", {
        rentalId: req.params.id,
        userId: req.user._id,
      });
      return res.status(404).json({ message: "Rental not found" });
    }

    console.log("Current rental state:", {
      currentStatus: rental.status,
      newStatus: req.body.status,
    });

    const { status } = req.body;

    // Validate status
    if (
      ![
        "pending",
        "approved",
        "active",
        "rejected",
        "completed",
        "cancelled",
      ].includes(status)
    ) {
      console.log("Invalid status value:", status);
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Add validation for status transitions
    const validTransitions = {
      pending: ["approved", "rejected", "cancelled"],
      approved: ["pending", "active", "cancelled"],
      active: ["approved", "completed", "cancelled"],
      completed: ["active"],
      rejected: ["pending"],
      cancelled: ["pending", "approved", "active"],
    };

    if (!validTransitions[rental.status].includes(status)) {
      console.log("Invalid status transition:", {
        from: rental.status,
        to: status,
        allowedTransitions: validTransitions[rental.status],
      });
      return res.status(400).json({
        message: `Cannot change status from ${rental.status} to ${status}`,
      });
    }

    const oldStatus = rental.status;
    rental.status = status;
    await rental.save();

    // Create notification for status change
    await createRentalNotification(rental, "rental_status");

    // Populate after save for response
    await rental.populate("product");
    await rental.populate("renter", "name email");

    console.log("Successfully updated rental status:", {
      rentalId: rental._id,
      oldStatus: rental.status,
      newStatus: status,
    });

    res.json(rental);
  } catch (error) {
    console.error("Error updating rental status:", {
      error: error.message,
      stack: error.stack,
      rentalId: req.params.id,
      userId: req.user._id,
      requestedStatus: req.body.status,
    });
    res
      .status(500)
      .json({ message: "Error updating rental status", error: error.message });
  }
});

// Approve rental request
router.post("/rentals/:id/approve", async (req, res) => {
  try {
    const rental = await Rental.findOne({
      _id: req.params.id,
      owner: req.user._id,
      status: "pending",
    });

    if (!rental) {
      return res.status(404).json({ message: "Rental request not found" });
    }

    rental.status = "approved";
    await rental.save();

    res.json(rental);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error approving rental", error: error.message });
  }
});

// Reject rental request
router.post("/rentals/:id/reject", async (req, res) => {
  try {
    const rental = await Rental.findOne({
      _id: req.params.id,
      owner: req.user._id,
      status: "pending",
    });

    if (!rental) {
      return res.status(404).json({ message: "Rental request not found" });
    }

    rental.status = "rejected";
    await rental.save();

    res.json(rental);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error rejecting rental", error: error.message });
  }
});

// Update rental details
router.patch("/rentals/:id", async (req, res) => {
  try {
    const rental = await Rental.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // Only allow updating certain fields based on current status
    const allowedUpdates = {
      pending: ["startDate", "endDate", "totalPrice", "status"],
      approved: [
        "startDate",
        "endDate",
        "totalPrice",
        "status",
        "paymentStatus",
      ],
      active: ["returnStatus", "status", "paymentStatus"],
      completed: ["paymentStatus"],
      cancelled: [],
      rejected: [],
    };

    const updates = req.body;
    const allowed = allowedUpdates[rental.status] || [];

    // Filter out non-allowed fields
    Object.keys(updates).forEach((key) => {
      if (allowed.includes(key)) {
        rental[key] = updates[key];
      }
    });

    // If dates are being updated, check availability
    if ((updates.startDate || updates.endDate) && rental.status === "pending") {
      const startDate = updates.startDate || rental.startDate;
      const endDate = updates.endDate || rental.endDate;

      const isAvailable = await Rental.checkAvailability(
        rental.product,
        startDate,
        endDate
      );

      if (!isAvailable) {
        return res.status(400).json({
          message: "Selected dates are not available",
        });
      }

      // Recalculate price if dates changed
      const product = await Product.findById(rental.product);
      const { duration, totalPrice } = Rental.calculatePrice(
        product,
        startDate,
        endDate
      );

      rental.duration = duration;
      rental.totalPrice = totalPrice;
    }

    await rental.save();

    // Populate necessary fields and return
    await rental.populate("product").populate("renter", "name email");
    res.json(rental);
  } catch (error) {
    res.status(500).json({
      message: "Error updating rental",
      error: error.message,
    });
  }
});

module.exports = router;
