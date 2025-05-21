'use client';

import { useState, useEffect } from 'react';
import { MenuCard } from './MenuCard';
import { CartModal } from '../cart/CartModal';

interface Menu {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
}

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://116.124.191.174:15049';

export function MenuList() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [cart, setCart] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenus();
    fetchCart();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/menus`);
      const data = await response.json();
      setMenus(data);
    } catch (error) {
      console.error('메뉴를 불러오는 중 오류가 발생했습니다:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCart = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cart`);
      const data = await response.json();
      setCart(data);
    } catch (error) {
      console.error('장바구니를 불러오는 중 오류가 발생했습니다:', error);
    }
  };

  const handleAddToCart = async (menuId: number, quantity: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ menu_id: menuId, quantity }),
      });
      fetchCart();
      setIsCartOpen(true);
    } catch (error) {
      console.error('장바구니에 추가하는 중 오류가 발생했습니다:', error);
    }
  };

  const handleUpdateQuantity = async (itemId: number, quantity: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      });
      fetchCart();
    } catch (error) {
      console.error('수량을 변경하는 중 오류가 발생했습니다:', error);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      fetchCart();
    } catch (error) {
      console.error('항목을 삭제하는 중 오류가 발생했습니다:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {menus.map((menu) => (
          <MenuCard
            key={menu.id}
            {...menu}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>

      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemoveItem}
      />
    </>
  );
} 