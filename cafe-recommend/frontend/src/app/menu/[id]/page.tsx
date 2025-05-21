'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApiGet } from '@/lib/api-hooks';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { MenuCard } from '@/components/menu/MenuCard';

// API 응답을 위한 인터페이스 (백엔드 필드명 기준)
interface MenuApiResponse {
  id: number;
  name: string;
  price: number;
  description: string | null;
  category: string;
  image_url?: string; // 스네이크 케이스
  ingredients?: string[];
  allergens?: string[];
  nutritionFacts?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

// 프론트엔드에서 사용할 인터페이스 (카멜 케이스 기준)
interface MenuDetail {
  id: number;
  name: string;
  price: number;
  description: string | null;
  category: string;
  imageUrl?: string; // 카멜 케이스
  ingredients?: string[];
  allergens?: string[];
  nutritionFacts?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

// 관련 메뉴 추천 컴포넌트
const RelatedMenuItems = ({ category, currentMenuId }: { category?: string; currentMenuId: number }) => {
  const apiUrl = category 
    ? `/api/menus?category=${encodeURIComponent(category)}&exclude_id=${currentMenuId}&limit=3` 
    : `/api/menus?exclude_id=${currentMenuId}&limit=3`;

  const { data: relatedMenusFromApi, loading, error } = useApiGet<MenuApiResponse[]>(
    apiUrl,
    { useCache: true, cacheTTL: 10 * 60 * 1000 }
  );

  const relatedMenus = relatedMenusFromApi?.map(m => ({
    ...m,
    imageUrl: m.image_url,
    description: m.description === null ? undefined : m.description
  }));

  if (loading || error || !relatedMenus || relatedMenus.length === 0) {
    return null; 
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">비슷한 다른 메뉴</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedMenus.map((menu) => (
          <MenuCard 
            key={menu.id}
            id={menu.id}
            name={menu.name}
            price={menu.price}
            category={menu.category}
            description={menu.description || undefined}
            imageUrl={menu.imageUrl} // MenuCard는 imageUrl을 받음
          />
        ))}
      </div>
    </div>
  );
};

