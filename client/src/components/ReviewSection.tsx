import { useState } from "react";
import { Link } from "react-router-dom";
import { StarIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import axios from "../utils/axios";

interface Review {
  _id: string;
  user: {
    _id: string;
    name: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

interface Props {
  productId: string;
  reviews: Review[];
  onReviewAdded: () => void;
}

export default function ReviewSection({
  productId,
  reviews,
  onReviewAdded,
}: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0); // Start with 0 to show empty stars
  const [hoverRating, setHoverRating] = useState(0); // Add hover state
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const hasReviewed = reviews.some((review) => review.user._id === user?._id);
  const canReview = user?.role === "customer" && !hasReviewed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rating) return; // Prevent submission if no rating

    setIsSubmitting(true);
    setError("");

    try {
      await axios.post(`/products/${productId}/reviews`, {
        rating,
        comment,
      });
      setComment("");
      setRating(0);
      onReviewAdded();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error submitting review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-16 border-t border-gray-700 pt-8">
      <h2 className="text-2xl font-bold text-white">Reviews</h2>

      {!user && (
        <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
          <p className="text-sm text-gray-400">
            Please{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300">
              login
            </Link>{" "}
            to submit a review
          </p>
        </div>
      )}

      {user?.role === "vendor" && (
        <div className="mt-4 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">
            <span className="font-medium text-gray-300">Note:</span> Vendors
            cannot submit reviews. Only customers who have rented this product
            can leave reviews.
          </p>
        </div>
      )}

      {user?.role === "customer" && hasReviewed && (
        <div className="mt-4 bg-gray-800/50 rounded-lg p-4 border border-green-800/30">
          <p className="text-sm text-gray-400">
            <span className="text-green-400">✓</span> You have already submitted
            your review for this product. Thank you for your feedback!
          </p>
        </div>
      )}

      {canReview && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200">
              Share Your Experience
            </label>
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors duration-150 focus:outline-none"
                    >
                      {star <= (hoverRating || rating) ? (
                        <StarIcon className="h-8 w-8" />
                      ) : (
                        <StarIconOutline className="h-8 w-8" />
                      )}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-400 ml-2">
                  {(hoverRating || rating) === 0 && "Click to rate"}
                  {(hoverRating || rating) === 1 && "Poor"}
                  {(hoverRating || rating) === 2 && "Fair"}
                  {(hoverRating || rating) === 3 && "Good"}
                  {(hoverRating || rating) === 4 && "Very Good"}
                  {(hoverRating || rating) === 5 && "Excellent"}
                </span>
              </div>
              {rating === 0 && (
                <p className="mt-2 text-sm text-gray-400">
                  Please select a rating to share your experience
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-gray-200"
            >
              Your Review
            </label>
            <p className="mt-1 text-sm text-gray-400">
              Tell others what you think about this product
            </p>
            <textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Share your thoughts about the product..."
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/20 px-4 py-3 rounded-lg border border-red-800/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Submitting...
              </span>
            ) : (
              "Submit Review"
            )}
          </button>
        </form>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">
            Customer Reviews ({reviews.length})
          </h3>
          {user?.role === "customer" && !hasReviewed && !canReview && (
            <div className="bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-800/30">
              <p className="text-sm text-gray-400">
                <span className="text-blue-400">ℹ</span> You need to rent and
                use this product first to leave a review
              </p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review._id} className="border-b border-gray-700 pb-8">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-white">
                      {review.user.name}
                    </h4>
                    <div className="mt-1 flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon
                          key={star}
                          className={`h-5 w-5 ${
                            star <= review.rating
                              ? "text-yellow-400"
                              : "text-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <time className="text-sm text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <p className="mt-4 text-gray-300">{review.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-400">
              No reviews yet. Be the first to review this product!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
