import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

// UUID v4 생성 함수
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface Menu {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
}

interface CartItem {
  id: number;
  menu_id: number;
  quantity: number;
  special_requests?: string;
  menu: Menu;
}

interface Cart {
  id: number;
  session_id: string;
  items: CartItem[];
  total_price: number;
}

interface CartContextType {
  cart: Cart | null;
  items: CartItem[] | null;
  addToCart: (menuId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  updateCartItem: (itemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  sessionId: string | null;
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
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  useEffect(() => {
    // 컴포넌트 마운트 시 세션 ID 초기화
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = uuidv4();
      localStorage.setItem('sessionId', newSessionId);
      setSessionId(newSessionId);
    }
  }, []);

  const getSessionId = (): string => {
    if (!sessionId) {
      const newSessionId = uuidv4();
      localStorage.setItem('sessionId', newSessionId);
      setSessionId(newSessionId);
      return newSessionId;
    }
    return sessionId;
  };

  const fetchCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const currentSessionId = getSessionId();

      const response = await fetch('http://116.124.191.174:15026/api/cart', {
        headers: {
          'X-Session-ID': currentSessionId
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '장바구니를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      console.log('장바구니 데이터:', data);
      setCart(data);
    } catch (err) {
      console.error('장바구니 조회 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchCart();
    }
  }, [sessionId]);

  const addToCart = async (menuId: number, quantity: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const currentSessionId = getSessionId();

      const response = await fetch('http://116.124.191.174:15026/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': currentSessionId
        },
        credentials: 'include',
        body: JSON.stringify({ menu_id: menuId, quantity })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '장바구니에 상품을 추가하는데 실패했습니다.');
      }

      const data = await response.json();
      console.log('장바구니 항목 추가 결과:', data);
      setCart(data);
      openCart();
    } catch (err) {
      console.error('장바구니 항목 추가 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (itemId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const sessionId = getSessionId();

      const response = await fetch(`http://116.124.191.174:15026/api/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '장바구니에서 상품을 제거하는데 실패했습니다.');
      }

      const data = await response.json();
      console.log('장바구니 항목 제거 결과:', data);
      setCart(data);
    } catch (err) {
      console.error('장바구니 항목 제거 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCartItem = async (itemId: number, quantity: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const sessionId = getSessionId();

      const response = await fetch(`http://116.124.191.174:15026/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        credentials: 'include',
        body: JSON.stringify({ quantity })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '장바구니 상품 수량을 수정하는데 실패했습니다.');
      }

      const data = await response.json();
      console.log('장바구니 항목 수정 결과:', data);
      setCart(data);
    } catch (err) {
      console.error('장바구니 항목 수정 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const currentSessionId = getSessionId();
      
      if (!currentSessionId) {
        throw new Error('세션 ID가 없습니다.');
      }

      const response = await fetch('http://116.124.191.174:15026/api/cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': currentSessionId
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '알 수 없는 오류가 발생했습니다.' }));
        throw new Error(errorData.detail || '장바구니를 비우는데 실패했습니다.');
      }

      const data = await response.json();
      setCart(data);
      console.log('장바구니 비우기 성공:', data);
      
    } catch (err) {
      console.error('장바구니 비우기 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart?.items || null,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart,
        isLoading,
        error,
        isOpen,
        openCart,
        closeCart,
        sessionId
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider; 