'use client';

import { ShoppingCart } from 'lucide-react';
import { useCart } from './CartContext';
import { Button } from '@/components/ui/button';

export function CartButton() {
  const { openCart, cart } = useCart();
  const itemCount = cart?.items.length || 0;

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