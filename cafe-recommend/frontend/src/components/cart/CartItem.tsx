'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';

interface CartItemProps {
  item: {
    id: number;
    menu_id: number;
    quantity: number;
    special_requests?: string;
    menu?: {
      id: number;
      name: string;
      description: string;
      price: number;
      category: string;
    };
  };
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateQuantity(item.id, newQuantity);
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    await removeItem(item.id);
  };

  // menu가 없는 경우 처리
  if (!item.menu) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className="flex gap-4 p-4 bg-white rounded-lg border"
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">메뉴 정보 없음</h3>
          <p className="text-sm text-gray-500 mt-1">
            메뉴 정보를 불러올 수 없습니다.
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-medium text-gray-900">가격 정보 없음</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleQuantityChange(item.quantity - 1)}
              >
                <Minus size={16} />
              </Button>
              <span className="w-8 text-center">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleQuantityChange(item.quantity + 1)}
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* 삭제 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-red-500"
          onClick={handleRemove}
          disabled={isRemoving}
        >
          <Trash2 size={16} />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="flex gap-4 p-4 bg-white rounded-lg border"
    >
      {/* 메뉴 정보 */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">{item.menu.name}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {item.menu.description}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-medium text-gray-900">
            {item.menu.price.toLocaleString()}원
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(item.quantity - 1)}
            >
              <Minus size={16} />
            </Button>
            <span className="w-8 text-center">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(item.quantity + 1)}
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* 삭제 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-gray-400 hover:text-red-500"
        onClick={handleRemove}
        disabled={isRemoving}
      >
        <Trash2 size={16} />
      </Button>
    </motion.div>
  );
} 