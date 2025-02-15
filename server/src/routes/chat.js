const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Message = require("../models/Message");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const { createChatNotification } = require("../utils/notifications");

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Chat route working" });
});

// Get all conversations for current user
router.get("/conversations", protect, async (req, res) => {
  try {
    console.log("Fetching conversations for user:", req.user._id);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(req.user._id) },
            { receiver: new mongoose.Types.ObjectId(req.user._id) },
          ],
        },
      },
      {
        $group: {
          _id: "$product",
          lastMessage: { $last: "$$ROOT" },
          otherUserId: {
            $last: {
              $cond: {
                if: {
                  $eq: ["$sender", new mongoose.Types.ObjectId(req.user._id)],
                },
                then: "$receiver",
                else: "$sender",
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "otherUserId",
          foreignField: "_id",
          as: "otherUser",
        },
      },
      { $unwind: "$product" },
      { $unwind: "$otherUser" },
      {
        $project: {
          _id: 1,
          product: {
            _id: "$product._id",
            title: "$product.title",
            images: "$product.images",
          },
          otherUser: {
            _id: "$otherUser._id",
            name: "$otherUser.name",
            role: "$otherUser.role",
          },
          lastMessage: {
            content: "$lastMessage.content",
            createdAt: "$lastMessage.createdAt",
          },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    console.log("Conversations found:", conversations.length);
    res.json(conversations);
  } catch (err) {
    console.error("Error getting conversations:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get messages for a specific product
router.get("/product/:productId", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
      console.error("Invalid product ID format:", req.params.productId);
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
      console.error("Product not found:", req.params.productId);
      return res.status(404).json({ message: "Product not found" });
    }

    console.log("Fetching messages for product:", req.params.productId);
    console.log("User:", req.user._id);

    const messages = await Message.find({
      product: req.params.productId,
      $or: [
        { sender: new mongoose.Types.ObjectId(req.user._id) },
        { receiver: new mongoose.Types.ObjectId(req.user._id) },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name role")
      .populate("receiver", "name role");

    console.log("Messages found:", messages.length);
    res.json(messages);
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Send a message
router.post("/product/:productId", protect, async (req, res) => {
  try {
    console.log("Attempting to send message:");
    console.log("- Product ID:", req.params.productId);
    console.log("- User:", req.user._id, req.user.role);

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(req.params.productId).populate(
      "owner",
      "_id name role"
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    console.log("- Product found:", {
      id: product._id,
      owner: product.owner._id,
      ownerRole: product.owner.role,
    });

    // Determine receiver based on roles
    let receiver;
    if (req.user.role === "customer") {
      receiver = product.owner._id;
      console.log("- Customer sending to owner:", receiver);
    } else if (
      req.user.role === "vendor" &&
      req.user._id.toString() === product.owner._id.toString()
    ) {
      // Find the last message from the customer
      const lastMessage = await Message.findOne({
        product: req.params.productId,
        sender: { $ne: product.owner._id },
      })
        .sort({ createdAt: -1 })
        .populate("sender", "_id name role");

      if (!lastMessage) {
        return res.status(400).json({
          message: "No conversation found with customer",
        });
      }
      receiver = lastMessage.sender._id;
      console.log("- Vendor responding to customer:", receiver);
    } else {
      console.log("- Unauthorized: user is not customer or product owner");
      return res.status(403).json({
        message: "Not authorized to send messages for this product",
      });
    }

    // Create and save message
    const message = new Message({
      sender: req.user._id,
      receiver,
      product: req.params.productId,
      content: req.body.content,
    });

    console.log("- Saving message:", {
      sender: message.sender,
      receiver: message.receiver,
      product: message.product,
      content: message.content,
    });

    const savedMessage = await message.save();
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate("sender", "name role")
      .populate("receiver", "name role");

    // Create notification for the receiver
    await createChatNotification(populatedMessage);

    console.log("- Message saved successfully");
    res.json(populatedMessage);
  } catch (error) {
    console.error("Detailed error in send message:", error);
    res.status(500).json({
      message: "Error sending message",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

module.exports = router;
