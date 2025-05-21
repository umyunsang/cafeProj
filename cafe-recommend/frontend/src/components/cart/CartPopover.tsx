'use client';

import React from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Button } from '@/components/ui/button';
import { ShoppingCartIcon, XIcon } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { CartItemCard } from './CartItemCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CartPopoverProps {
  theme: 'light' | 'dark';
}

export function CartPopover({ theme }: CartPopoverProps) {
  const { 
    cartItems, 
    removeFromCart, 
    updateCartItem, 
    isLoading, 
    isOpen,
    openCart,
    closeCart,
    // cart // cart 객체 직접 사용 대신 cartItems로 계산
  } = useCart();

  // cartItems를 기반으로 총액 직접 계산
  const totalAmount = cartItems.reduce((sum, item) => {
    const price = typeof item.menu?.price === 'number' ? item.menu.price : 0;
    const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
    return sum + (price * quantity);
  }, 0);
  
  const cartItemCount = cartItems.length;

  const popoverBackgroundColor = theme === 'light' ? 'white' : '#212121'; // --neutral-900

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
    } else {
      updateCartItem(itemId, newQuantity);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={(openState) => openState ? openCart() : closeCart()}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative rounded-full"
          aria-label="장바구니 열기"
        >
          <ShoppingCartIcon className="h-5 w-5" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 sm:w-96 p-0 shadow-xl border-border-color rounded-xl overflow-hidden"
        align="end"
        sideOffset={8}
        style={{ backgroundColor: popoverBackgroundColor }}
      >
        <div className="flex items-center justify-between p-4 border-b"
             style={{ borderColor: theme === 'light' ? '#E0E0E0' : '#616161' }}
        >
          <h4 className="text-lg font-semibold">장바구니</h4>
          <PopoverPrimitive.Close asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <XIcon size={18} />
              <span className="sr-only">닫기</span>
            </Button>
          </PopoverPrimitive.Close>
        </div>

        {isLoading && <div className="p-6 text-center text-sm text-muted-foreground">장바구니를 불러오는 중...</div>}
        
        {!isLoading && cartItemCount === 0 ? (
          <div className="p-6 text-center">
            <ShoppingCartIcon size={36} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">장바구니가 비어있습니다.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(100vh_-_250px)] sm:max-h-[400px] bg-white dark:bg-neutral-900"> {/* 반응형 높이 조절 및 배경색 명시 */}
            <div className="space-y-3 p-4 bg-white dark:bg-neutral-900"> {/* ScrollArea 내부 div에도 배경색 명시 */}
              {cartItems.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  onRemove={removeFromCart}
                  isLoading={isLoading}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {cartItemCount > 0 && (
          <div className="p-4 border-t"
               style={{ 
                 borderColor: theme === 'light' ? '#E0E0E0' : '#616161',
                 backgroundColor: theme === 'light' ? '#F5F5F5' : 'rgba(33, 33, 33, 0.3)'
               }}
          > {/* 푸터 배경 살짝 추가 */}
            <div className="flex justify-between text-md font-semibold mb-3">
              <span>총 주문 금액</span>
              <span>{totalAmount.toLocaleString()}원</span>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                size="default" 
                className={cn(
                  "w-full transition-opacity hover:opacity-90",
                  theme === 'light' 
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary-600 dark:bg-primary-500 text-primary-foreground" // 다크모드 primary 배경 및 밝은 텍스트 유지
                )}
                asChild
                onClick={closeCart} // Link 클릭 시 팝오버 닫기
              >
                <Link href="/checkout">결제하기 ({cartItemCount}개)</Link>
              </Button>
              <Button 
                variant="outline" 
                size="default" 
                className={cn(
                  "w-full",
                  theme === 'light'
                    ? "text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                    : "text-neutral-200 border-neutral-700 hover:bg-neutral-800" // 다크모드 텍스트 및 테두리, 호버 배경
                )}
                asChild
                onClick={closeCart} // Link 클릭 시 팝오버 닫기
              >
                <Link href="/cart">전체 장바구니 보기</Link>
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
} 