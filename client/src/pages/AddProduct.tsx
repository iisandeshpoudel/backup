import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhotoIcon } from '@heroicons/react/24/outline';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const categories = ['Electronics', 'Furniture', 'Sports', 'Tools', 'Vehicles', 'Others'];
const conditions = ['New', 'Like New', 'Good', 'Fair'];
const API_BASE_URL = 'http://localhost:5000';

export default function AddProduct() {
  const navigate = useNavigate();
  const { id } = useParams(); // Get product ID if in edit mode
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Electronics',
    condition: 'Good',
    location: '',
    pricing: {
      perDay: ''
    }
  });

  // Load existing product data if in edit mode
  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          const response = await axios.get(`/vendor/products/${id}`);
          const product = response.data;
          
          setFormData({
            title: product.title,
            description: product.description,
            category: product.category,
            condition: product.condition,
            location: product.location,
            pricing: {
              perDay: product.pricing.perDay.toString()
            }
          });

          // Set existing images with proper URL construction
          if (product.images && product.images.length > 0) {
            const imageUrls = product.images.map((img: any) => {
              // If the URL is already absolute (starts with http), use it as is
              if (img.url.startsWith('http')) {
                return img.url;
              }
              // Otherwise, construct the full URL using the API base URL
              return `${API_BASE_URL}${img.url}`;
            });
            setExistingImages(imageUrls);
          }
        } catch (err) {
          console.error('Error loading product:', err);
          setError('Failed to load product data');
          navigate('/vendor/products'); // Redirect back on error
        }
      };

      fetchProduct();
    }
  }, [id, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = files.length + images.length + existingImages.length;
    if (totalImages > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    // Validate file types
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'].includes(file.type);
      if (!isValidType) {
        setError('Only JPG, JPEG, PNG, and GIF files are allowed');
        return false;
      }
      return true;
    });

    if (validFiles.length !== files.length) {
      return;
    }

    // Create preview URLs and update state
    const newImages = [...images, ...validFiles];
    const newUrls = [...previewUrls];
    
    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      newUrls.push(url);
    });

    setImages(newImages);
    setPreviewUrls(newUrls);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('pricing.')) {
      const pricingField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          [pricingField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.description.length < 10) {
      setError('Description must be at least 10 characters long');
      setLoading(false);
      return;
    }

    if (images.length === 0 && existingImages.length === 0) {
      setError('At least one image is required');
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      
      // Append basic fields
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('condition', formData.condition);
      formDataToSend.append('location', formData.location);

      // Convert pricing values to numbers and ensure they're valid
      const perDay = Number(formData.pricing.perDay) || 0;
      formDataToSend.append('pricing[perDay]', perDay.toString());

      // Append new images
      images.forEach(image => {
        formDataToSend.append('images', image);
      });

      let response;
      if (id) {
        // Edit mode
        response = await axios.patch(`/vendor/products/${id}`, formDataToSend);
      } else {
        // Create mode
        response = await axios.post('/products', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      navigate('/vendor/products');
    } catch (err: any) {
      console.error('Upload error details:', {
        message: err.message,
        response: err.response?.data
      });
      setError(err.response?.data?.message || err.response?.data?.error || 'Error saving product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup function for image preview URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {id ? 'Edit Product' : 'List Your Product for Rent'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {id ? 'Update your product details below.' : 'Fill in the details below to list your product for rent.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-200">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-200">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  required
                  minLength={10}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Describe your product in at least 10 characters"
                />
                <p className="mt-1 text-sm text-gray-400">Minimum 10 characters required</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-200">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="condition" className="block text-sm font-medium text-gray-200">
                    Condition
                  </label>
                  <select
                    id="condition"
                    name="condition"
                    required
                    value={formData.condition}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {conditions.map(condition => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-200">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Daily Rate */}
            <div>
              <label htmlFor="pricing.perDay" className="block text-sm font-medium text-gray-200">
                Daily Rate (Rs.)
              </label>
              <input
                type="number"
                id="pricing.perDay"
                name="pricing.perDay"
                required
                min="0"
                value={formData.pricing.perDay}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-200">
                Product Images
              </label>
              <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-600 px-6 py-10">
                <div className="text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                  <div className="mt-4 flex text-sm leading-6 text-gray-400">
                    <label
                      htmlFor="images"
                      className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                    >
                      <span>Upload images</span>
                      <input
                        id="images"
                        name="images"
                        type="file"
                        multiple
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs leading-5 text-gray-400">
                    PNG, JPG, GIF up to 10MB each (max 5 images)
                  </p>
                </div>
              </div>

              {/* Image Previews */}
              {(existingImages.length > 0 || previewUrls.length > 0) && (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {existingImages.map((url, index) => (
                    <div key={`existing-${index}`} className="relative group">
                      <img
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="h-24 w-24 object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.error('Image load error:', target.src);
                          target.src = '/placeholder-image.png'; // Fallback image
                        }}
                      />
                    </div>
                  ))}
                  {previewUrls.map((url, index) => (
                    <div key={`new-${index}`} className="relative group">
                      <img
                        src={url}
                        alt={`New upload ${index + 1}`}
                        className="h-24 w-24 object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.error('Image load error:', target.src);
                          target.src = '/placeholder-image.png'; // Fallback image
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/vendor/products')}
                  className="rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-3 inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : id ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 