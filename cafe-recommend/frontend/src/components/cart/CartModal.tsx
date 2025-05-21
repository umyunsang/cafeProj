'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { useFocusTrap } from '@/lib/keyboard-navigation';
import { cn } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { Coffee } from 'lucide-react';

export function CartModal() {
  const router = useRouter();
  const { items, isOpen, closeCart, updateCartItem, removeFromCart, error, loading: isLoading } = useCart();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  // 포커스 트랩 적용
  useFocusTrap(modalRef, isOpen, closeButtonRef);
  
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // 스크롤 방지
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
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

  if (!isOpen) return null;

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
            className="fixed inset-0 bg-black/60 dark:bg-black/70 z-40 backdrop-blur-sm"
            onClick={handleOverlayClick}
            aria-hidden="true"
          />

          {/* 모달 */}
          <motion.div
            ref={modalRef}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[color:var(--card)] shadow-xl z-50 flex flex-col border-l border-[color:var(--border-color)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(event, info) => {
              const modalWidth = modalRef.current?.offsetWidth || 448; // md (448px)
              if (info.offset.x > modalWidth / 3 && info.velocity.x > 20) {
                closeCart();
              } else {
                // 사용자가 놓았을 때 원래 위치로 돌아가도록 애니메이션을 추가할 수 있지만,
                // framer-motion의 dragConstraints와 기본 동작으로도 어느정도 처리됨.
                // 필요시 motion값을 직접 제어.
              }
            }}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-[color:var(--border-color)]">
              <h2 id="cart-title" className="text-lg font-semibold text-[color:var(--card-foreground)]">장바구니</h2>
              <Button
                ref={closeButtonRef}
                variant="ghost"
                size="icon"
                onClick={closeCart}
                className="text-muted-foreground hover:text-accent-foreground"
                aria-label="장바구니 닫기"
              >
                <X size={20} />
              </Button>
            </div>

            {/* 내용 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : error ? (
                <div className="text-center p-4 text-destructive">
                  <p className="font-medium">오류 발생</p>
                  <p className="text-sm">{error}</p>
                </div>
              ) : !items || items.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 px-6">
                  <ShoppingBag className="mx-auto h-16 w-16 text-neutral-400 mb-4" strokeWidth={1.5} />
                  <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">장바구니가 비어있습니다.</h3>
                  <p className="text-sm mb-6">마음에 드는 메뉴를 담아보세요!</p>
                  <Button variant="outline" onClick={closeCart}>계속 쇼핑하기</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <Card key={`${item.menu_id}-${item.id}`} className="p-3 sm:p-4 bg-background dark:bg-neutral-800/50 border-[color:var(--border-color)]">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          {item.menu.imageUrl ? (
                            <Image 
                              src={item.menu.imageUrl}
                              alt={item.menu.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 64px, 80px"
                              onError={(e) => { e.currentTarget.src = '/static/menu_images/default-menu.jpg'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-200 dark:bg-neutral-700">
                              <Coffee className="w-8 h-8 text-neutral-400 dark:text-neutral-600" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-foreground truncate mb-0.5 sm:mb-1">{item.menu.name}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5">
                            {item.menu.price.toLocaleString()}원 x {item.quantity}
                          </p>
                          <p className="text-sm sm:text-base font-medium text-foreground">{(item.menu.price * item.quantity).toLocaleString()}원</p>
                        </div>

                        <div className="flex flex-col items-end gap-2 ml-auto">
                          <div className="flex items-center border border-[color:var(--input-border)] rounded-md">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary-600 rounded-r-none"
                              onClick={() => updateCartItem(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label={`${item.menu.name} 수량 감소`}
                            >
                              <Minus size={16} />
                            </Button>
                            <span className="w-7 sm:w-8 text-center text-sm font-medium text-foreground border-l border-r border-[color:var(--input-border)] flex items-center justify-center h-7 sm:h-8">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary-600 rounded-l-none"
                              onClick={() => updateCartItem(item.id, item.quantity + 1)}
                              aria-label={`${item.menu.name} 수량 증가`}
                            >
                              <Plus size={16} />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:bg-destructive/10 rounded-md"
                            onClick={() => removeFromCart(item.id)}
                            aria-label={`${item.menu.name} 삭제`}
                          >
                            <Trash2 size={16} />
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
              <div className="border-t border-[color:var(--border-color)] p-4 sm:p-6 bg-neutral-50 dark:bg-neutral-900/50">
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">소계</span>
                    <span className="text-foreground">{calculateSubtotal().toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between items-center text-base pt-1 border-t border-dashed border-[color:var(--border-color)] mt-1">
                    <span className="font-semibold text-foreground">총계</span>
                    <span className="font-bold text-lg text-foreground">{calculateTotal().toLocaleString()}원</span>
                  </div>
                </div>
                <div className="space-y-3 mt-5">
                  <Button asChild size="lg" className="w-full">
                    <Link href="/checkout" onClick={closeCart}>
                      결제하기 ({items.reduce((acc, item) => acc + item.quantity, 0)}개)
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="lg"
                    onClick={closeCart}
                  >
                    계속 쇼핑하기
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 