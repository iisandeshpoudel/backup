const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["chat", "rental_request", "rental_status", "rental_reminder"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      rentalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rental",
      },
      chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
