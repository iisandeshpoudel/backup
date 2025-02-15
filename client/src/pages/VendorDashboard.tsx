import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import axios from '../utils/axios';

interface Stats {
  totalProducts: number;
  activeRentals: number;
  totalRentals: number;
  pendingRequests: number;
  totalRevenue: number;
}

interface Product {
  _id: string;
  title: string;
  category: string;
  pricing: {
    perDay: number;
  };
  availability: {
    isAvailable: boolean;
  };
  images: { url: string }[];
}

interface RentalRequest {
  _id: string;
  product: Product;
  renter: {
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
}

const buttonStyles = {
  approve: "bg-emerald-200 text-emerald-700 hover:bg-emerald-300 focus:ring-emerald-400",
  reject: "bg-rose-200 text-rose-700 hover:bg-rose-300 focus:ring-rose-400",
  cancel: "bg-amber-200 text-amber-700 hover:bg-amber-300 focus:ring-amber-400",
  complete: "bg-sky-200 text-sky-700 hover:bg-sky-300 focus:ring-sky-400",
  default: "bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-slate-400"
};

const baseButtonStyle = `
  inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
  transition-all duration-200 ease-in-out
  shadow-sm hover:shadow-md
`;

export default function VendorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    activeRentals: 0,
    totalRentals: 0,
    pendingRequests: 0,
    totalRevenue: 0,
  });
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationMessage, setNavigationMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, productsRes, requestsRes] = await Promise.all([
          axios.get('/vendor/stats'),
          axios.get('/vendor/products/recent'),
          axios.get('/vendor/rentals/pending'),
        ]);
        setStats(statsRes.data);
        setRecentProducts(productsRes.data);
        setRentalRequests(requestsRes.data);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleRentalAction = async (rentalId: string, action: 'approve' | 'reject') => {
    try {
      await axios.post(`/vendor/rentals/${rentalId}/${action}`);
      // Refresh rental requests
      const requestsRes = await axios.get('/vendor/rentals/pending');
      setRentalRequests(requestsRes.data);
    } catch (err) {
      console.error('Rental action error:', err);
    }
  };

  const stats_items = [
    {
      name: 'Total Products',
      stat: stats.totalProducts,
      icon: ShoppingBagIcon,
      color: 'bg-blue-500',
      link: '/vendor/products',
      description: 'View all your products'
    },
    {
      name: 'Active Rentals',
      stat: stats.activeRentals,
      icon: ClipboardDocumentListIcon,
      color: 'bg-green-500',
      link: '/vendor/rentals?tab=active',
      description: 'Manage active rentals'
    },
    {
      name: 'Pending Requests',
      stat: stats.pendingRequests,
      icon: ChatBubbleLeftIcon,
      color: 'bg-yellow-500',
      link: '/vendor/rentals?tab=pending',
      description: 'View pending rental requests'
    },
    {
      name: 'Total Revenue',
      stat: `Rs. ${stats.totalRevenue.toFixed(2)}`,
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
      link: '/revenue',
      description: 'View revenue details'
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-white">Vendor Dashboard</h1>
          <p className="mt-2 text-sm text-gray-400">
            Manage your listings and rental requests.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/products/add"
            className={`${baseButtonStyle} ${buttonStyles.complete}`}
          >
            Add Product
          </Link>
        </div>
      </div>

      {/* Navigation Message */}
      {navigationMessage && (
        <div className="mt-4 p-4 bg-blue-900/50 border border-blue-500 text-blue-200 rounded-md">
          {navigationMessage}
        </div>
      )}

      {/* Debug Panel */}
      {debugInfo.length > 0 && (
        <div className="mt-4 p-4 bg-gray-900/50 border border-gray-500 text-gray-200 rounded-md font-mono text-sm">
          {debugInfo.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}

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
                  <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
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

      {/* Rental Requests */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-white">Pending Rental Requests</h2>
        <div className="mt-4 overflow-hidden rounded-lg bg-gray-800 shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="flow-root">
              <ul role="list" className="-my-5 divide-y divide-gray-700">
                {rentalRequests.map((request) => (
                  <motion.li
                    key={request._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-3">
                          <img
                            src={request.product.images[0]?.url}
                            alt={request.product.title}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                          <div>
                            <p className="truncate text-sm font-medium text-white">
                              {request.product.title}
                            </p>
                            <p className="truncate text-sm text-gray-400">
                              {request.renter.name} • Rs. {request.totalPrice}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(request.startDate).toLocaleDateString()} -{' '}
                              {new Date(request.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex flex-shrink-0 space-x-2">
                        <button
                          onClick={() => handleRentalAction(request._id, 'approve')}
                          className={`${baseButtonStyle} ${buttonStyles.approve}`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRentalAction(request._id, 'reject')}
                          className={`${baseButtonStyle} ${buttonStyles.reject}`}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </motion.li>
                ))}
                {rentalRequests.length === 0 && (
                  <li className="py-4 text-center text-gray-400">
                    No pending rental requests
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Products */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-white">Recent Products</h2>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recentProducts.map((product) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative rounded-lg bg-gray-800 px-6 py-5 shadow"
            >
              <div className="flex items-center space-x-3">
                <img
                  src={product.images[0]?.url}
                  alt={product.title}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/products/${product._id}`}
                    className="text-sm font-medium text-white hover:text-primary-400"
                  >
                    {product.title}
                  </Link>
                  <p className="text-sm text-gray-400">{product.category}</p>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      product.availability.isAvailable
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {product.availability.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-400">
                  Rs. {product.pricing.perDay}/day
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
} 