import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from '../utils/axios';
import { format } from 'date-fns';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  EyeIcon, 
  EyeSlashIcon,
  TrashIcon,
  ClockIcon,
  PencilIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import EditRentalModal from '../components/EditRentalModal';
import { getImageUrl } from '../utils/imageUrl';

// Update the rental status types to match the simplified workflow
type RentalStatus = 'pending' | 'approved' | 'active' | 'completed' | 'rejected';

interface Rental {
  _id: string;
  product: {
    _id: string;
    title: string;
    images: { url: string }[];
    availability: {
      isAvailable: boolean;
    };
  };
  renter: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  owner: {
    _id: string;
    name: string;
  };
  startDate: Date;
  endDate: Date;
  duration: string;
  totalPrice: number;
  status: RentalStatus;
}

export default function VendorRentals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed'>('active');
  
  const handleTabChange = (tab: typeof activeTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  // Update URL when component mounts or when tab changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const isValidTab = ['active', 'pending', 'completed'].includes(tabFromUrl || '');
    const tab = isValidTab ? tabFromUrl : 'active';
    
    // Update URL and state
    setSearchParams({ tab: tab as string }, { replace: true });
    setActiveTab(tab as 'pending' | 'active' | 'completed');
  }, [searchParams.get('tab')]);

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch rentals when active tab changes
  useEffect(() => {
    fetchRentals();
  }, [activeTab]);

  // Filter rentals when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRentals(rentals);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = rentals.filter(rental => 
      rental.product.title.toLowerCase().includes(query) ||
      rental.renter.name.toLowerCase().includes(query) ||
      rental.renter.email.toLowerCase().includes(query)
    );
    setFilteredRentals(filtered);
  }, [searchQuery, rentals]);

  const fetchRentals = async () => {
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'pending':
          endpoint = '/vendor/rentals/pending';
          break;
        case 'active':
          endpoint = '/vendor/rentals/active';
          break;
        case 'completed':
          endpoint = '/vendor/rentals/history';
          break;
      }
      console.log('Fetching rentals from endpoint:', endpoint);
      const response = await axios.get(endpoint);
      // Transform dates from strings to Date objects
      const transformedRentals = response.data.map((rental: any) => ({
        ...rental,
        startDate: new Date(rental.startDate),
        endDate: new Date(rental.endDate)
      }));
      setRentals(transformedRentals);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Access denied. Please make sure you are logged in as a vendor.');
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

  const updateRentalStatus = async (rentalId: string, status: RentalStatus) => {
    try {
      setLoading(true);
      await axios.patch(`/vendor/rentals/${rentalId}/status`, { status });
      await fetchRentals();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Access denied. Please make sure you are logged in as a vendor.');
      } else if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError('Failed to update rental status. Please try again later.');
      }
      console.error('Error updating rental status:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      await axios.patch(`/vendor/products/${productId}/availability`, {
        isAvailable: !currentStatus
      });
      await fetchRentals();
    } catch (err) {
      console.error('Error toggling availability:', err);
      setError('Failed to update product availability');
    } finally {
      setLoading(false);
    }
  };

  const deleteRental = async (rentalId: string) => {
    if (!window.confirm('Are you sure you want to delete this rental?')) {
      return;
    }

    try {
      await axios.delete(`/vendor/rentals/${rentalId}`);
      fetchRentals();
    } catch (err) {
      console.error('Error deleting rental:', err);
      setError('Failed to delete rental');
    }
  };

  const handleEditClick = (rental: Rental) => {
    setSelectedRental(rental);
    setIsEditModalOpen(true);
  };

  const handleEditComplete = () => {
    fetchRentals();
    setIsEditModalOpen(false);
    setSelectedRental(null);
  };

  const buttonStyles = {
    edit: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
    complete: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    approve: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
    reject: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    unavailable: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500"
  };

  const baseButtonStyle = `
    inline-flex items-center px-4 py-2 border border-transparent 
    rounded-md shadow-sm text-sm font-medium 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
    transition-all duration-200 ease-in-out
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-white">My Rentals</h1>
          <p className="mt-2 text-sm text-gray-400">
            Manage your rental listings, requests, and ongoing rentals
          </p>
        </div>
      </div>

      <div className="mt-4">
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
      </div>

      {/* Search Bar */}
      <div className="mt-6">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab} rentals...`}
            className="block w-full rounded-md border-0 bg-gray-700/50 py-2 pl-10 pr-3 text-gray-300 placeholder:text-gray-400 focus:bg-gray-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-6">
        {filteredRentals.map((rental) => (
          <motion.div
            key={rental._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-colors duration-200"
          >
            <div className="p-6">
              <div className="lg:flex lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="relative w-full h-48 bg-gray-700">
                        <img
                          src={rental.product.images[0]?.url ? getImageUrl(rental.product.images[0].url) : getImageUrl(undefined)}
                          alt={rental.product.title}
                          className="w-full h-full object-cover"
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
                    </div>
                    <div className="ml-4">
                      <h2 className="text-lg font-medium text-white truncate">
                        {rental.product.title}
                      </h2>
                      <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
                        <div className="mt-2 flex items-center text-sm text-gray-400">
                          <span>Renter: {rental.renter.name}</span>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-400">
                          <span>Duration: {rental.duration} days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex lg:mt-0 lg:ml-4">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEditClick(rental)}
                      className={`${baseButtonStyle} ${buttonStyles.edit}`}
                      disabled={loading}
                    >
                      <PencilIcon className="-ml-1 mr-2 h-5 w-5" />
                      Edit
                    </button>
                    
                    {activeTab === 'pending' && (
                      <>
                        <button
                          onClick={() => updateRentalStatus(rental._id, 'approved')}
                          className={`${baseButtonStyle} ${buttonStyles.approve}`}
                          disabled={loading}
                        >
                          <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                          Approve
                        </button>
                        <button
                          onClick={() => updateRentalStatus(rental._id, 'rejected')}
                          className={`${baseButtonStyle} ${buttonStyles.reject}`}
                          disabled={loading}
                        >
                          <XCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                          Reject
                        </button>
                      </>
                    )}
                    
                    {activeTab === 'active' && (
                      <button
                        onClick={() => updateRentalStatus(rental._id, 'completed')}
                        className={`${baseButtonStyle} ${buttonStyles.complete}`}
                        disabled={loading}
                      >
                        <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                        Mark as Complete
                      </button>
                    )}
                    
                    <button
                      onClick={() => toggleAvailability(rental.product._id, rental.product.availability.isAvailable)}
                      className={`${baseButtonStyle} ${buttonStyles.unavailable}`}
                      disabled={loading || activeTab === 'active'}
                    >
                      {rental.product.availability.isAvailable ? (
                        <>
                          <EyeSlashIcon className="-ml-1 mr-2 h-5 w-5" />
                          Set Unavailable
                        </>
                      ) : (
                        <>
                          <EyeIcon className="-ml-1 mr-2 h-5 w-5" />
                          Set Available
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-gray-700/50 px-4 py-3 rounded-lg">
                  <dt className="text-sm font-medium text-gray-400">Start Date</dt>
                  <dd className="mt-1 text-sm text-white">
                    {format(new Date(rental.startDate), 'MMM d, yyyy')}
                  </dd>
                </div>
                <div className="bg-gray-700/50 px-4 py-3 rounded-lg">
                  <dt className="text-sm font-medium text-gray-400">End Date</dt>
                  <dd className="mt-1 text-sm text-white">
                    {format(new Date(rental.endDate), 'MMM d, yyyy')}
                  </dd>
                </div>
                <div className="bg-gray-700/50 px-4 py-3 rounded-lg">
                  <dt className="text-sm font-medium text-gray-400">Total Price</dt>
                  <dd className="mt-1 text-sm text-white">Rs. {rental.totalPrice}</dd>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="bg-gray-700/50 px-4 py-3 rounded-lg">
                  <dt className="text-sm font-medium text-gray-400">Status</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${rental.status === 'approved' ? 'bg-green-100 text-green-800' :
                          rental.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          rental.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          rental.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                    </span>
                  </dd>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredRentals.length === 0 && (
          <div className="text-center text-gray-400 py-8 bg-gray-800/50 rounded-lg border border-gray-700/50">
            {searchQuery ? (
              <p>No rentals found matching your search.</p>
            ) : (
              <p>No rentals to show in this category.</p>
            )}
          </div>
        )}
      </div>

      {selectedRental && (
        <EditRentalModal
          rental={selectedRental}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleEditComplete}
        />
      )}
    </div>
  );
} 