const express = require("express");
const router = express.Router();
const Rental = require("../models/Rental");
const Product = require("../models/Product");
const { protect: auth } = require("../middleware/auth");
const { createRentalNotification } = require("../utils/notifications");

// Create a rental request
router.post("/", auth, async (req, res) => {
  try {
    const { productId, startDate, endDate, totalPrice } = req.body;

    // Log request details
    console.log("Rental request:", {
      productId,
      startDate,
      endDate,
      totalPrice,
      userId: req.user._id,
    });

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    // Ensure dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format provided" });
    }

    if (start >= end) {
      return res
        .status(400)
        .json({ message: "End date must be after start date" });
    }

    if (start < now) {
      return res
        .status(400)
        .json({ message: "Start date must be in the future" });
    }

    // Get product and check availability
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot rent your own product" });
    }

    if (!product.availability.isAvailable) {
      return res
        .status(400)
        .json({ message: "Product is not available for rent" });
    }

    // Check if dates are available
    const isAvailable = await Rental.checkAvailability(productId, start, end);
    if (!isAvailable) {
      // Get overlapping rentals for detailed message
      const overlappingRentals = await Rental.find({
        product: productId,
        status: { $in: ["approved", "active"] },
        $or: [
          {
            $and: [{ startDate: { $lte: end } }, { endDate: { $gte: start } }],
          },
        ],
      });

      const earliestAvailableDate =
        overlappingRentals.length > 0
          ? new Date(Math.max(...overlappingRentals.map((r) => r.endDate)))
          : null;

      return res.status(400).json({
        message: "Product is not available for these dates",
        details: earliestAvailableDate
          ? `The product will be available after ${earliestAvailableDate.toLocaleDateString()}`
          : undefined,
      });
    }

    // Calculate duration and validate price
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    let duration;
    let expectedPrice;

    if (days <= 7) {
      duration = "daily";
      expectedPrice = days * product.pricing.perDay;
    } else if (days <= 30) {
      duration = "weekly";
      const weeks = Math.ceil(days / 7);
      expectedPrice = weeks * product.pricing.perWeek;
    } else {
      duration = "monthly";
      const months = Math.ceil(days / 30);
      expectedPrice = months * product.pricing.perMonth;
    }

    // Validate total price
    if (Math.abs(expectedPrice - totalPrice) > 1) {
      // Allow for small rounding differences
      return res.status(400).json({
        message: "Invalid total price",
        details: `Expected price is Rs. ${expectedPrice}`,
      });
    }

    // Create rental
    const rental = new Rental({
      product: productId,
      owner: product.owner,
      renter: req.user._id,
      startDate,
      endDate,
      duration,
      totalPrice,
      status: "pending",
    });

    await rental.save();

    // Populate rental with product and user details
    await rental.populate([
      { path: "product", select: "title images pricing" },
      { path: "owner", select: "name email" },
      { path: "renter", select: "name email" },
    ]);

    // Create notification for the product owner
    await createRentalNotification(rental, "rental_request");

    res.status(201).json({
      rental,
      message: "Rental request created successfully",
    });
  } catch (error) {
    console.error("Rental creation error:", error);
    res
      .status(500)
      .json({ message: "Error creating rental request", error: error.message });
  }
});

// Calculate rental price
router.post("/calculate-price", auth, async (req, res) => {
  try {
    const { productId, startDate, endDate } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const duration = calculateDuration(startDate, endDate);
    const totalPrice = calculatePrice(product.pricing.perDay, duration);

    res.json({
      duration,
      totalPrice,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error calculating price", error: error.message });
  }
});

// Get user's rentals (as renter)
router.get("/my-rentals", auth, async (req, res) => {
  try {
    const rentals = await Rental.find({ renter: req.user._id })
      .populate("product", "title images pricing")
      .populate("owner", "name email")
      .sort("-createdAt");

    res.json(rentals);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching rentals", error: error.message });
  }
});

// Get user's listings rentals (as owner)
router.get("/my-listings-rentals", auth, async (req, res) => {
  try {
    const rentals = await Rental.find({ owner: req.user._id })
      .populate("product", "title images pricing")
      .populate("renter", "name email")
      .sort("-createdAt");

    res.json(rentals);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching rentals", error: error.message });
  }
});

// Update rental status
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const rental = await Rental.findOne({
      _id: req.params.id,
      owner: req.user._id,
    })
      .populate("product")
      .populate("renter", "name email");

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    const { status } = req.body;
    const validStatuses = [
      "pending",
      "approved",
      "active",
      "completed",
      "rejected",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Validate status transitions
    const validTransitions = {
      pending: ["approved", "rejected", "cancelled"],
      approved: ["active", "cancelled"],
      active: ["completed", "cancelled"],
      completed: [],
      rejected: [],
      cancelled: [],
    };

    if (!validTransitions[rental.status]?.includes(status)) {
      return res.status(400).json({
        message: `Invalid status transition from ${rental.status} to ${status}`,
      });
    }

    // Special handling for completion
    if (status === "completed") {
      // Make the product available again
      await Product.findByIdAndUpdate(rental.product._id, {
        "availability.isAvailable": true,
      });
    }

    rental.status = status;
    await rental.save();

    // Create notification for status change
    await createRentalNotification(rental, "rental_status");

    res.json(rental);
  } catch (error) {
    console.error("Error updating rental status:", error);
    res.status(500).json({
      message: "Error updating rental status",
      error: error.message,
    });
  }
});

// Cancel rental (renter only, if pending)
router.patch("/:id/cancel", auth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    if (rental.renter.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this rental" });
    }

    if (rental.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Can only cancel pending rentals" });
    }

    rental.status = "cancelled";
    await rental.save();

    // Create notification for cancellation
    await createRentalNotification(rental, "rental_status");

    res.json({
      rental,
      message: "Rental cancelled successfully",
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error cancelling rental", error: error.message });
  }
});

// Get vendor's pending rentals
router.get("/pending", auth, async (req, res) => {
  try {
    const rentals = await Rental.find({
      "product.owner": req.user._id,
      status: "pending",
    }).sort("-createdAt");
    res.json(rentals);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching pending rentals",
      error: error.message,
    });
  }
});

// Get vendor's active rentals
router.get("/active", auth, async (req, res) => {
  try {
    const rentals = await Rental.find({
      "product.owner": req.user._id,
      status: "active",
    }).sort("-createdAt");
    res.json(rentals);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching active rentals", error: error.message });
  }
});

// Get vendor's rental history
router.get("/history", auth, async (req, res) => {
  try {
    const rentals = await Rental.find({
      "product.owner": req.user._id,
      status: { $in: ["completed", "rejected"] },
    }).sort("-createdAt");
    res.json(rentals);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching rental history", error: error.message });
  }
});

// Get product rentals
router.get("/products/:id/rentals", auth, async (req, res) => {
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
