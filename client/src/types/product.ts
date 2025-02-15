export interface Product {
  _id: string;
  title: string;
  description: string;
  category: 'Electronics' | 'Furniture' | 'Sports' | 'Tools' | 'Vehicles' | 'Others';
  condition: 'New' | 'Like New' | 'Good' | 'Fair';
  pricing: {
    perDay: number;
    perWeek: number;
    perMonth: number;
    securityDeposit: number;
  };
  images: {
    url: string;
    filename?: string;
  }[];
  location: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  availability: {
    isAvailable: boolean;
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
    createdAt: Date;
  }[];
  createdAt?: string;
  updatedAt?: string;
} 