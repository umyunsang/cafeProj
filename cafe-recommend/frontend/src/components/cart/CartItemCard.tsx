'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus } from 'lucide-react';
import type { CartItem } from '@/contexts/CartContext';

interface CartItemCardProps {
  item: CartItem;
  onQuantityChange: (itemId: number, newQuantity: number) => void;
  onRemove: (itemId: number) => void;
  isLoading?: boolean;
}

export function CartItemCard({ item, onQuantityChange, onRemove, isLoading }: CartItemCardProps) {
  const { menu, quantity, id: cartItemId, options, specialInstructions } = item;

  return (
    <div className="flex items-start gap-3 p-3 bg-transparent dark:bg-transparent rounded-lg border border-slate-200 dark:border-slate-700/50 text-slate-800 dark:text-slate-100">
      {/* 이미지 표시 부분 제거
      <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0">
        <Image
          src={menu.imageUrl || '/images/placeholder-image.svg'} 
          alt={menu.name}
          fill
          sizes="64px"
          className="object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.srcset = '/images/placeholder-image.svg';
            target.src = '/images/placeholder-image.svg';
          }}
        />
      </div>
      */}
      <div className="flex-grow">
        <h3 className="font-semibold text-sm sm:text-base">{menu.name}</h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          {menu.price.toLocaleString()}원
        </p>
        {options && options.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">옵션: {options.join(', ')}</p>
        )}
        {specialInstructions && (
           <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[120px] sm:max-w-[150px]" title={specialInstructions}>
             요청: {specialInstructions}
           </p>
        )}
        <div className="flex items-center gap-1 mt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={() => onQuantityChange(cartItemId, quantity - 1)}
            disabled={isLoading || quantity <= 0} 
          >
            <Minus size={12} />
          </Button>
          <span className="w-7 text-center tabular-nums text-xs sm:text-sm">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={() => onQuantityChange(cartItemId, quantity + 1)}
            disabled={isLoading}
          >
            <Plus size={12} />
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 h-6 w-6 shrink-0 self-start"
        onClick={() => onRemove(cartItemId)}
        disabled={isLoading}
        aria-label="장바구니에서 삭제"
      >
        <Trash2 size={12} />
      </Button>
    </div>
  );
} 