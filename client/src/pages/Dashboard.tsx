import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import axios from '../utils/axios';
import {
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalProducts: number;
  activeRentals: number;
  totalSpent: number;
  totalRentals: number;
}

interface RentalProduct {
  _id: string;
  title: string;
  images: { url: string }[];
}

interface RentalUser {
  _id: string;
  name: string;
  email: string;
}

interface Rental {
  _id: string;
  product: RentalProduct;
  renter: RentalUser;
  owner: RentalUser;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeRentals: 0,
    totalSpent: 0,
    totalRentals: 0
  });
  const [recentRentals, setRecentRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        let statsData;
        if (user?.role === 'vendor') {
          const response = await axios.get('/vendor/stats');
          statsData = {
            totalProducts: response.data.totalProducts,
            activeRentals: response.data.activeListings,
            totalSpent: response.data.totalRevenue,
            totalRentals: response.data.totalRentals
          };
        } else {
          const response = await axios.get('/customer/stats');
          statsData = {
            totalProducts: response.data.totalRentals,
            activeRentals: response.data.activeRentals,
            totalSpent: response.data.totalSpent,
            totalRentals: response.data.totalRentals
          };
        }
        setStats(statsData);

        // Fetch recent rentals
        const rentalsResponse = await axios.get(
          user?.role === 'vendor' ? '/vendor/rentals/pending' : '/customer/rentals/active'
        );
        setRecentRentals(rentalsResponse.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const statsItems = [
    {
      name: user?.role === 'vendor' ? 'Total Products' : 'Total Rentals',
      value: stats.totalProducts,
      icon: ShoppingBagIcon,
    },
    {
      name: 'Active Rentals',
      value: stats.activeRentals,
      icon: ClipboardDocumentListIcon,
    },
    {
      name: user?.role === 'vendor' ? 'Total Revenue' : 'Total Spent',
      value: `Rs. ${stats.totalSpent}`,
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Total Rentals',
      value: stats.totalRentals,
      icon: UserGroupIcon,
    }
  ];

  const quickActions = [
    {
      name: user?.role === 'vendor' ? 'List New Item' : 'Rent an Item',
      href: user?.role === 'vendor' ? '/products/add' : '/products',
      description: user?.role === 'vendor' 
        ? 'Create a new listing for your items to rent'
        : 'Browse available items for rent',
      icon: ShoppingBagIcon
    },
    {
      name: 'View History',
      href: '/my-rentals',
      description: 'Check your rental history and active rentals',
      icon: ClipboardDocumentListIcon
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 mt-8">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants} className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back, {user?.name}!</h1>
          <p className="mt-2 text-lg text-gray-400">
            Here's what's happening with your {user?.role === 'vendor' ? 'rentals' : 'account'} today.
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants}>
        <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statsItems.map((stat) => (
            <div
              key={stat.name}
              className="relative overflow-hidden rounded-lg bg-gray-800 px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6"
            >
              <dt>
                <div className="absolute rounded-md bg-primary-500 p-3">
                  <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-400">{stat.name}</p>
              </dt>
              <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                <p className="text-2xl font-semibold text-white">{stat.value}</p>
              </dd>
            </div>
          ))}
        </dl>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-medium text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="relative group rounded-lg bg-gray-800 p-6 hover:bg-gray-700 transition-colors duration-300"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <action.icon className="h-8 w-8 text-primary-500" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white group-hover:text-primary-400 transition-colors duration-300">
                    {action.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Rentals */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-medium text-white mb-4">
          {user?.role === 'vendor' ? 'Recent Rental Requests' : 'Active Rentals'}
        </h2>
        <div className="rounded-lg bg-gray-800 overflow-hidden">
          {recentRentals.length > 0 ? (
            <ul className="divide-y divide-gray-700">
              {recentRentals.map((rental) => (
                <li key={rental._id} className="p-6">
                  <div className="flex items-center space-x-4">
                    <img
                      src={rental.product.images[0]?.url}
                      alt={rental.product.title}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {rental.product.title}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-400">
                        {user?.role === 'vendor' ? `Requested by: ${rental.renter.name}` : `Owner: ${rental.owner.name}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${rental.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          rental.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                      </span>
                      <p className="mt-1 text-sm font-medium text-gray-400">
                        Rs. {rental.totalPrice}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-gray-400">
              No {user?.role === 'vendor' ? 'rental requests' : 'active rentals'} to show.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
} 