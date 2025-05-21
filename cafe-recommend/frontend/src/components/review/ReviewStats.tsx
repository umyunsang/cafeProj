'use client';

import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface ReviewStatsData {
  menu_id: number;
  avg_rating: number;
  review_count: number;
  rating_distribution: Record<string, number>;
}

interface ReviewStatsProps {
  menuId: number;
  refreshTrigger: number;
}

export default function ReviewStats({ menuId, refreshTrigger }: ReviewStatsProps) {
  const [stats, setStats] = useState<ReviewStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 리뷰 통계 가져오기
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await apiClient.get<ReviewStatsData>(`/reviews/stats/menu/${menuId}`);
        setStats(response);
      } catch (err) {
        console.error('리뷰 통계 가져오기 오류:', err);
        setError('리뷰 통계를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [menuId, refreshTrigger]);

  // 별점 렌더링 함수
  const renderStars = (rating: number) => {
    return (
      <div className="flex" aria-label={`평균 평점 ${rating.toFixed(1)}점`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`${
              rating >= star
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  };

  // 로딩 중 스켈레톤 UI
  if (loading) {
    return (
      <div className="border rounded-lg p-4 mb-6" role="status" aria-label="리뷰 통계 로딩 중">
        <Skeleton className="h-6 w-32 mb-4" aria-hidden="true" />
        <div className="flex items-center mb-4" aria-hidden="true">
          <Skeleton className="h-8 w-8 mr-2" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-full mb-2" aria-hidden="true" />
        <Skeleton className="h-4 w-full mb-2" aria-hidden="true" />
        <Skeleton className="h-4 w-full mb-2" aria-hidden="true" />
        <Skeleton className="h-4 w-full mb-2" aria-hidden="true" />
        <Skeleton className="h-4 w-full mb-2" aria-hidden="true" />
        <span className="sr-only">리뷰 통계 데이터를 불러오는 중입니다.</span>
      </div>
    );
  }

  // 에러 발생 시
  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-600 mb-6" role="alert">
        <p>{error}</p>
      </div>
    );
  }

  // 리뷰가 없을 때
  if (!stats || stats.review_count === 0) {
    return (
      <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground mb-6" role="status" aria-label="리뷰 통계 없음">
        <p>아직 리뷰가 없습니다.</p>
      </div>
    );
  }

  // 최대 평점 수 계산 (분포 그래프 최대값)
  const maxRatingCount = Math.max(...Object.values(stats.rating_distribution));

  return (
    <div className="border rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold mb-4">리뷰 요약</h3>
      
      <div className="flex items-center mb-6">
        <div className="mr-4">
          <span className="text-3xl font-bold">{stats.avg_rating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground"> / 5</span>
        </div>
        <div>
          <div className="mb-1">{renderStars(stats.avg_rating)}</div>
          <p className="text-sm text-muted-foreground">{stats.review_count}개의 리뷰</p>
        </div>
      </div>
      
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = stats.rating_distribution[rating.toString()] || 0;
          const percentage = stats.review_count > 0 
            ? Math.round((count / stats.review_count) * 100) 
            : 0;
            
          return (
            <div key={rating} className="flex items-center">
              <span className="text-sm w-6">{rating}</span>
              <Star 
                size={14} 
                className="mr-2 fill-yellow-400 text-yellow-400" 
                aria-hidden="true"
              />
              <Progress 
                value={percentage} 
                className="h-2 flex-1 mr-2"
                aria-label={`${rating}점 리뷰: ${count}개 (${percentage}%)`}
              />
              <span className="text-sm text-muted-foreground w-10">{count}개</span>
            </div>
          );
        })}
      </div>
    </div>
  );
} 