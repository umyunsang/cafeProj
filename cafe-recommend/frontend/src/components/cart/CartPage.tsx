'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, error, loading } = useCart();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  const calculateSubtotal = () => {
    if (!items) return 0;
    return items.reduce((total, item) => {
      const priceWithoutTax = Math.round(item.price / 1.1); // 세금 제외 가격
      return total + (priceWithoutTax * item.quantity);
    }, 0);
  };

  const calculateTax = () => {
    return Math.round(calculateSubtotal() * 0.1);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        장바구니
      </h1>
      {items && items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <motion.div
              key={item.menu_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="transition-all duration-300"
            >
              <Card className="p-6 backdrop-blur-lg bg-white/80 dark:bg-gray-800/80">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.round(item.price / 1.1).toLocaleString()}원 x {item.quantity} = {(Math.round(item.price / 1.1) * item.quantity).toLocaleString()}원
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.menu_id, item.quantity - 1)}
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
                        onClick={() => updateQuantity(item.menu_id, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(item.menu_id)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
          <div className="mt-8 space-y-4">
            <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">소계</span>
                <span className="text-gray-900 dark:text-gray-100">{calculateSubtotal().toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">세금 (10%)</span>
                <span className="text-gray-900 dark:text-gray-100">{calculateTax().toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-lg font-semibold">총계</span>
                <span className="text-xl font-bold">{calculateTotal().toLocaleString()}원</span>
              </div>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push('/checkout')}
            >
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