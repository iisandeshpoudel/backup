import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from '../utils/axios';
import { getImageUrl } from '../utils/imageUrl';
import { PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Product {
  _id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  pricing: {
    perDay: number;
    perWeek: number;
    perMonth: number;
    securityDeposit: number;
  };
  images: { url: string }[];
  availability: {
    isAvailable: boolean;
  };
  location: string;
}

export default function VendorProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products.filter(product => 
      product.title.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      product.location.toLowerCase().includes(query)
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/vendor/products');
      console.log('Raw product data:', response.data);
      console.log('Product images data:', response.data.map((p: Product) => ({
        id: p._id,
        title: p.title,
        rawImageData: p.images[0],
        imageUrl: p.images[0]?.url
      })));
      setProducts(response.data);
    } catch (err: any) {
      setError('Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      await axios.patch(`/vendor/products/${productId}/availability`, {
        isAvailable: !currentStatus
      });
      // Refresh products list
      fetchProducts();
    } catch (err) {
      console.error('Error toggling availability:', err);
      setError('Failed to update product availability');
    }
  };

  const handleEdit = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/vendor/products/${productId}/edit`);
  };

  const deleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await axios.delete(`/vendor/products/${productId}`);
      // Refresh products list
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product');
    }
  };

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
          <h1 className="text-2xl font-semibold text-white">My Products</h1>
          <p className="mt-2 text-sm text-gray-400">
            Manage your product listings and their availability
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/products/add"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            Add Product
          </Link>
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
            placeholder="Search your products..."
            className="block w-full rounded-md border-0 bg-gray-700/50 py-2 pl-10 pr-3 text-gray-300 placeholder:text-gray-400 focus:bg-gray-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative bg-gray-800 rounded-lg shadow-lg overflow-hidden"
          >
            <div className="relative w-full h-48 bg-gray-700">
              {(() => {
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
                return null;
              })()}
              <img
                className="w-full h-full object-cover"
                src={product.images[0]?.url ? getImageUrl(product.images[0].url) : getImageUrl(undefined)}
                alt={product.title}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.error('Image load error for product:', {
                    id: product._id,
                    title: product.title,
                    originalSrc: product.images[0]?.url,
                    transformedSrc: target.src,
                    fullImageObject: product.images[0],
                    error: e
                  });
                  target.src = getImageUrl(undefined);
                }}
              />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-white truncate">
                    {product.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">{product.category}</p>
                </div>
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

              <div className="mt-4">
                <p className="text-sm text-gray-400">Daily Rate</p>
                <p className="text-lg font-medium text-white">
                  Rs. {product.pricing.perDay}
                </p>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => toggleAvailability(product._id, product.availability.isAvailable)}
                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  {product.availability.isAvailable ? (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
                <button
                  onClick={(e) => handleEdit(e, product._id)}
                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PencilIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => deleteProduct(product._id)}
                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center mt-8 p-8 bg-gray-800/50 rounded-lg border border-gray-700/50">
          {searchQuery ? (
            <p className="text-gray-400">No products found matching your search.</p>
          ) : (
            <>
              <p className="text-gray-400">No products listed yet.</p>
              <Link
                to="/products/add"
                className="inline-flex items-center justify-center mt-4 rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Add Your First Product
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
} 