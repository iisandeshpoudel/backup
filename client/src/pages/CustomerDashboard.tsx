import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShoppingBagIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import axios from "../utils/axios";
import { getImageUrl } from "../utils/imageUrl";

interface Stats {
  activeRentals: number;
  totalRentals: number;
  pendingRequests: number;
  totalSpent: number;
}

interface Product {
  _id: string;
  title: string;
  category: string;
  images: { url: string }[];
}

interface Rental {
  _id: string;
  product: Product;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
  owner: {
    name: string;
    email: string;
  };
}

const buttonStyles = {
  cancel: "bg-rose-200 text-rose-700 hover:bg-rose-300 focus:ring-rose-400",
  view: "bg-sky-200 text-sky-700 hover:bg-sky-300 focus:ring-sky-400",
  default:
    "bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-slate-400",
};

const baseButtonStyle = `
  inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
  transition-all duration-200 ease-in-out
  shadow-sm hover:shadow-md
`;

export default function CustomerDashboard() {
  const [stats, setStats] = useState<Stats>({
    activeRentals: 0,
    totalRentals: 0,
    pendingRequests: 0,
    totalSpent: 0,
  });
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [rentalHistory, setRentalHistory] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, activeRes, historyRes] = await Promise.all([
          axios.get("/customer/stats"),
          axios.get("/customer/rentals/active"),
          axios.get("/customer/rentals/history"),
        ]);
        setStats(statsRes.data);
        setActiveRentals(activeRes.data);
        setRentalHistory(historyRes.data);
      } catch (err) {
        setError("Failed to load dashboard data");
        console.error("Dashboard data error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleCancelRental = async (rentalId: string) => {
    if (!window.confirm("Are you sure you want to cancel this rental?")) {
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [rentalId]: true }));
      await axios.post(`/customer/rentals/${rentalId}/cancel`);
      // Refresh data
      const [activeRes, historyRes] = await Promise.all([
        axios.get("/customer/rentals/active"),
        axios.get("/customer/rentals/history"),
      ]);
      setActiveRentals(activeRes.data);
      setRentalHistory(historyRes.data);
    } catch (err) {
      console.error("Cancel rental error:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [rentalId]: false }));
    }
  };

  const stats_items = [
    {
      name: "Active Rentals",
      stat: stats.activeRentals,
      icon: ShoppingBagIcon,
      color: "bg-blue-500",
      link: "/customer/rentals?tab=active",
      description: "View your active rentals",
    },
    {
      name: "Total Rentals",
      stat: stats.totalRentals,
      icon: ClockIcon,
      color: "bg-green-500",
      link: "/customer/rentals",
      description: "View all your rentals",
    },
    {
      name: "Pending Requests",
      stat: stats.pendingRequests,
      icon: ChatBubbleLeftIcon,
      color: "bg-yellow-500",
      link: "/customer/rentals?tab=pending",
      description: "View your pending requests",
    },
    {
      name: "Total Spent",
      stat: `Rs. ${stats.totalSpent.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: CurrencyDollarIcon,
      color: "bg-purple-500",
      link: "/spending", // Updated link to the new spending page
      description: "View your spending details",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-emerald-100/90 text-emerald-800";
      case "approved":
        return "bg-sky-100/90 text-sky-800";
      case "completed":
        return "bg-violet-100/90 text-violet-800";
      case "pending":
        return "bg-amber-100/90 text-amber-800";
      case "rejected":
        return "bg-rose-100/90 text-rose-800";
      case "cancelled":
        return "bg-gray-100/90 text-gray-800";
      default:
        return "bg-slate-100/90 text-slate-800";
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-white">
            Customer Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            View your rentals and manage your requests.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/products"
            className={`${baseButtonStyle} ${buttonStyles.view}`}
          >
            Browse Products
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats_items.map((item) => (
          <Link
            key={item.name}
            to={item.link}
            className="block h-full transform transition-transform duration-200 hover:scale-105"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative h-full overflow-hidden rounded-lg bg-gray-800 px-4 py-5 shadow sm:px-6 hover:bg-gray-700/80 transition-colors duration-200"
            >
              <dt>
                <div className={`absolute rounded-md p-3 ${item.color}`}>
                  <item.icon
                    className="h-6 w-6 text-white"
                    aria-hidden="true"
                  />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-400">
                  {item.name}
                </p>
              </dt>
              <dd className="ml-16 flex items-baseline pb-6">
                <p className="text-2xl font-semibold text-white">{item.stat}</p>
              </dd>
              <div className="absolute bottom-2 left-16">
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Active Rentals */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Active Rentals</h2>
          <Link
            to="/customer/rentals?tab=active"
            className="text-sm text-primary-500 hover:text-primary-400"
          >
            View all
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg bg-gray-800 shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="flow-root">
              <ul role="list" className="-my-5 divide-y divide-gray-700">
                {activeRentals.map((rental) => (
                  <motion.li
                    key={rental._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-4"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={
                          rental.product.images[0]?.url
                            ? getImageUrl(rental.product.images[0].url)
                            : getImageUrl(undefined)
                        }
                        alt={rental.product.title}
                        className="h-12 w-12 rounded-lg object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.error("Image load error:", {
                            productId: rental.product._id,
                            title: rental.product.title,
                            originalUrl: rental.product.images[0]?.url,
                            transformedUrl: target.src,
                          });
                          target.src = getImageUrl(undefined);
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {rental.product.title}
                        </p>
                        <p className="text-sm text-gray-400">
                          From {rental.owner.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(rental.startDate).toLocaleDateString()} -{" "}
                          {new Date(rental.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                            rental.status
                          )}`}
                        >
                          {rental.status.charAt(0).toUpperCase() +
                            rental.status.slice(1)}
                        </span>
                        <p className="text-sm font-medium text-gray-400">
                          Rs. {rental.totalPrice}
                        </p>
                        {(rental.status === "approved" ||
                          rental.status === "pending") && (
                          <button
                            onClick={() => handleCancelRental(rental._id)}
                            disabled={actionLoading[rental._id]}
                            className={`${baseButtonStyle} ${buttonStyles.cancel} disabled:opacity-50 disabled:cursor-not-allowed text-xs px-2 py-1`}
                          >
                            {actionLoading[rental._id] ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-rose-700 mr-1"></div>
                                Cancelling...
                              </>
                            ) : (
                              "Cancel"
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.li>
                ))}
                {activeRentals.length === 0 && (
                  <li className="py-4 text-center text-gray-400">
                    No active rentals
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Recent History */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Recent History</h2>
          <Link
            to="/customer/rentals?tab=completed"
            className="text-sm text-primary-500 hover:text-primary-400"
          >
            View all
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg bg-gray-800 shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="flow-root">
              <ul role="list" className="-my-5 divide-y divide-gray-700">
                {rentalHistory.slice(0, 5).map((rental) => (
                  <motion.li
                    key={rental._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-4"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={
                          rental.product.images[0]?.url
                            ? getImageUrl(rental.product.images[0].url)
                            : getImageUrl(undefined)
                        }
                        alt={rental.product.title}
                        className="h-12 w-12 rounded-lg object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.error("Image load error:", {
                            productId: rental.product._id,
                            title: rental.product.title,
                            originalUrl: rental.product.images[0]?.url,
                            transformedUrl: target.src,
                          });
                          target.src = getImageUrl(undefined);
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {rental.product.title}
                        </p>
                        <p className="text-sm text-gray-400">
                          From {rental.owner.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(rental.startDate).toLocaleDateString()} -{" "}
                          {new Date(rental.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                            rental.status
                          )}`}
                        >
                          {rental.status.charAt(0).toUpperCase() +
                            rental.status.slice(1)}
                        </span>
                        <p className="text-sm font-medium text-gray-400">
                          Rs. {rental.totalPrice}
                        </p>
                      </div>
                    </div>
                  </motion.li>
                ))}
                {rentalHistory.length === 0 && (
                  <li className="py-4 text-center text-gray-400">
                    No rental history
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
