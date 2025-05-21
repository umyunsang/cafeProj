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
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  isRecommended?: boolean;
  allergens?: string[];
  calories?: number;
  is_available?: boolean;
  cafeId?: string;
}

export interface Review {
  id: string;
  menuId?: number;
  cafeId?: string;
  userId: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  images?: string[];
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  method: string;
  createdAt: string;
  paymentDetails?: Record<string, any>;
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

export interface Order {
  id: string;
  userId?: string;
  sessionId?: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  paymentId?: string;
  pickupTime?: string;
  customer?: Customer;
}

export interface OrderItem {
  id?: string;
  menuId: number;
  menuName: string;
  quantity: number;
  price: number;
  options?: OrderItemOption[];
}

export interface OrderItemOption {
  name: string;
  value: string;
  price?: number;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'completed' 
  | 'cancelled';

export interface Customer {
  name: string;
  phone: string;
  email?: string;
}

// 채팅 관련 타입 정의
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface RecommendedMenu {
  id: number;
  name: string;
  description: string | undefined;
  price: number;
  category?: string;
  imageUrl?: string;
}

// API에서 실제로 오는 추천 메뉴 항목 타입
interface ApiRecommendedMenuItem {
  id: number;
  name: string;
  description: string | null; // API는 null을 보낼 수 있음
  price: number;
  category?: string;
  image_url?: string; // API는 image_url로 보냄
}

export interface ChatApiResponse {
  response_sentences: string[];
  recommendations: ApiRecommendedMenuItem[]; // RecommendedMenu[]에서 변경
  session_id: string;
  message_type: ChatMessageType;
}

export type ChatMessageType = 
  | 'menu_recommendation' 
  | 'customer_service' 
  | 'order_info' 
  | 'error';

// 사용자 컨텍스트 관련 타입
export interface UserContext {
  sessionId: string | null;
  preferences: UserPreferences;
  orderHistory: string[];
  favorites: number[];
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  favoriteCategories?: string[];
  dietaryRestrictions?: string[];
} 