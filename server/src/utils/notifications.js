const Notification = require("../models/Notification");

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  data = {},
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      data,
    });
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

const createRentalNotification = async (rental, type) => {
  const notifications = [];
  let title, message;
  const productTitle = rental.product?.title || "your product";

  switch (type) {
    case "rental_request":
      title = "New Rental Request";
      message = `New rental request for ${productTitle}`;
      notifications.push({
        recipient: rental.owner,
        type,
        title,
        message,
        data: { rentalId: rental._id, productId: rental.product._id },
      });
      break;

    case "rental_status":
      if (rental.status === "approved") {
        title = "Rental Request Approved";
        message = `Your rental request for ${productTitle} has been approved`;
      } else if (rental.status === "rejected") {
        title = "Rental Request Rejected";
        message = `Your rental request for ${productTitle} has been rejected`;
      } else if (rental.status === "completed") {
        title = "Rental Completed";
        message = `Rental for ${productTitle} has been marked as completed`;
      } else if (rental.status === "cancelled") {
        title = "Rental Cancelled";
        message = `Rental for ${productTitle} has been cancelled`;
      }
      notifications.push({
        recipient: rental.renter,
        type,
        title,
        message,
        data: { rentalId: rental._id, productId: rental.product._id },
      });
      break;

    case "rental_reminder":
      title = "Rental Start Reminder";
      message = `Your rental for ${productTitle} starts tomorrow`;
      notifications.push({
        recipient: rental.renter,
        type,
        title,
        message,
        data: { rentalId: rental._id, productId: rental.product._id },
      });
      // Also notify the owner
      notifications.push({
        recipient: rental.owner,
        type,
        title: "Rental Start Reminder (Owner)",
        message: `Your product ${productTitle} has a rental starting tomorrow`,
        data: { rentalId: rental._id, productId: rental.product._id },
      });
      break;
  }

  // Create all notifications in parallel
  return Promise.all(
    notifications.map((notification) => createNotification(notification))
  );
};

const createChatNotification = async (message) => {
  const productTitle = message.product?.title || "a product";
  return createNotification({
    recipient: message.receiver,
    type: "chat",
    title: "New Message",
    message: `New message about ${productTitle} from ${message.sender.name}`,
    data: {
      productId: message.product._id,
      userId: message.sender._id,
    },
  });
};

module.exports = {
  createNotification,
  createRentalNotification,
  createChatNotification,
};
