import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  UserGroupIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import axios from '../utils/axios';
import { getImageUrl } from '../utils/imageUrl';

interface Stats {
  totalUsers: number;
  totalProducts: number;
  totalRentals: number;
  activeRentals: number;
  totalRevenue: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  isActive: boolean;
}

interface Product {
  _id: string;
  title: string;
  owner: {
    _id: string;
    name: string;
  };
  pricing: {
    perDay: number;
  };
  images: { url: string }[];
  createdAt: string;
  isAvailable: boolean;
}

interface Rental {
  _id: string;
  product: {
    _id: string;
    title: string;
    images: { url: string }[];
  };
  owner: {
    _id: string;
    name: string;
  };
  renter: {
    _id: string;
    name: string;
  };
  status: 'pending' | 'approved' | 'active' | 'completed' | 'rejected' | 'cancelled';
  startDate: string;
  endDate: string;
  totalPrice: number;
}

interface SearchParams {
  page: number;
  limit: number;
  search: string;
  role?: string;
  status?: string;
}

type TabType = 'users' | 'products' | 'rentals' | 'revenue';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProducts: 0,
    totalRentals: 0,
    activeRentals: 0,
    totalRevenue: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    page: 1,
    limit: 10,
    search: '',
  });
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, dataRes] = await Promise.all([
          axios.get('/admin/stats'),
          fetchTabData(activeTab),
        ]);
        setStats(statsRes.data);
        updateTabData(activeTab, dataRes.data);
        setTotalPages(dataRes.data.totalPages || 1);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [searchParams, activeTab]);

  const fetchTabData = async (tab: TabType) => {
    const params: Record<string, any> = {
      ...searchParams,
      sort: '-createdAt'
    };

    // Remove empty search parameter
    if (!params.search?.trim()) {
      params.search = undefined;
    }

    switch (tab) {
      case 'users':
        return axios.get('/admin/users', { 
          params: { 
            ...params,
            role: selectedRole || undefined
          } 
        });
      case 'products':
        return axios.get('/admin/products/search', { 
          params: { 
            ...params,
            status: selectedStatus
          } 
        });
      case 'rentals':
        return axios.get('/admin/rentals/search', { 
          params: { 
            ...params,
            status: selectedStatus
          } 
        });
      case 'revenue':
        return axios.get('/admin/revenue');
      default:
        return axios.get('/admin/users', { 
          params: { 
            ...params,
            role: selectedRole || undefined
          } 
        });
    }
  };

  const updateTabData = (tab: TabType, data: any) => {
    switch (tab) {
      case 'users':
        setUsers(data.users?.map((user: any) => ({
          ...user,
          isActive: user.isActive !== false // treat undefined as active
        })) || []);
        setTotalPages(data.totalPages || 1);
        break;
      case 'products':
        setProducts(data.results || []);
        setTotalPages(data.totalPages || 1);
        break;
      case 'rentals':
        const rentals = data.rentals || [];
        setRentals(rentals.filter((rental: any) => 
          rental.product && rental.owner && rental.renter
        ).map((rental: any) => ({
          ...rental,
          product: {
            ...rental.product,
            images: rental.product.images || []
          },
          owner: rental.owner || {},
          renter: rental.renter || {}
        })));
        setTotalPages(data.totalPages || 1);
        break;
      case 'revenue':
        // Handle revenue tab data update
        break;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Only update search params if there's a non-empty search term
    if (searchParams.search?.trim()) {
      setSearchParams(prev => ({ ...prev, page: 1 }));
    } else {
      setSearchParams(prev => ({ ...prev, page: 1, search: '' }));
    }
  };

  const handleRoleFilter = (role: string) => {
    setSelectedRole(role);
    setSearchParams(prev => ({ ...prev, role: role || undefined, page: 1 }));
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setSearchParams(prev => ({ ...prev, status: status || undefined, page: 1 }));
  };

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate') => {
    try {
      setActionLoading(true);
      await axios.post(`/admin/users/${userId}/${action}`);
      const usersRes = await fetchTabData('users');
      updateTabData('users', usersRes.data);
    } catch (err) {
      setError(`Failed to ${action} user`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      setActionLoading(true);
      await axios.delete(`/admin/products/${productId}`);
      const productsRes = await fetchTabData('products');
      updateTabData('products', productsRes.data);
    } catch (err) {
      setError('Failed to delete product');
      console.error('Error deleting product:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const renderRevenue = () => (
    <div className="mt-4 space-y-4">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Revenue Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Total Revenue</h3>
            <p className="text-2xl font-bold text-white mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Active Rentals Revenue</h3>
            <p className="text-2xl font-bold text-white mt-2">₹{stats.activeRentals.toLocaleString()}</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Total Rentals</h3>
            <p className="text-2xl font-bold text-white mt-2">{stats.totalRentals.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {rentals.map((rental) => (
                <tr key={rental._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {rental.product.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {rental.owner.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {rental.renter.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    ₹{rental.totalPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      rental.status === 'active' ? 'bg-green-900/50 text-green-400' :
                      rental.status === 'completed' ? 'bg-blue-900/50 text-blue-400' :
                      'bg-gray-900/50 text-gray-400'
                    }`}>
                      {rental.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(rental.startDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTabs = () => (
    <div className="border-b border-gray-700">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {['users', 'products', 'rentals', 'revenue'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab as TabType);
              setSearchParams({ page: 1, limit: 10, search: '' });
              setSelectedRole('');
              setSelectedStatus('');
            }}
            className={`
              ${activeTab === tab
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
              }
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium capitalize
            `}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );

  const renderFilters = () => (
    <div className="mt-4 flex flex-col sm:flex-row gap-4">
      <form onSubmit={handleSearch} className="sm:flex-1">
        <div className="relative rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 bg-gray-700 py-1.5 pl-10 pr-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 sm:text-sm sm:leading-6"
            placeholder={`Search ${activeTab}...`}
            value={searchParams.search}
            onChange={(e) => setSearchParams(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </form>

      <div className="flex items-center gap-2">
        <FunnelIcon className="h-5 w-5 text-gray-400" />
        {activeTab === 'users' && (
          <select
            className="rounded-md border-0 bg-gray-700 py-1.5 pl-3 pr-8 text-white focus:ring-2 focus:ring-blue-500 sm:text-sm"
            value={selectedRole}
            onChange={(e) => handleRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
            <option value="admin">Admin</option>
          </select>
        )}
        {(activeTab === 'products' || activeTab === 'rentals') && (
          <select
            className="rounded-md border-0 bg-gray-700 py-1.5 pl-3 pr-8 text-white focus:ring-2 focus:ring-blue-500 sm:text-sm"
            value={selectedStatus}
            onChange={(e) => handleStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            {activeTab === 'products' ? (
              <>
                <option value="available">Available</option>
                <option value="rented">Rented</option>
              </>
            ) : (
              <>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </>
            )}
          </select>
        )}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="mt-4 flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Name</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Email</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Role</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 bg-gray-800">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-700">
                          <span className="text-sm font-medium leading-none text-white">{user.name[0]}</span>
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-white">{user.name}</div>
                        <div className="text-gray-400">Joined {new Date(user.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{user.email}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-gray-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.isActive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleUserAction(user._id, user.isActive ? 'deactivate' : 'activate')}
                        disabled={actionLoading}
                        className={`inline-flex items-center rounded px-2.5 py-1.5 text-xs font-medium ${
                          user.isActive
                            ? 'bg-red-900/50 text-red-400 hover:bg-red-900'
                            : 'bg-green-900/50 text-green-400 hover:bg-green-900'
                        }`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => {
        const originalUrl = product.images[0]?.url;
        const transformedUrl = originalUrl ? getImageUrl(originalUrl) : getImageUrl(undefined);
        console.log('Image processing for product:', {
          id: product._id,
          title: product.title,
          originalUrl,
          transformedUrl,
          fullImageObject: product.images[0],
          allImages: product.images
        });

        return (
          <div key={product._id} className="bg-gray-800 rounded-lg overflow-hidden shadow">
            <div className="aspect-w-16 aspect-h-9">
              <img
                src={transformedUrl}
                alt={product.title}
                className="object-cover w-full h-48"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.error('Image load error:', {
                    productId: product._id,
                    title: product.title,
                    originalUrl,
                    transformedUrl: target.src,
                    fullImageObject: product.images[0]
                  });
                  target.src = getImageUrl(undefined);
                }}
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-medium text-white truncate">{product.title}</h3>
              <p className="text-sm text-gray-400">By {product.owner.name}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">
                  ₹{product.pricing.perDay}/day
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  product.isAvailable ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                }`}>
                  {product.isAvailable ? 'Available' : 'Rented'}
                </span>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleDeleteProduct(product._id)}
                  disabled={actionLoading}
                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderRentals = () => (
    <div className="mt-4 space-y-4">
      {rentals.map((rental) => {
        const originalUrl = rental.product.images[0]?.url;
        const transformedUrl = originalUrl ? getImageUrl(originalUrl) : getImageUrl(undefined);
        console.log('Image processing for rental:', {
          id: rental._id,
          productId: rental.product._id,
          title: rental.product.title,
          originalUrl,
          transformedUrl,
          fullImageObject: rental.product.images[0],
          allImages: rental.product.images
        });

        return (
          <div key={rental._id} className="bg-gray-800 rounded-lg p-4">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div className="sm:flex sm:space-x-4">
                <img
                  src={transformedUrl}
                  alt={rental.product.title}
                  className="w-20 h-20 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    console.error('Image load error:', {
                      rentalId: rental._id,
                      productId: rental.product._id,
                      title: rental.product.title,
                      originalUrl,
                      transformedUrl: target.src,
                      fullImageObject: rental.product.images[0]
                    });
                    target.src = getImageUrl(undefined);
                  }}
                />
                <div>
                  <h3 className="text-lg font-medium text-white">{rental.product.title}</h3>
                  <div className="mt-1 text-sm text-gray-400">
                    <p>Owner: {rental.owner.name}</p>
                    <p>Renter: {rental.renter.name}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-0">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-400">
                    <p>Start: {new Date(rental.startDate).toLocaleDateString()}</p>
                    <p>End: {new Date(rental.endDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    rental.status === 'active' ? 'bg-green-900/50 text-green-400' :
                    rental.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' :
                    rental.status === 'completed' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-red-900/50 text-red-400'
                  }`}>
                    {rental.status}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-white">
                  Total: ₹{rental.totalPrice}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderPagination = () => (
    <div className="mt-4 flex items-center justify-between">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page - 1 }))}
          disabled={searchParams.page === 1}
          className="relative inline-flex items-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page + 1 }))}
          disabled={searchParams.page === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-400">
            Showing page <span className="font-medium">{searchParams.page}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
          <button
            onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={searchParams.page === 1}
            className="relative inline-flex items-center rounded-l-md bg-gray-700 px-2 py-2 text-gray-400 hover:bg-gray-600 disabled:opacity-50"
          >
            <span className="sr-only">Previous</span>
            <ClockIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={searchParams.page === totalPages}
            className="relative inline-flex items-center rounded-r-md bg-gray-700 px-2 py-2 text-gray-400 hover:bg-gray-600 disabled:opacity-50"
          >
            <span className="sr-only">Next</span>
            <ClockIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-400">
            Overview of the platform's performance and management.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {['users', 'products', 'rentals', 'revenue'].map((tab) => (
          <Link
            key={tab}
            to={`/admin/dashboard?tab=${tab}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab(tab as TabType);
              setSearchParams({ page: 1, limit: 10, search: '' });
              setSelectedRole('');
              setSelectedStatus('');
            }}
            className="block h-full transform transition-transform duration-200 hover:scale-105"
          >
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
              className="relative h-full overflow-hidden rounded-lg bg-gray-800 px-4 py-5 shadow sm:px-6 hover:bg-gray-700/80 transition-colors duration-200"
          >
            <dt>
              <div className={`absolute rounded-md p-3 ${tab === 'users' ? 'bg-blue-500' :
                              tab === 'products' ? 'bg-green-500' :
                              tab === 'rentals' ? 'bg-yellow-500' : 'bg-purple-500'}`}>
                {tab === 'users' && <UserGroupIcon className="h-6 w-6 text-white" aria-hidden="true" />}
                {tab === 'products' && <ShoppingBagIcon className="h-6 w-6 text-white" aria-hidden="true" />}
                {tab === 'rentals' && <ExclamationTriangleIcon className="h-6 w-6 text-white" aria-hidden="true" />}
                {tab === 'revenue' && <CurrencyDollarIcon className="h-6 w-6 text-white" aria-hidden="true" />}
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-400">
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </p>
            </dt>
              <dd className="ml-16 flex items-baseline pb-6">
              <p className="text-2xl font-semibold text-white">{tab === 'users' ? stats.totalUsers :
                                                                tab === 'products' ? stats.totalProducts :
                                                                tab === 'rentals' ? stats.totalRentals :
                                                                stats.totalRevenue.toLocaleString()}</p>
            </dd>
              <div className="absolute bottom-2 left-16">
                <p className="text-sm text-gray-500">{tab === 'users' ? 'Manage user accounts' :
                                                    tab === 'products' ? 'View all products' :
                                                    tab === 'rentals' ? 'Monitor active rentals' : 'View revenue details'}</p>
              </div>
          </motion.div>
          </Link>
        ))}
      </div>

      {/* Management Section */}
      <div className="mt-8">
        {renderTabs()}
        {activeTab !== 'revenue' && renderFilters()}
        
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'rentals' && renderRentals()}
        {activeTab === 'revenue' && renderRevenue()}
        
        {activeTab !== 'revenue' && renderPagination()}
      </div>
    </div>
  );
} 