export interface Cafe {
  id: string;
  name: string;
  address: string;
  description: string;
  rating: number;
  images: string[];
  openingHours: string;
  contact: string;
  tags: string[];
}

export interface Menu {
  id: string;
  cafeId: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image?: string;
  isRecommended: boolean;
}

export interface Review {
  id: string;
  cafeId: string;
  userId: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  method: string;
  createdAt: string;
}

export interface CafeRecommendationParams {
  location?: string;
  priceRange?: 'low' | 'medium' | 'high';
  atmosphere?: string[];
  purpose?: string[];
}

export interface MenuRecommendationParams {
  cafeId: string;
  preferences?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  category?: string;
} 