'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WelcomeGuideProps {
  title?: string;
  description?: string;
  ctaText?: string;
  storageKey?: string;
  onCta?: () => void;
  onDismiss?: () => void;
  className?: string;
  autoShow?: boolean;
  showDelay?: number;
  forceShow?: boolean;
}

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({
  title = '환영합니다!',
  description = '카페 추천 시스템에 오신 것을 환영합니다! 당신에게 맞는 커피와 디저트를 추천해 드립니다.',
  ctaText = '시작하기',
  storageKey = 'welcome-guide-shown',
  onCta,
  onDismiss,
  className = '',
  autoShow = true,
  showDelay = 1000,
  forceShow = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  // 로컬 스토리지를 통해 환영 가이드 표시 여부 결정
  useEffect(() => {
    const isShown = localStorage.getItem(storageKey) === 'true';
    setHasBeenShown(isShown);
    
    // 자동 표시 설정이고 아직 표시되지 않았으면 표시
    if (autoShow && !isShown || forceShow) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, showDelay);
      
      return () => clearTimeout(timer);
    }
  }, [storageKey, autoShow, showDelay, forceShow]);

  // CTA 버튼 클릭 시
  const handleCta = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
    setHasBeenShown(true);
    
    if (onCta) {
      onCta();
    }
  };

  // 닫기 버튼 클릭 시
  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
    setHasBeenShown(true);
    
    if (onDismiss) {
      onDismiss();
    }
  };

  // 이미 표시되었거나 표시되지 않아야 하면 아무것도 렌더링하지 않음
  if (!isVisible || (hasBeenShown && !forceShow)) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300"
      role="dialog"
      aria-labelledby="welcome-guide-title"
      aria-modal="true"
    >
      <div 
        className={cn(
          "bg-white rounded-lg shadow-xl p-6 max-w-md mx-4 animate-in fade-in-50 zoom-in-90 duration-300",
          className
        )}
      >
        <div className="flex justify-between items-start">
          <h2 
            id="welcome-guide-title"
            className="text-2xl font-bold text-gray-900"
          >
            {title}
          </h2>
          <button 
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            onClick={handleDismiss}
            aria-label="가이드 닫기"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        
        <div className="mt-4 text-gray-600">
          {description}
        </div>
        
        <div className="mt-8 flex justify-end">
          <Button 
            size="lg"
            onClick={handleCta}
            aria-label={ctaText}
          >
            {ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeGuide; 