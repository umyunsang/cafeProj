'use client';

import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import apiClient from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';

interface Review {
  id: number;
  rating: number;
  content: string | null;
  created_at: string;
  user_name: string;
}

interface ReviewListProps {
  menuId: number;
  refreshTrigger: number;
}

export default function ReviewList({ menuId, refreshTrigger }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 리뷰 목록 가져오기
  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await apiClient.get<Review[]>(`/reviews/menu/${menuId}`);
        setReviews(response);
      } catch (err) {
        console.error('리뷰 목록 가져오기 오류:', err);
        setError('리뷰를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReviews();
  }, [menuId, refreshTrigger]);

  // 별점 렌더링 함수
  const renderStars = (rating: number) => {
    return (
      <div className="flex" aria-label={`평점 ${rating}점`}>
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

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 M월 d일', { locale: ko });
    } catch (e) {
      return dateString;
    }
  };

  // 로딩 중 스켈레톤 UI
  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="리뷰 로딩 중">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4" aria-hidden="true">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full rounded-full mb-1" />
            <Skeleton className="h-4 w-3/4 rounded-full" />
          </div>
        ))}
        <span className="sr-only">리뷰 데이터를 불러오는 중입니다.</span>
      </div>
    );
  }

  // 에러 발생 시
  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-600" role="alert">
        <p>{error}</p>
      </div>
    );
  }

  // 리뷰가 없을 때
  if (reviews.length === 0) {
    return (
      <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground" role="status" aria-label="리뷰 없음">
        <p>아직 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="list" aria-label="리뷰 목록">
      {reviews.map((review) => (
        <div key={review.id} className="border rounded-lg p-4" role="listitem">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="font-medium mr-2">{review.user_name}</span>
              {renderStars(review.rating)}
            </div>
            <span className="text-sm text-muted-foreground">
              {formatDate(review.created_at)}
            </span>
          </div>
          
          {review.content && (
            <p className="text-sm mt-2">{review.content}</p>
          )}
        </div>
      ))}
    </div>
  );
} 