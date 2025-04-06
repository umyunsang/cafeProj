'use client';

import { Card } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface MenuCardProps {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  className?: string;
}

export function MenuCard({
  id,
  name,
  description,
  price,
  category,
  className,
}: MenuCardProps) {
  const { addToCart } = useCart();

  const handleCardClick = async () => {
    try {
      await addToCart(id, 1);
      toast.success(`${name}이(가) 장바구니에 추가되었습니다.`);
    } catch (error) {
      toast.error('장바구니에 추가하는데 실패했습니다.');
    }
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer",
        className
      )}
      onClick={handleCardClick}
    >
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{name}</h3>
          <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
            {category}
          </div>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
        <div className="flex items-center justify-between pt-2">
          <span className="font-medium">{price.toLocaleString()}원</span>
        </div>
      </div>
    </Card>
  );
} 