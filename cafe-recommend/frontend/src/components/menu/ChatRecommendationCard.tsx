'use client';

import { Card } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ChatRecommendationCardProps {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  className?: string;
  shortDescription?: string; 
}

export function ChatRecommendationCard({
  id,
  name,
  price,
  imageUrl,
  className,
  shortDescription,
}: ChatRecommendationCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await addToCart(id, 1);
      toast.success(`${name}을(를) 장바구니에 추가했습니다.`);
    } catch (error) {
      console.error('장바구니 추가 오류:', error);
      toast.error(error instanceof Error ? error.message : '장바구니 추가에 실패했습니다.');
    }
  };

  const handleViewDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/menu/${id}`);
  };
  
  const defaultImageUrl = '/static/menu_images/default-menu.svg';

  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-lg cursor-pointer bg-card border-border flex flex-row items-center p-2 hover:bg-muted/50",
        className
      )}
      onClick={handleViewDetail}
    >
      <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
        <Image 
          src={imageUrl || defaultImageUrl}
          alt={name}
          fill
          style={{ objectFit: 'cover' }}
          className={cn(
            "transition-transform duration-300",
            imageUrl ? "group-hover:scale-105" : "opacity-70"
          )}
          onError={(e) => { 
            if (e.currentTarget.src !== defaultImageUrl) {
              e.currentTarget.src = defaultImageUrl;
            }
          }}
          sizes="80px"
        />
      </div>

      <div className="flex-grow flex flex-col pl-3 min-w-0">
        <h3 className="font-semibold text-sm truncate" title={name}>{name}</h3>
        <span className="text-xs font-medium mt-1">{price.toLocaleString()}원</span>
      </div>

      <div className="ml-2 flex-shrink-0">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleAddToCart}
          className="px-2.5 py-1 text-xs h-auto"
        >
          담기
        </Button>
      </div>
    </Card>
  );
} 