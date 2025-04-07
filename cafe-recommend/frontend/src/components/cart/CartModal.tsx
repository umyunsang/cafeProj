'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';

export function CartModal() {
  const router = useRouter();
  const { items, isOpen, closeCart, updateCartItem, removeItem, error, loading } = useCart();
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // 스크롤 방지
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = ''; // 스크롤 복원
    };
  }, [isOpen, closeCart]);

  // 오버레이 클릭 시 모달 닫기
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeCart();
  };

  const calculateSubtotal = () => {
    if (!items) return 0;
    return items.reduce((total, item) => {
      return total + (item.menu.price * item.quantity);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleOverlayClick}
          />

          {/* 모달 */}
          <motion.div
            ref={modalRef}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">장바구니</h2>
              <button
                onClick={closeCart}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="장바구니 닫기"
              >
                <X size={20} />
              </button>
            </div>

            {/* 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center p-4">{error}</div>
              ) : !items || items.length === 0 ? (
                <div className="text-center text-gray-500 p-4">
                  장바구니가 비어있습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <Card key={`${item.menu_id}-${item.id}`} className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold">{item.menu.name}</h3>
                          <p className="text-sm text-gray-500">
                            {item.menu.price.toLocaleString()}원 x {item.quantity} = {(item.menu.price * item.quantity).toLocaleString()}원
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 border rounded-md">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartItem(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartItem(item.id, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 bg-red-500 hover:bg-red-600 text-white"
                            onClick={() => removeItem(item.id)}
                            aria-label="항목 삭제"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* 푸터 */}
            {items && items.length > 0 && (
              <div className="border-t p-4">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">소계</span>
                    <span>{calculateSubtotal().toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold">총계</span>
                    <span className="font-bold">{calculateTotal().toLocaleString()}원</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    closeCart();
                    router.push('/checkout');
                  }}
                >
                  주문하기
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 