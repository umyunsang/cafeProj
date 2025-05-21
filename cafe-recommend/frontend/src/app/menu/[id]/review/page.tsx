'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewForm, ReviewList, ReviewStats } from '@/components/review';
import { useApiGet } from '@/lib/api-hooks';

interface MenuDetail {
  id: number;
  name: string;
  category: string;
}

export default function MenuReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const menuId = parseInt(params.id);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // 메뉴 정보 가져오기
  const { data: menu, loading, error } = useApiGet<MenuDetail>(`/api/menus/${menuId}`, { 
    useCache: true 
  });

  // 리뷰 목록 새로고침 함수
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 에러 발생 시 메뉴 목록으로 리다이렉트
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        router.push('/menu');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [error, router]);

  // 로딩 중일 때
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse" role="status" aria-label="로딩 중">
          <div className="h-8 bg-muted rounded-md w-1/3 mb-4" aria-hidden="true"></div>
          <div className="h-12 bg-muted rounded-md w-2/3 mb-8" aria-hidden="true"></div>
          <div className="h-64 bg-muted rounded-md" aria-hidden="true"></div>
          <span className="sr-only">메뉴 정보를 불러오는 중입니다...</span>
        </div>
      </div>
    );
  }

  // 에러 발생 시
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center p-6 bg-red-50 text-red-600 rounded-lg" role="alert">
          <h2 className="text-xl font-semibold mb-2">메뉴를 불러오는데 실패했습니다</h2>
          <p className="mb-4">{error.message}</p>
          <p className="text-sm text-muted-foreground">3초 후 메뉴 목록으로 이동합니다...</p>
          <Button 
            onClick={() => router.push('/menu')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            aria-label="메뉴 목록으로 바로 이동"
          >
            메뉴 목록으로 이동
          </Button>
        </div>
      </div>
    );
  }

  // 메뉴 정보가 없는 경우
  if (!menu) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center p-6 bg-yellow-50 text-yellow-600 rounded-lg" role="alert">
          <h2 className="text-xl font-semibold mb-2">메뉴 정보를 찾을 수 없습니다</h2>
          <Button 
            onClick={() => router.push('/menu')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            aria-label="메뉴 목록으로 이동"
          >
            메뉴 목록으로 이동
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button 
        variant="ghost" 
        className="flex items-center space-x-2 mb-4" 
        onClick={() => router.push(`/menu/${menuId}`)}
        aria-label="메뉴 상세로 돌아가기"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>메뉴 상세로 돌아가기</span>
      </Button>

      <h1 className="text-3xl font-bold mb-2">{menu.name} 리뷰</h1>
      <p className="text-muted-foreground mb-6">{menu.category}</p>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full mb-6" aria-label="리뷰 탭">
          <TabsTrigger value="all" className="flex-1" aria-label="모든 리뷰 보기">모든 리뷰</TabsTrigger>
          <TabsTrigger value="write" className="flex-1" aria-label="리뷰 작성하기">리뷰 작성</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <ReviewStats menuId={menuId} refreshTrigger={refreshTrigger} />
          <h3 className="text-xl font-semibold mb-4">고객 리뷰</h3>
          <ReviewList menuId={menuId} refreshTrigger={refreshTrigger} />
        </TabsContent>
        
        <TabsContent value="write">
          <h3 className="text-xl font-semibold mb-4">리뷰 작성하기</h3>
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <strong>{menu.name}</strong>에 대한 솔직한 리뷰를 남겨주세요. 
              여러분의 의견은 저희 카페 발전에 큰 도움이 됩니다.
            </p>
          </div>
          <ReviewForm menuId={menuId} onReviewAdded={handleRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 