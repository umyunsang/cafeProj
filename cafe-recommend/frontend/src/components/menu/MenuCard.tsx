'use client';

import { Card } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
// import { Coffee } from 'lucide-react'; // Coffee 아이콘은 현재 사용되지 않음

interface MenuCardProps {
  id: number;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  className?: string;
}

export function MenuCard({
  id,
  name,
  description,
  price,
  category,
  imageUrl,
  className,
}: MenuCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  // 카드 전체 클릭 시: 장바구니에 추가
  const handleAddToCartOnClickingCard = async () => {
    // 카드 클릭은 직접적인 사용자 인터랙션이므로 e.stopPropagation() 불필요
    try {
      await addToCart(id, 1);
      toast.success(`${name}을(를) 장바구니에 추가했습니다.`);
    } catch (error) {
      console.error('장바구니 추가 오류 (카드 클릭):', error);
      toast.error(error instanceof Error ? error.message : '장바구니 추가에 실패했습니다.');
    }
  };
  
  // '상세 보기' 버튼 클릭 시: 상세 페이지로 이동
  const handleViewDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 버튼 클릭이 카드 전체의 onClick으로 전파되는 것을 방지
    router.push(`/menu/${id}`);
  };
  
  const defaultImageUrl = '/static/menu_images/default-menu.jpg';

  // 이미지 경로가 /static/menu_images/로 시작하면 그대로 사용하고, 그렇지 않으면 defaultImageUrl 사용
  const finalImageUrl = imageUrl || defaultImageUrl;

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer bg-card border-border-color flex flex-col h-full",
        className
      )}
      onClick={handleAddToCartOnClickingCard} // 카드 클릭 시 장바구니 추가 함수로 변경
    >
      {/* 이미지 영역 */}
      <div className="relative w-full h-48"> {/* 이미지 영역은 항상 존재하도록 변경 */}
        <Image 
          src={finalImageUrl} 
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={id === 1} // 첫 번째 메뉴 이미지에 priority 속성 추가 (LCP 개선)
          style={{ objectFit: 'cover' }}
          className={cn(
            "transition-transform duration-300",
            finalImageUrl !== defaultImageUrl ? "group-hover:scale-105" : "opacity-50" // 실제 이미지가 있을 때만 확대 효과, 없으면 반투명
          )}
          onError={(e) => { 
            console.log(`이미지 로드 실패: ${finalImageUrl}`);
            // src가 유효하지 않을 때 기본 이미지로 대체 (이중 안전장치)
            if (e.currentTarget.src !== defaultImageUrl) {
              e.currentTarget.src = defaultImageUrl;
            }
          }}
          unoptimized={true} // Next.js 이미지 최적화 비활성화
        />
      </div>

      <div className="p-4 space-y-2 flex flex-col flex-grow">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-card-foreground">{name}</h3>
          <div className="bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200 text-xs px-2 py-1 rounded-full">
            {category}
          </div>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 flex-grow">{description}</p>
        )}
        {!description && <div className="flex-grow"></div>} {/* 설명이 없을 때도 공간 유지 */}
        <div className="flex items-center justify-between pt-2 mt-auto">
          <span className="font-medium text-card-foreground">{price.toLocaleString()}원</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewDetailClick} // 상세 보기 함수로 변경
            className="ml-2 hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all duration-150 ease-in-out"
          >
            상세 보기 {/* 버튼 텍스트 변경 */}
          </Button>
        </div>
      </div>
    </Card>
  );
} 