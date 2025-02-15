import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { StarIcon } from "@heroicons/react/20/solid";
import {
  CalendarDaysIcon,
  MapPinIcon,
  UserIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import axios from "../utils/axios";
import { useAuth } from "../contexts/AuthContext";
import "react-datepicker/dist/react-datepicker.css";
import StyledDatePicker from "../components/StyledDatePicker";
import { getImageUrl } from "../utils/imageUrl";
import ProductChat from "../components/ProductChat";

interface BookingInfo {
  startDate: Date;
  endDate: Date;
  renterName: string;
}

interface Product {
  _id: string;
  title: string;
  description: string;
  images: { url: string }[];
  location: string;
  category: string;
  condition: string;
  availability: {
    isAvailable: boolean;
  };
  pricing: {
    perDay: number;
    perWeek: number;
    perMonth: number;
    securityDeposit: number;
  };
  ratings: {
    average: number;
    count: number;
  };
  reviews: {
    user: {
      _id: string;
      name: string;
    };
    rating: number;
    comment: string;
    createdAt: string;
  }[];
  owner: {
    _id: string;
    name: string;
  };
  vendor: string; // Add vendor field to Product interface
}

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);

  // Rental state
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [rentalLoading, setRentalLoading] = useState(false);
  const [rentalError, setRentalError] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState<string>("");

  const [bookings, setBookings] = useState<BookingInfo[]>([]);
  const [showChat, setShowChat] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      Promise.all([fetchProduct(), fetchUnavailableDates()]);
    }
  }, [id]);

  useEffect(() => {
    if (startDate && endDate && product) {
      calculateEstimatedPrice();
    }
  }, [startDate, endDate]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`/products/${id}`);
      setProduct(response.data);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Error fetching product");
    }
  };

  const fetchUnavailableDates = async () => {
    try {
      const response = await axios.get(`/products/${id}/rentals`);
      const activeRentals = response.data.filter((rental: any) =>
        ["approved", "active"].includes(rental.status)
      );

      // Transform rentals into booking info
      const bookingInfo = activeRentals.map((rental: any) => ({
        startDate: new Date(rental.startDate),
        endDate: new Date(rental.endDate),
        renterName: rental.renter.name,
      }));
      setBookings(bookingInfo);

      // Create array of unavailable dates
      const unavailable: Date[] = [];
      bookingInfo.forEach((booking: BookingInfo) => {
        const current = new Date(booking.startDate);
        while (current <= booking.endDate) {
          unavailable.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      });
      setUnavailableDates(unavailable);
    } catch (err) {
      console.error("Error fetching rental information:", err);
    }
  };

  const calculateEstimatedPrice = () => {
    if (!startDate || !endDate || !product) return;

    // Ensure dates are valid
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
      setRentalError("Start date must be in the future");
      return;
    }

    if (end <= start) {
      setRentalError("End date must be after start date");
      return;
    }

    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    let price;

    if (days <= 7) {
      price = days * product.pricing.perDay;
    } else if (days <= 30) {
      const weeks = Math.ceil(days / 7);
      price = weeks * product.pricing.perWeek;
    } else {
      const months = Math.ceil(days / 30);
      price = months * product.pricing.perMonth;
    }

    setRentalError(""); // Clear any previous errors
    setEstimatedPrice(price);
  };

  const handleRentNow = async () => {
    if (!startDate || !endDate || !product) return;

    // Validate dates again before submitting
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
      setRentalError("Start date must be in the future");
      return;
    }

    if (end <= start) {
      setRentalError("End date must be after start date");
      return;
    }

    if (!estimatedPrice) {
      setRentalError("Unable to calculate rental price");
      return;
    }

    setRentalLoading(true);
    setRentalError("");
    setAvailabilityMessage("");

    try {
      await axios.post("/rentals", {
        productId: product._id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalPrice: estimatedPrice,
        securityDeposit: product.pricing.securityDeposit,
      });

      setShowRentalModal(false);
      navigate("/dashboard");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Error creating rental";
      setRentalError(errorMessage);

      // Set availability message if provided
      if (err.response?.data?.details) {
        setAvailabilityMessage(err.response.data.details);
      }

      console.error(
        "Rental creation error:",
        err.response?.data || err.message
      );
    } finally {
      setRentalLoading(false);
    }
  };

  const getBookingMessage = () => {
    if (bookings.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-medium text-gray-200">Current Bookings:</h4>
        {bookings.map((booking, index) => (
          <div
            key={index}
            className="text-sm text-gray-400 bg-gray-700/50 p-2 rounded"
          >
            <span className="font-medium text-gray-300">
              {booking.renterName}
            </span>
            <span className="mx-2">•</span>
            {new Date(booking.startDate).toLocaleDateString()} -{" "}
            {new Date(booking.endDate).toLocaleDateString()}
          </div>
        ))}
      </div>
    );
  };

  if (error || !product) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error || "Product not found"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          {/* Image gallery */}
          <div className="flex flex-col">
            <div className="aspect-w-1 aspect-h-1 bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={getImageUrl(product.images[selectedImage]?.url)}
                alt={`Product image ${selectedImage + 1}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder-product.jpg";
                }}
              />
            </div>
            {product.images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative h-20 w-20 cursor-pointer overflow-hidden rounded-lg ${
                      selectedImage === index ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <img
                      src={getImageUrl(image.url)}
                      alt={`Product thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder-product.jpg";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="mt-8 lg:mt-0">
            <h1 className="text-3xl font-bold text-white">{product.title}</h1>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center">
                <StarIcon className="h-5 w-5 text-yellow-400" />
                <span className="ml-1 text-sm text-gray-400">
                  {product.ratings.average.toFixed(1)} ({product.ratings.count}{" "}
                  reviews)
                </span>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  product.availability.isAvailable
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {product.availability.isAvailable
                  ? "Available"
                  : "Currently Unavailable"}
              </span>
            </div>

            <div className="mt-4 space-y-6">
              <div className="text-base text-gray-300">
                {product.description}
              </div>

              <div className="flex items-center text-gray-400">
                <MapPinIcon className="h-5 w-5 mr-2" />
                {product.location}
              </div>

              <div className="flex items-center text-gray-400">
                <UserIcon className="h-5 w-5 mr-2" />
                Listed by {product.owner.name}
              </div>

              {user?.role === "vendor" ? (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-lg font-medium text-white">Pricing</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-800 p-4">
                      <p className="text-sm text-gray-400">Per Day</p>
                      <p className="mt-1 text-lg font-medium text-white">
                        Rs. {product.pricing.perDay}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-800 p-4">
                      <p className="text-sm text-gray-400">Per Week</p>
                      <p className="mt-1 text-lg font-medium text-white">
                        Rs. {product.pricing.perWeek}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-800 p-4">
                      <p className="text-sm text-gray-400">Per Month</p>
                      <p className="mt-1 text-lg font-medium text-white">
                        Rs. {product.pricing.perMonth}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-800 p-4">
                      <p className="text-sm text-gray-400">Security Deposit</p>
                      <p className="mt-1 text-lg font-medium text-white">
                        Rs. {product.pricing.securityDeposit}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-lg font-medium text-white">Pricing</h3>
                  <div className="mt-4">
                    <div className="rounded-lg bg-gray-800 p-4">
                      <p className="text-sm text-gray-400">Price Per Day</p>
                      <p className="mt-1 text-lg font-medium text-white">
                        Rs. {product.pricing.perDay}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-medium text-white">Details</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-400">Category</p>
                    <p className="mt-1 text-base text-white">
                      {product.category}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Condition</p>
                    <p className="mt-1 text-base text-white">
                      {product.condition}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-8 flex gap-4">
                {user &&
                  user.role === "customer" &&
                  product?.availability.isAvailable && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowRentalModal(true)}
                        className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                      >
                        <CalendarDaysIcon className="h-5 w-5 inline-block mr-2" />
                        Rent Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowChat(true)}
                        className="flex-1 rounded-md bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                      >
                        <ChatBubbleLeftIcon className="h-5 w-5 inline-block mr-2" />
                        Chat with Vendor
                      </button>
                    </>
                  )}
                {!user && (
                  <Link
                    to="/login"
                    className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    Login to Rent
                  </Link>
                )}
                {user &&
                  user.role === "vendor" &&
                  product?.owner._id === user._id && (
                    <Link
                      to={`/vendor/rentals`}
                      className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                      Manage Rentals
                    </Link>
                  )}
              </div>

              {/* Add ProductChat component */}
              {(user?.role === "customer" ||
                (user?.role === "vendor" &&
                  product?.owner._id === user._id)) && (
                <ProductChat
                  productId={product._id}
                  isOpen={showChat}
                  onClose={() => setShowChat(false)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Rental Modal */}
        {showRentalModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
              <button
                onClick={() => setShowRentalModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>

              <h2 className="text-xl font-bold text-white mb-4">
                Rent this Product
              </h2>

              {rentalError && (
                <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                  {rentalError}
                </div>
              )}

              {availabilityMessage && (
                <div className="mb-4 bg-blue-900/50 border border-blue-500 text-blue-200 px-4 py-3 rounded">
                  {availabilityMessage}
                </div>
              )}

              <div className="space-y-4">
                {getBookingMessage()}

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Start Date
                  </label>
                  <StyledDatePicker
                    selected={startDate}
                    onChange={setStartDate}
                    minDate={new Date()}
                    maxDate={endDate || undefined}
                    excludeDates={unavailableDates}
                    placeholderText="Select start date"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    End Date
                  </label>
                  <StyledDatePicker
                    selected={endDate}
                    onChange={setEndDate}
                    minDate={startDate || new Date()}
                    excludeDates={unavailableDates}
                    placeholderText="Select end date"
                  />
                </div>

                {estimatedPrice !== null && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-2">
                      Estimated Price
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Rental Fee:</span>
                        <span className="text-white">Rs. {estimatedPrice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Security Deposit:</span>
                        <span className="text-white">
                          Rs. {product?.pricing.securityDeposit}
                        </span>
                      </div>
                      <div className="border-t border-gray-600 pt-2 flex justify-between font-medium">
                        <span className="text-gray-300">Total:</span>
                        <span className="text-white">
                          Rs.{" "}
                          {estimatedPrice +
                            (product?.pricing.securityDeposit || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRentNow}
                  disabled={!startDate || !endDate || rentalLoading}
                  className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rentalLoading ? "Processing..." : "Confirm Rental"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reviews section */}
        {product.reviews.length > 0 && (
          <div className="mt-16 border-t border-gray-700 pt-8">
            <h2 className="text-2xl font-bold text-white">Reviews</h2>
            <div className="mt-8 space-y-8">
              {product.reviews.map((review) => (
                <div
                  key={review.user._id}
                  className="border-b border-gray-700 pb-8"
                >
                  <div className="flex items-center">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-5 w-5 ${
                            i < review.rating
                              ? "text-yellow-400"
                              : "text-gray-700"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="ml-4 text-sm text-gray-400">
                      by {review.user.name} •{" "}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="mt-4 text-gray-300">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
