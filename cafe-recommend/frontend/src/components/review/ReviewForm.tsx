'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, SendHorizontal } from "lucide-react";
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface ReviewFormProps {
  menuId: number;
  onReviewAdded: () => void;
}

export default function ReviewForm({ menuId, onReviewAdded }: ReviewFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 별점 클릭 핸들러
  const handleStarClick = (selectedRating: number) => {
    setRating(selectedRating);
  };

  // 별점 호버 핸들러
  const handleStarHover = (hoveredRating: number) => {
    setHoverRating(hoveredRating);
  };

  // 리뷰 내용 변경 핸들러
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error("별점을 선택해주세요");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      await apiClient.post('/reviews', {
        data: {
          menu_id: menuId,
          rating,
          content: content.trim() || null
        }
      });
      
      // 성공 메시지 표시
      toast.success("리뷰가 등록되었습니다", {
        description: "소중한 의견 감사합니다.",
      });
      
      // 폼 초기화
      setRating(0);
      setContent('');
      
      // 부모 컴포넌트에 알림
      onReviewAdded();
      
    } catch (error) {
      console.error('리뷰 등록 오류:', error);
      toast.error("리뷰 등록 실패", {
        description: "다시 시도해주세요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2">리뷰 작성</h3>
      
      <form onSubmit={handleSubmit}>
        {/* 별점 선택 */}
        <div className="flex items-center mb-4" role="group" aria-labelledby="rating-label">
          <span id="rating-label" className="text-sm mr-2">평점:</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1"
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => handleStarHover(star)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${star}점 평가하기`}
                aria-pressed={rating === star}
              >
                <Star
                  size={20}
                  className={`${
                    (hoverRating || rating) >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          <span className="ml-2 text-sm">
            {rating > 0 ? `${rating}점` : '별점을 선택해주세요'}
          </span>
        </div>
        
        {/* 리뷰 내용 */}
        <div className="mb-4">
          <label htmlFor="review-content" className="sr-only">리뷰 내용</label>
          <Textarea
            id="review-content"
            placeholder="메뉴에 대한 리뷰를 작성해주세요."
            value={content}
            onChange={handleContentChange}
            className="min-h-[100px]"
            aria-required="false"
          />
        </div>
        
        {/* 제출 버튼 */}
        <Button 
          type="submit" 
          className="w-full"
          disabled={rating === 0 || isSubmitting}
          aria-label="리뷰 등록하기"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <title>로딩 중</title>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              처리 중...
            </span>
          ) : (
            <span className="flex items-center">
              <SendHorizontal size={16} className="mr-2" aria-hidden="true" />
              리뷰 등록하기
            </span>
          )}
        </Button>
      </form>
    </div>
  );
} 