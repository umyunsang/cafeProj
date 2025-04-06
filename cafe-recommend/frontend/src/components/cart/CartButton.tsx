'use client';

import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';

export function CartButton() {
  const { items, loading, openCart } = useCart();
  
  // 로딩 중이거나 items가 null인 경우
  if (loading || !items) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={openCart}
        aria-label="장바구니 열기"
      >
        <ShoppingCart className="h-5 w-5" />
      </Button>
    );
  }

  const itemCount = items.length;
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={openCart}
      aria-label="장바구니 열기"
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </Button>
  );
} 