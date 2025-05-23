'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import cookieManager from '@/lib/cookies';
import { useUser } from '@/contexts/UserContext';
import apiClient from '@/lib/api-client';

// 세션 스토리지 키 상수 정의
const SESSION_ID_STORAGE_KEY = 'cafe_session_id';
const CART_STORAGE_KEY = 'cafe_cart_data';

export interface Menu {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  imageUrl?: string;
}

export interface CartItem {
  id: number;
  menu_id: number;
  quantity: number;
  special_requests?: string;
  options?: string[];
  specialInstructions?: string;
  menu: Menu;
}

interface Cart {
  id: number;
  session_id: string;
  items: CartItem[];
  total_price: number;
}

interface OrderItem {
  id: number;
  menu_id: number;
  menu_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderData {
  id: string;
  created_at: string;
  order_items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: string;
}

interface CartContextType {
  cart: Cart | null;
  items: CartItem[] | null;
  cartItems: CartItem[];
  addToCart: (menuId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  updateCartItem: (itemId: number, quantity: number) => Promise<void>;
  updateCartItemWithOptions: (itemId: number, quantity: number, options?: string[], specialInstructions?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  sessionId: string | null;
  saveOrderToHistory: (order: OrderData) => void;
  fetchCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { anonymousId } = useUser();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  // 세션 ID 초기화 함수
  const initializeSessionId = () => {
    // 1. localStorage에서 세션 ID 확인
    const storedSessionId = typeof window !== 'undefined' 
      ? localStorage.getItem(SESSION_ID_STORAGE_KEY) 
      : null;
    
    // 2. 쿠키에서 세션 ID 확인
    const cookieSessionId = cookieManager.get('cafe_session_id');
    
    // 3. anonymousId 사용 (UserContext에서 제공)
    // 우선순위: localStorage > 쿠키 > anonymousId
    const effectiveSessionId = storedSessionId || cookieSessionId || anonymousId;
    
    if (effectiveSessionId && typeof effectiveSessionId === 'string') {
      console.log('세션 ID 복원:', effectiveSessionId);
      setSessionId(effectiveSessionId);
      
      // 세션 ID를 모든 스토리지에 동기화
      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_ID_STORAGE_KEY, effectiveSessionId);
      }
      cookieManager.set('cafe_session_id', effectiveSessionId, { expires: 7 }); // 7일 유효
      
      return effectiveSessionId;
    }
    
    return null;
  };

  // 세션 ID가 없을 때만 초기화
  useEffect(() => {
    if (!sessionId) {
      initializeSessionId();
    }
  }, [anonymousId]);

  // 세션 ID가 세팅된 후에만 fetchCart 호출
  useEffect(() => {
    if (sessionId) {
      fetchCart();
    }
  }, [sessionId]);

  const fetchCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 항상 최신 sessionId 사용
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = initializeSessionId();
      }
      if (!currentSessionId) {
        const emptyCart = { id: 0, session_id: '', items: [], total_price: 0 };
        setCart(emptyCart);
        console.log('CartContext: 세션 ID가 없어 빈 장바구니로 초기화:', emptyCart);
        console.log('세션 ID가 없어 빈 장바구니를 반환합니다.');
        return;
      }

      // API 클라이언트를 통한 호출
      console.log(`세션 ID ${currentSessionId}로 장바구니 데이터를 가져옵니다.`);
      const data = await apiClient.get<Cart>('/api/cart', {
        headers: {
          'X-Session-ID': currentSessionId
        },
        useCache: false // 항상 최신 데이터 가져오기
      });
      
      console.log('장바구니 데이터 로드 성공:', data);
      
