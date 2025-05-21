'use client';

import { useState, useEffect, useMemo } from 'react';
import { MenuCard } from '@/components/menu/MenuCard';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useApiGet } from '@/lib/api-hooks';
import { ErrorDisplay, NetworkError } from '@/components/ui/error';
import { fetchWithRetry } from '@/lib/network';
import { useCart } from '@/contexts/CartContext';
import apiClient from '@/lib/api-client';
import cookieManager from '@/lib/cookies';
import { v4 as uuidv4 } from 'uuid';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// 사용자 식별자 쿠키 이름
const USER_ID_COOKIE = 'cafe_user_id';

// 백엔드 API 응답 인터페이스
interface MenuApiResponse {
  id: number;
  name: string;
  price: number;
  description: string | null;
  category: string;
  image_url?: string; // 백엔드는 snake_case 사용
}

// 프론트엔드에서 사용할 인터페이스
interface Menu {
  id: number;
  name: string;
  price: number;
  description: string | null;
  category: string;
  imageUrl?: string; // 프론트엔드는 camelCase 사용
}

const SORT_OPTIONS = [
  { value: 'default', label: '기본 정렬' },
  { value: 'price_asc', label: '가격 낮은 순' },
  { value: 'price_desc', label: '가격 높은 순' },
  { value: 'name_asc', label: '이름 오름차순' },
  { value: 'name_desc', label: '이름 내림차순' },
];

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortOption, setSortOption] = useState<string>(SORT_OPTIONS[0].value);
  const { sessionId, fetchCart } = useCart();
  
  // API 캐싱을 적용한 데이터 가져오기
  const { data: menus, loading: isLoading, error, refetch } = useApiGet<MenuApiResponse[]>('/api/menus', {
    useCache: true,
    cacheTTL: 5 * 60 * 1000, // 5분 캐시
  });

  // 장바구니 세션 초기화
  useEffect(() => {
    // 초기화 상태를 추적하기 위한 플래그
    let isInitialized = false;

    const initializeCart = async () => {
      try {
        // 이미 초기화됐거나 세션 ID가 있으면 초기화 필요 없음
        if (isInitialized || sessionId) return;
        
        isInitialized = true;

        // 익명 사용자 ID 가져오기
        let anonymousId = cookieManager.getUserId();
        
        // 익명 사용자 ID가 없으면 생성
        if (!anonymousId) {
          anonymousId = `user-${uuidv4()}`;
          cookieManager.set(USER_ID_COOKIE, anonymousId, { expires: 365 });
        }
        
        if (anonymousId) {
          // 장바구니 초기화 API 호출
          const cartData = await apiClient.post('/api/cart', {
            headers: {
              'X-Session-ID': anonymousId
            }
          });
          
          console.log('장바구니 세션 초기화 완료:', anonymousId);
          
          // 장바구니 데이터를 쿠키에 저장
          if (cartData) {
            cookieManager.set('cafe_cart', cartData);
            console.log('장바구니 쿠키 저장 완료:', cartData);
          }
        }
      } catch (error) {
        console.error('장바구니 세션 초기화 오류:', error);
      }
    };

    initializeCart();
    
    // 컴포넌트 언마운트 시 클린업
    return () => {
      isInitialized = false;
    };
  }, [sessionId]); // fetchCart 의존성 제거

  // 페이지 진입 시 한 번 강제 새로고침
  useEffect(() => {
    // 현재 URL의 쿼리 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const refresh = urlParams.get('refresh');
    
    // refresh=true 쿼리 파라미터가 있으면 강제 새로고침
    if (refresh === 'true') {
      refetch();
      
      // 쿼리 파라미터 제거하기 위한 히스토리 조작
      window.history.replaceState(
        {}, 
        document.title, 
        window.location.pathname
      );
    }
  }, [refetch]);

  // 안전한 데이터 가져오기 (네트워크 오류 시 자동 재시도)
  const handleRetryFetch = async () => {
    try {
      await fetchWithRetry(refetch, 3, 2000);
    } catch (error) {
      console.error('메뉴 데이터 가져오기 실패:', error);
    }
  };

  const processedMenus = useMemo(() => {
    if (!menus) return [];

    let filtered = selectedCategory === 'all' 
      ? [...menus] // 원본 배열 수정을 피하기 위해 복사
      : menus.filter(menu => menu.category === selectedCategory);

    switch (sortOption) {
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name_asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        // 기본 정렬 시 ID 기준 오름차순 (일관된 순서 보장)
        filtered.sort((a, b) => a.id - b.id);
        break;
    }

    // 개발용 임시 이미지 주입 로직
    /*
    const devImageMap: { [key: string]: string } = {
      // 정확한 메뉴 이름으로 매핑해야 합니다. API 응답의 실제 메뉴 이름을 확인하세요.
      // 예시 이름입니다.
      '아메리카노': '/static/menu_images/dev-americano.svg',
      '카페 라떼': '/static/menu_images/dev-cafelatte.svg',
      // 필요시 다른 메뉴도 추가
    };

    const menusWithDevImages = filtered.map(menu => {
      // API에서 받아온 메뉴 이름과 정확히 일치해야 합니다.
      // 예를 들어 API 응답이 "Americano" 이면, devImageMap의 키도 "Americano"여야 합니다.
      if (devImageMap[menu.name]) {
        return { ...menu, imageUrl: devImageMap[menu.name] };
      }
      return menu;
    });
    */

    // return menusWithDevImages; // 주석 처리된 로직 대신 filtered를 직접 사용
    return filtered.map(m => ({
      ...m,
      description: m.description === null ? undefined : m.description,
      imageUrl: m.image_url // menu.image_url을 menu.imageUrl로 매핑
    }));
  }, [menus, selectedCategory, sortOption]);

  if (error) {
    // 향상된 오류 UI 표시
    const isNetworkError = error.message.includes('fetch') || 
                          error.message.includes('network') || 
                          error.message.includes('connect');
    
    if (isNetworkError) {
      return <NetworkError retry={handleRetryFetch} />;
    }
    
    return (
      <div className="container mx-auto py-8 px-4">
        <ErrorDisplay
          message="메뉴를 불러오는데 실패했습니다"
          details={error.message}
          severity="error"
          actionType="reload"
          actionText="다시 시도"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center p-4">로딩중...</div>
      </div>
    );
  }

  if (!menus || !Array.isArray(menus)) {
    return (
      <div className="container mx-auto py-8 px-4">
        <ErrorDisplay
          message="메뉴 데이터를 불러올 수 없습니다"
          details="메뉴 데이터가 비어있거나 형식이 올바르지 않습니다."
          severity="warning"
          actionType="reload"
          actionText="다시 시도"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  // 카테고리 목록 생성
  const categorySet = new Set<string>();
  menus.forEach(menu => {
    if (menu.category) categorySet.add(menu.category);
  });
  const categories = ['all', ...Array.from(categorySet)];

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">메뉴</h1>
      
      {/* 캐시 새로고침 버튼 */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => refetch()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <span className="flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1"
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" 
                clipRule="evenodd" 
              />
            </svg>
            새로고침
          </span>
        </button>
      </div>
      
      {/* 카테고리 탭 */}
      <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <motion.button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
              selectedCategory === category
                ? "bg-primary text-primary-foreground shadow-lg scale-105"
                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {category === 'all' ? '전체 보기' : category}
          </motion.button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="w-full sm:w-auto">
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="정렬 기준 선택" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">보기 방식:</span>
          <Button 
            variant={viewMode === 'card' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('card')}
            aria-label="카드 형태로 보기"
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon" 
            onClick={() => setViewMode('list')}
            aria-label="리스트 형태로 보기"
          >
            <List className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 메뉴 표시 영역: viewMode에 따라 조건부 렌더링 */}
      {processedMenus.length > 0 ? (
        viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {processedMenus.map((menu) => (
              <motion.div
                key={menu.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <MenuCard
                  id={menu.id}
                  name={menu.name}
                  price={menu.price}
                  description={menu.description || undefined}
                  category={menu.category}
                  imageUrl={menu.imageUrl}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {processedMenus.map((menu) => (
              <motion.div
                key={menu.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-4 flex items-center gap-4 bg-card border-border-color">
                  {menu.imageUrl ? (
                    <Image 
                      src={menu.imageUrl} 
                      alt={menu.name} 
                      width={64} 
                      height={64} 
                      className="rounded-md object-cover" 
                      sizes="64px"
                      unoptimized={true}
                      onError={(e) => { 
                        console.log(`리스트 뷰 이미지 로드 실패: ${menu.imageUrl}`);
                        e.currentTarget.src = '/static/menu_images/default-menu.svg'; 
                      }} 
                    />
                  ) : (
                    <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-md flex items-center justify-center">
                      <Image 
                        src="/static/menu_images/default-menu.svg" 
                        alt="Default Menu Image" 
                        width={48}
                        height={48}
                        sizes="48px"
                        unoptimized={true}
                        className="opacity-50"
                      />
                    </div>
                  )}
                  <div className="flex-grow">
                    <h3 className="font-semibold text-card-foreground">{menu.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{menu.description || '-'}</p>
                    <span className="text-sm text-card-foreground font-medium">{menu.price.toLocaleString()}원</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => { 
                    e.stopPropagation(); 
                    toast.info(`${menu.name} 장바구니 추가! (리스트뷰 임시)`); 
                  }}>담기</Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        !isLoading && (
          <div className="text-center text-muted-foreground py-8">
            해당 조건의 메뉴가 없습니다.
          </div>
        )
      )}
    </div>
  );
} 