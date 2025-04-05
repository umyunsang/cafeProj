'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface CartItem {
  id: number;
  menu_id: number;
  quantity: number;
  special_requests: string | null;
  cart_id: number;
  created_at: string;
  updated_at: string | null;
}

interface Cart {
  session_id: string;
  id: number;
  created_at: string;
  updated_at: string | null;
  items: CartItem[];
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await fetch('http://localhost:15026/api/cart');
      const data = await response.json();
      setCart(data);
    } catch (error) {
      console.error('장바구니를 불러오는 중 오류가 발생했습니다:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      await fetch(`http://localhost:15026/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      });
      fetchCart();
    } catch (error) {
      console.error('수량 변경 중 오류가 발생했습니다:', error);
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await fetch(`http://localhost:15026/api/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      fetchCart();
    } catch (error) {
      console.error('항목 삭제 중 오류가 발생했습니다:', error);
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        장바구니
      </h1>
      {cart && cart.items.length > 0 ? (
        <div className="space-y-4">
          {cart.items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="transition-all duration-300"
            >
              <Card className="p-6 backdrop-blur-lg bg-white/80 dark:bg-gray-800/80">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      메뉴 {item.menu_id}
                    </h3>
                    {item.special_requests && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        요청사항: {item.special_requests}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </Button>
                      <span className="text-lg font-semibold w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
          <div className="mt-8">
            <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              주문하기
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            장바구니가 비어있습니다.
          </p>
        </div>
      )}
    </div>
  );
} 