      // 서버에서 받은 데이터가 유효한지 확인
      if (data && data.session_id === currentSessionId) {
        setCart(data);
        console.log('CartContext: cart 상태 업데이트됨:', data);
        console.log('CartContext: API 응답의 total_price:', data.total_price);
        
        // 장바구니 정보를 모든 스토리지에 저장
        if (typeof window !== 'undefined') {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
        }
        cookieManager.set('cafe_cart', data);
      } else {
        console.warn('서버에서 받은 장바구니 데이터가 현재 세션과 일치하지 않습니다.');
        // 로컬 스토리지에서 복구 시도
        const storedCartData = typeof window !== 'undefined'
          ? localStorage.getItem(CART_STORAGE_KEY)
          : null;
          
        if (storedCartData) {
          try {
            const parsedCart = JSON.parse(storedCartData) as Cart;
            if (parsedCart.session_id === currentSessionId) {
              console.log('localStorage에서 장바구니 데이터 복구:', parsedCart);
              setCart(parsedCart);
            }
          } catch (parseErr) {
            console.error('localStorage 장바구니 데이터 파싱 오류:', parseErr);
          }
        }
      }
    } catch (err) {
      console.error('장바구니 조회 오류:', err);
      const emptyCartOnError = { id: 0, session_id: sessionId || '', items: [], total_price: 0 };
      setCart(emptyCartOnError);
      console.log('CartContext: 장바구니 조회 오류 시 빈 장바구니로 설정:', emptyCartOnError);
      
      // 로컬 스토리지에서 복구 시도
      const storedCartData = typeof window !== 'undefined'
        ? localStorage.getItem(CART_STORAGE_KEY)
        : null;
        
      if (storedCartData) {
        try {
          const parsedCart = JSON.parse(storedCartData) as Cart;
          if (parsedCart.session_id === sessionId) {
            console.log('장바구니 로드 실패 시 localStorage에서 복구:', parsedCart);
            setCart(parsedCart);
            return;
          }
        } catch (parseErr) {
          console.error('localStorage 장바구니 데이터 파싱 오류:', parseErr);
        }
      }
      
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (menuId: number, quantity: number): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const currentAnonymousId = anonymousId || cookieManager.getUserId();
        if (currentAnonymousId) {
          setSessionId(currentAnonymousId);
          currentSessionId = currentAnonymousId;
          
          if (typeof window !== 'undefined') {
            localStorage.setItem(SESSION_ID_STORAGE_KEY, currentAnonymousId);
          }
          cookieManager.set('cafe_session_id', currentAnonymousId, { expires: 7 });
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw new Error('세션 ID가 없습니다. 다시 시도해주세요.');
        }
      }

      const data = await apiClient.post<Cart>('/api/cart/items', {
        data: { menu_id: menuId, quantity },
        headers: {
          'X-Session-ID': currentSessionId
        }
      });
      
      console.log('장바구니 항목 추가 결과:', data);
      setCart(data);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
      }
      cookieManager.set('cafe_cart', data);
      
      setTimeout(() => {
        openCart();
        console.log('장바구니가 열렸습니다.');
      }, 100);
    } catch (err) {
      console.error('장바구니 항목 추가 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      toast.error('장바구니에 추가하는데 실패했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (itemId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!sessionId) {
        throw new Error('세션 ID가 없습니다. 다시 시도해주세요.');
      }

      const data = await apiClient.delete<Cart>(`/api/cart/items/${itemId}`, {
        headers: {
          'X-Session-ID': sessionId
        }
      });
      
      console.log('장바구니 항목 제거 결과:', data);
      setCart(data);
      
      // 스토리지 업데이트
      if (typeof window !== 'undefined') {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
      }
      cookieManager.set('cafe_cart', data);
    } catch (err) {
      console.error('장바구니 항목 제거 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      toast.error('장바구니에서 제거하는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCartItem = async (itemId: number, quantity: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!sessionId) {
        throw new Error('세션 ID가 없습니다. 다시 시도해주세요.');
      }

      // API 클라이언트를 통한 호출
      const data = await apiClient.put<Cart>(`/api/cart/items/${itemId}`, {
        data: { quantity },
        headers: {
          'X-Session-ID': sessionId
        }
      });
      
      console.log('장바구니 항목 수정 결과:', data);
      setCart(data);
      
      // 쿠키에 장바구니 정보 저장
      cookieManager.set('cafe_cart', data);
    } catch (err) {
      console.error('장바구니 항목 수정 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      toast.error('장바구니 수량 변경에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCartItemWithOptions = async (itemId: number, quantity: number, options?: string[], specialInstructions?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!sessionId) {
        throw new Error('세션 ID가 없습니다. 다시 시도해주세요.');
      }

      // 현재 장바구니 아이템 찾기
      if (!cart || !cart.items) {
        throw new Error('장바구니 정보가 없습니다.');
      }

      // API 클라이언트를 통한 호출
      const data = await apiClient.put<Cart>(`/api/cart/items/${itemId}`, {
        data: { 
          quantity,
          options: options || [],
          special_requests: specialInstructions
        },
        headers: {
          'X-Session-ID': sessionId
        }
      });
      
      console.log('장바구니 항목 옵션 수정 결과:', data);
      
      // 서버에서 응답한 데이터가 없거나 오류가 있는 경우 로컬에서 처리
      if (!data || !data.items) {
        // 현재 카트 복사
        const updatedCart = {...cart};
        
        // 해당 아이템 찾기
        const itemIndex = updatedCart.items.findIndex(item => item.id === itemId);
        if (itemIndex >= 0) {
          // 아이템 업데이트
          updatedCart.items[itemIndex] = {
            ...updatedCart.items[itemIndex],
            quantity,
            options: options || updatedCart.items[itemIndex].options,
            specialInstructions: specialInstructions || updatedCart.items[itemIndex].specialInstructions
          };
          
          setCart(updatedCart);
          // 쿠키에 장바구니 정보 저장
          cookieManager.set('cafe_cart', updatedCart);
        }
      } else {
        setCart(data);
        // 쿠키에 장바구니 정보 저장
        cookieManager.set('cafe_cart', data);
      }
    } catch (err) {
      console.error('장바구니 항목 옵션 수정 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      toast.error('장바구니 옵션 변경에 실패했습니다.');
      
      // 오류 발생 시에도 UI에서 보이는 것은 업데이트 (서버 실패의 경우 다음 동기화 시 복구)
      if (cart && cart.items) {
        const updatedCart = {...cart};
        const itemIndex = updatedCart.items.findIndex(item => item.id === itemId);
        
        if (itemIndex >= 0) {
          updatedCart.items[itemIndex] = {
            ...updatedCart.items[itemIndex],
            quantity,
            options: options || updatedCart.items[itemIndex].options,
            specialInstructions: specialInstructions || updatedCart.items[itemIndex].specialInstructions
          };
          
          setCart(updatedCart);
          cookieManager.set('cafe_cart', updatedCart);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!sessionId) {
        throw new Error('세션 ID가 없습니다. 다시 시도해주세요.');
      }

      // API 클라이언트를 통한 호출
      const data = await apiClient.delete<Cart>('/api/cart', {
        headers: {
          'X-Session-ID': sessionId
        }
      });
      
      console.log('장바구니 비우기 결과:', data);
      setCart(data);
      
      // 쿠키에서 장바구니 정보 제거
      cookieManager.remove('cafe_cart');
      
      toast.success('장바구니가 비워졌습니다.');
    } catch (err) {
      console.error('장바구니 비우기 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      toast.error('장바구니를 비우는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 주문 내역을 쿠키에 저장하는 함수
  const saveOrderToHistory = (order: OrderData) => {
    try {
      cookieManager.addOrderToHistory<OrderData>(order);
      console.log('주문 내역을 쿠키에 저장했습니다:', order.id);
    } catch (err) {
      console.error('주문 내역 저장 오류:', err);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart?.items || null,
        get cartItems() {
          return cart?.items || [];
        },
        addToCart,
        removeFromCart,
        updateCartItem,
        updateCartItemWithOptions,
        clearCart,
        isLoading,
        error,
        isOpen,
        openCart,
        closeCart,
        sessionId,
        saveOrderToHistory,
        fetchCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider; 