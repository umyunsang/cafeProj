import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartItem {
  id: number;
  menu_id: number;
  quantity: number;
  special_requests?: string;
  menu: {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
  };
}

interface Cart {
  id: number;
  items: CartItem[];
  total_price: number;
}

interface CartContextState {
  isOpen: boolean;
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (menuId: number, quantity: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextState | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 장바구니 데이터 가져오기
  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cart', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('장바구니를 불러오는데 실패했습니다');
      const data = await response.json();
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 장바구니 데이터 가져오기
  useEffect(() => {
    fetchCart();
  }, []);

  // 장바구니 열기
  const openCart = () => setIsOpen(true);
  
  // 장바구니 닫기
  const closeCart = () => setIsOpen(false);
  
  // 장바구니에 항목 추가
  const addToCart = async (menuId: number, quantity: number) => {
    try {
      setLoading(true);
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ menu_id: menuId, quantity }),
      });
      
      if (!response.ok) throw new Error('장바구니에 추가하는데 실패했습니다');
      
      await fetchCart();
      openCart(); // 장바구니 모달 열기
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      throw err; // 에러를 상위로 전파하여 toast 메시지 표시
    } finally {
      setLoading(false);
    }
  };
  
  // 수량 업데이트
  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity }),
      });
      
      if (!response.ok) throw new Error('수량을 변경하는데 실패했습니다');
      
      await fetchCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 항목 삭제
  const removeItem = async (itemId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('항목을 삭제하는데 실패했습니다');
      
      await fetchCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 장바구니 비우기
  const clearCart = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('장바구니를 비우는데 실패했습니다');
      
      await fetchCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{
      isOpen,
      cart,
      loading,
      error,
      openCart,
      closeCart,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 