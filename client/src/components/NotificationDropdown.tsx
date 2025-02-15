import { Fragment } from "react";
import { BellIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { Menu, Transition } from "@headlessui/react";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
import { classNames } from "../utils/classNames";
import { useAuth } from "../contexts/AuthContext";

interface Notification {
  _id: string;
  type: "chat" | "rental_request" | "rental_status" | "rental_reminder";
  title: string;
  message: string;
  data: {
    productId?: string;
    rentalId?: string;
    chatId?: string;
    userId?: string;
  };
  read: boolean;
  createdAt: string;
}

const NotificationBadge = ({ type }: { type: Notification["type"] }) => {
  const badgeStyles = {
    chat: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    rental_request: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    rental_status: "bg-green-500/20 text-green-400 border-green-500/50",
    rental_reminder: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  };

  const badgeText = {
    chat: "Message",
    rental_request: "Request",
    rental_status: "Status",
    rental_reminder: "Reminder",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${badgeStyles[type]}`}>
      {badgeText[type]}
    </span>
  );
};

export const NotificationDropdown = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const navigate = useNavigate();
  const { user } = useAuth();

  const hasPendingAction = notifications.some(
    (notification) =>
      notification.type === "rental_request" ||
      (notification.type === "rental_status" && !notification.read)
  );

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification._id);

    if (notification.type === "chat") {
      // Navigate with both product and user IDs if available
      const params = new URLSearchParams();
      if (notification.data.productId) {
        params.append("productId", notification.data.productId);
      }
      if (notification.data.userId) {
        params.append("userId", notification.data.userId);
      }
      navigate(`/chats?${params.toString()}`);
    } else if (notification.type.startsWith("rental_")) {
      const isRequest = notification.type === "rental_request";
      // Route to appropriate rental page based on user role with correct tab
      if (user?.role === "vendor") {
        navigate(`/vendor/rentals${isRequest ? "?tab=pending" : ""}`);
      } else if (user?.role === "customer") {
        navigate(`/customer/rentals${isRequest ? "?tab=pending" : ""}`);
      } else if (user?.role === "admin") {
        navigate(`/admin/rentals${isRequest ? "?tab=pending" : ""}`);
      }
    }
  };

  const isActionRequired = (notification: Notification) =>
    notification.type === "rental_request" ||
    (notification.type === "rental_status" && !notification.read);

  return (
    <Menu as="div" className="relative ml-3">
      <div>
        <Menu.Button className="relative rounded-full p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
          <span className="sr-only">View notifications</span>
          <BellIcon className="h-6 w-6" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-600 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
          {hasPendingAction && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-gray-800" />
          )}
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-96 origin-top-right rounded-md bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-4 py-2 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <Menu.Item key={notification._id}>
                  {() => (
                    <div
                      className={classNames(
                        !notification.read ? "bg-gray-700/50" : "",
                        isActionRequired(notification)
                          ? "border-l-4 border-red-500"
                          : "",
                        "px-4 py-3 flex flex-col gap-1 cursor-pointer hover:bg-gray-700"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {notification.title}
                          </span>
                          <NotificationBadge type={notification.type} />
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                              <span>Mark read</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">
                        {notification.message}
                      </p>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </Menu.Item>
              ))
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
