import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import axios from '../utils/axios';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { XCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getImageUrl } from '../utils/imageUrl';

type RentalStatus = 'pending' | 'approved' | 'active' | 'completed' | 'rejected' | 'cancelled';

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
  startDate: Date;
  endDate: Date;
  status: RentalStatus;
  totalPrice: number;
}

export default function MyRentals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'completed'>('active');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleTabChange = (tab: typeof activeTab) => {
    setSearchParams({ tab }, { replace: true });
    setSearchTerm(''); // Clear search when changing tabs
  };

  // Update URL when component mounts or when tab changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const isValidTab = ['active', 'pending', 'completed'].includes(tabFromUrl || '');
    const tab = isValidTab ? tabFromUrl : 'active';
    
    setSearchParams({ tab: tab as string }, { replace: true });
    setActiveTab(tab as 'active' | 'pending' | 'completed');
  }, [searchParams.get('tab')]);

  // Fetch rentals when active tab changes or search term changes
  useEffect(() => {
    if (user && user.role === 'customer') {
      fetchRentals();
    }
  }, [activeTab, searchTerm]);

  const fetchRentals = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      
      // Use the appropriate search endpoint based on the active tab
      switch (activeTab) {
        case 'pending':
          endpoint = '/customer/rentals/pending';
          break;
        case 'active':
          endpoint = '/customer/rentals/active';
          break;
        case 'completed':
          endpoint = '/customer/rentals/history';
          break;
      }
      
      // Add /search to the endpoint if there's a search term
      if (searchTerm) {
        endpoint += '/search';
      }

      const response = await axios.get(endpoint, {
        params: {
          search: searchTerm || undefined,
          sort: '-createdAt'
        }
      });

      // Transform dates from strings to Date objects
      const rentalsData = searchTerm ? response.data.rentals : response.data;
      const transformedRentals = rentalsData.map((rental: any) => ({
        ...rental,
        startDate: new Date(rental.startDate),
        endDate: new Date(rental.endDate)
      }));

      setRentals(transformedRentals);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Access denied. Please make sure you are logged in as a customer.');
      } else if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError('Failed to fetch rentals. Please try again later.');
      }
      console.error('Error fetching rentals:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input with debouncing
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      fetchRentals();
    }, 300); // Reduced to 300ms for better responsiveness
    
    setSearchTimeout(timeout);
  };

  const handleCancelRental = async (rentalId: string) => {
    if (!window.confirm('Are you sure you want to cancel this rental?')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [rentalId]: true }));
      await axios.post(`/customer/rentals/${rentalId}/cancel`);
      await fetchRentals();
    } catch (err: any) {
      console.error('Error cancelling rental:', err);
      setError('Failed to cancel rental. Please try again later.');
    } finally {
      setActionLoading(prev => ({ ...prev, [rentalId]: false }));
    }
  };

  const getStatusColor = (status: RentalStatus) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100/90 text-emerald-800';
      case 'approved':
        return 'bg-sky-100/90 text-sky-800';
      case 'completed':
        return 'bg-violet-100/90 text-violet-800';
      case 'pending':
        return 'bg-amber-100/90 text-amber-800';
      case 'rejected':
        return 'bg-rose-100/90 text-rose-800';
      case 'cancelled':
        return 'bg-gray-100/90 text-gray-800';
      default:
        return 'bg-slate-100/90 text-slate-800';
    }
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'active':
        return 'Search active rentals by product or owner...';
      case 'pending':
        return 'Search pending requests by product or owner...';
      case 'completed':
        return 'Search rental history by product or owner...';
      default:
        return 'Search rentals...';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const renderRentalList = (rentals: Rental[]) => (
    <div className="space-y-6">
      {rentals.map((rental) => (
        <motion.div
          key={rental._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-colors duration-200"
        >
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-24 h-24">
                <img
                  src={rental.product.images[0]?.url ? getImageUrl(rental.product.images[0].url) : getImageUrl(undefined)}
                  alt={rental.product.title}
                  className="h-24 w-24 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    console.error('Image load error:', {
                      productId: rental.product._id,
                      title: rental.product.title,
                      originalUrl: rental.product.images[0]?.url,
                      transformedUrl: target.src
                    });
                    target.src = getImageUrl(undefined);
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white truncate">
                    {rental.product.title}
                  </h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(rental.status)}`}>
                    {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-300">
                  <p className="flex items-center">
                    <span className="inline-block w-16 text-gray-400">Owner:</span>
                    <span>{rental.owner.name}</span>
                  </p>
                  <p className="flex items-center mt-1">
                    <span className="inline-block w-16 text-gray-400">Duration:</span>
                    <span>
                      {format(new Date(rental.startDate), 'MMM d, yyyy')} -{' '}
                      {format(new Date(rental.endDate), 'MMM d, yyyy')}
                    </span>
                  </p>
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <p className="flex items-center justify-between text-gray-300">
                      <span>Total Price:</span>
                      <span>Rs. {rental.totalPrice.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {(rental.status === 'approved' || rental.status === 'pending') && (
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => handleCancelRental(rental._id)}
                  disabled={actionLoading[rental._id]}
                  className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
                    bg-rose-200 text-rose-700 hover:bg-rose-300
                    focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-gray-900
                    transition-all duration-200 ease-in-out
                    shadow-sm hover:shadow-md
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading[rental._id] ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-rose-700 mr-2"></div>
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="h-4 w-4 mr-2" />
                      Cancel Rental
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      ))}
      {rentals.length === 0 && (
        <div className="text-center text-gray-400 py-8 bg-gray-800/50 rounded-lg border border-gray-700/50">
          No rentals to show.
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-white">My Rentals</h1>
          <p className="mt-2 text-sm text-gray-400">
            View and manage your rental requests and active rentals
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-rose-500/10 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {['active', 'pending', 'completed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab as typeof activeTab)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-96">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={getSearchPlaceholder()}
              className="block w-full rounded-lg border border-gray-700/50 bg-gray-800/90 py-2.5 pl-10 pr-3 text-gray-300 placeholder:text-gray-500 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/25 sm:text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
              >
                <XCircleIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
              {searchTerm && (
                <div className="mb-4 text-sm text-gray-400">
                  {rentals.length === 0 
                    ? 'No rentals found' 
                    : `Found ${rentals.length} rental${rentals.length === 1 ? '' : 's'}`}
                </div>
              )}
              {renderRentalList(rentals)}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 