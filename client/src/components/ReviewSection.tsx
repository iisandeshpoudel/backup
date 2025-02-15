import { useState } from "react";
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

      {user?.role === "vendor" && (
        <p className="mt-4 text-sm text-gray-400">
          Vendors cannot submit reviews. Only customers can review products.
        </p>
      )}

      {canReview && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200">
              Rating
            </label>
            <div className="mt-1 flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-yellow-400 hover:text-yellow-300 focus:outline-none"
                >
                  {star <= rating ? (
                    <StarIcon className="h-6 w-6" />
                  ) : (
                    <StarIconOutline className="h-6 w-6" />
                  )}
                </button>
              ))}
            </div>
            {rating === 0 && (
              <p className="mt-1 text-sm text-gray-400">
                Please select a rating before submitting
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-gray-200"
            >
              Review
            </label>
            <textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Write your review..."
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      <div className="mt-8 space-y-8">
        {reviews.map((review) => (
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
        ))}
      </div>
    </div>
  );
}
