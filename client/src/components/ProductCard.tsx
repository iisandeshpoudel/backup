import { Link } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/20/solid';
import { Product } from '../types/product';
import { getImageUrl } from '../utils/imageUrl';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group relative bg-gray-900 rounded-lg shadow-md overflow-hidden">
      <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-t-lg bg-gray-800">
        <img
          src={getImageUrl(product.images[0]?.url)}
          alt={product.title}
          className="h-full w-full object-cover object-center group-hover:opacity-75 transition-opacity duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder-product.jpg';
          }}
        />
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium text-gray-200">
              <Link to={`/products/${product._id}`}>
                <span aria-hidden="true" className="absolute inset-0" />
                {product.title}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-gray-400">{product.category}</p>
          </div>
          <div className="flex items-center">
            <StarIcon className="h-5 w-5 text-yellow-400" />
            <span className="ml-1 text-sm text-gray-400">
              {product.ratings.average.toFixed(1)} ({product.ratings.count})
            </span>
          </div>
        </div>
        
        <div className="mt-3">
          <p className="text-lg font-medium text-gray-200">
            Rs. {product.pricing.perDay}/day
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
            {product.condition}
          </span>
          <span className="text-sm text-gray-400">{product.location}</span>
        </div>

        {!product.availability.isAvailable && (
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
              Currently Unavailable
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 