export default function MenuDetailPage({ params: pageComponentParams }: { params: { id: string } }) {
  const router = useRouter();
  const paramsFromHook = useParams<{ id: string }>();

  const menuId = parseInt(paramsFromHook.id);
  const [processedMenu, setProcessedMenu] = useState<MenuDetail | null>(null); // 가공된 메뉴 상태
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const { addToCart: addToCartContext, openCart } = useCart();
  
  const { 
    data: menuFromApi, // API 원본 데이터
    loading: isLoading, 
    error, 
    refetch 
  } = useApiGet<MenuApiResponse>(`/api/menus/${menuId}`, { // 타입을 MenuApiResponse로 변경
    useCache: true,
    cacheTTL: 5 * 60 * 1000, 
  });

  // API 데이터를 프론트엔드용으로 가공
  useEffect(() => {
    if (menuFromApi) {
      setProcessedMenu({
        ...menuFromApi,
        imageUrl: menuFromApi.image_url, // 매핑
        description: menuFromApi.description, // menuFromApi.description (string | null)을 그대로 사용
      });
    }
  }, [menuFromApi]);

  // 장바구니에 담기 함수 (processedMenu 사용)
  const addToCart = async () => {
    if (!processedMenu) return;
    
    try {
      setIsAddingToCart(true);
      await addToCartContext(processedMenu.id, 1);
      toast.success(`${processedMenu.name}이(가) 장바구니에 추가되었습니다.`);
      setTimeout(() => {
        openCart();
      }, 500); 
    } catch (error) {
      console.error('장바구니 추가 오류:', error);
      toast.error(error instanceof Error ? error.message : "장바구니에 추가하는데 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  // 에러 발생 시 자동으로 메뉴 목록으로 이동
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        router.push('/menu');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [error, router]);

  const defaultImage = '/static/menu_images/default-menu.svg';
  
  // 체크아웃 시 로딩 상태 UI
  const LoadingButton = () => (
    <div className="flex justify-center items-center h-full space-x-2">
      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>처리 중...</span>
    </div>
  );

  // 버튼 섹션 (여러 버튼 그룹화)
  const ActionButtons = () => (
    <div className="mt-6 space-y-4">
      <Button
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-100 transition-transform duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
        onClick={addToCart}
        disabled={isAddingToCart || !processedMenu} 
      >
        {isAddingToCart ? <LoadingButton /> : '장바구니에 담기'}
      </Button>
      
      <div className="flex space-x-2">
        <Button
          variant="outline"
          className="flex-1 hover:bg-secondary/10 active:bg-secondary/20 transition-colors duration-150"
          onClick={() => router.push('/menu')}
        >
          메뉴 더 보기
        </Button>
        <Button
          variant="outline"
          className="flex-1 hover:bg-secondary/10 active:bg-secondary/20 transition-colors duration-150"
          onClick={() => router.push(`/menu/${menuId}/review`)}
        >
          리뷰 보기
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4">
      {isLoading ? (
        <div className="bg-card rounded-lg shadow-lg p-6 animate-pulse">
          <div className="h-64 bg-muted rounded-md mb-4"></div>
          <div className="h-8 bg-muted rounded-md w-3/4 mb-4"></div>
          <div className="h-6 bg-muted rounded-md w-1/4 mb-6"></div>
          <div className="h-4 bg-muted rounded-md mb-2"></div>
          <div className="h-4 bg-muted rounded-md mb-2"></div>
          <div className="h-4 bg-muted rounded-md w-2/3"></div>
        </div>
      ) : error ? (
        <div className="text-center p-6 bg-red-50 text-red-600 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">메뉴를 불러오는데 실패했습니다</h2>
          <p className="mb-4">{error.message}</p>
          <p className="text-sm text-muted-foreground">3초 후 메뉴 목록으로 이동합니다...</p>
          <Button 
            onClick={() => router.push('/menu')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            메뉴 목록으로 이동
          </Button>
        </div>
      ) : !processedMenu ? (
        <div className="text-center p-6 bg-yellow-50 text-yellow-600 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">요청하신 메뉴 정보를 찾을 수 없어요.</h2>
          <p className="mb-4 text-sm text-yellow-700">다른 메뉴를 찾아보시거나, 잠시 후 다시 시도해 주세요.</p>
          <Button 
            onClick={() => refetch()}
            className="mt-4 mr-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            다시 시도
          </Button>
          <Button 
            onClick={() => router.push('/menu')}
            className="mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg"
          >
            메뉴 목록으로
          </Button>
        </div>
      ) : (
        <>
          <button 
            onClick={() => router.push('/menu')}
            className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
            aria-label="메뉴 목록으로 돌아가기"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            메뉴 목록으로 돌아가기
          </button>

          <div className="bg-card rounded-lg shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2">
                <div className="relative h-64 md:h-full">
                  <Image
                    src={processedMenu?.imageUrl || defaultImage} // processedMenu 사용
                    alt={processedMenu?.name || '메뉴 이미지'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                    unoptimized={true} // 이미지 최적화를 비활성화하여 외부 이미지 사용 가능하게 함
                    onError={(e) => {
                      console.log(`이미지 로드 실패: ${processedMenu?.imageUrl}`);
                      const target = e.target as HTMLImageElement;
                      target.src = defaultImage;
                      target.srcset = defaultImage;
                    }}
                  />
                </div>
              </div>
              
              <div className="p-6 md:w-1/2 flex flex-col">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h1 className="text-3xl font-bold mb-2 text-foreground">{processedMenu?.name}</h1>
                  <p className="text-2xl font-semibold text-primary mb-4">{processedMenu?.price.toLocaleString()}원</p>
                  
                  <Tabs defaultValue="description" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-3">
                      <TabsTrigger value="description">메뉴 설명</TabsTrigger>
                      <TabsTrigger value="ingredients">주요 성분</TabsTrigger>
                      <TabsTrigger value="nutrition">영양 정보</TabsTrigger>
                    </TabsList>
                    <TabsContent value="description">
                      <ScrollArea className="h-24 pr-3">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {processedMenu?.description || '상세 설명이 아직 준비되지 않았습니다.'}
                        </p>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="ingredients">
                      <ScrollArea className="h-24 pr-3">
                        {processedMenu?.ingredients && processedMenu.ingredients.length > 0 ? (
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {processedMenu.ingredients.map((item, index) => <li key={index}>{item}</li>)}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">주요 성분 정보가 없습니다.</p>
                        )}
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="nutrition">
                      <ScrollArea className="h-24 pr-3">
                        {processedMenu?.nutritionFacts ? (
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {processedMenu.nutritionFacts.calories && <li>칼로리: {processedMenu.nutritionFacts.calories}kcal</li>}
                            {processedMenu.nutritionFacts.protein && <li>단백질: {processedMenu.nutritionFacts.protein}g</li>}
                            {processedMenu.nutritionFacts.carbs && <li>탄수화물: {processedMenu.nutritionFacts.carbs}g</li>}
                            {processedMenu.nutritionFacts.fat && <li>지방: {processedMenu.nutritionFacts.fat}g</li>}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">영양 정보가 없습니다.</p>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </motion.div>
                <div className="mt-auto pt-6">
                  <ActionButtons />
                </div>
              </div>
            </div>
          </div>

          {processedMenu && <RelatedMenuItems category={processedMenu.category} currentMenuId={processedMenu.id} />}
        </>
      )}
    </div>
  );
} 