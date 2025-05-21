'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FeatureTooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  target: string; // 대상 요소의 선택자
  title: string; // 단계 제목
  content: React.ReactNode; // 단계 내용
  placement?: 'top' | 'right' | 'bottom' | 'left'; // 툴팁 위치
  spotlightPadding?: number; // 스포트라이트 패딩
  disableOverlay?: boolean; // 오버레이 비활성화 (특정 기능만 보여줄 때)
  showSkip?: boolean; // 건너뛰기 버튼 표시 여부
  showNext?: boolean; // 다음 버튼 표시 여부
}

interface TourGuideProps {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  tourKey?: string; // 로컬 스토리지에 저장할 키
  autoStart?: boolean; // 자동 시작 여부
  isOpen?: boolean; // 외부에서 제어하는 경우 사용
  onOpenChange?: (open: boolean) => void; // 외부에서 제어하는 경우 사용
}

const TourGuide: React.FC<TourGuideProps> = ({
  steps,
  onComplete,
  onSkip,
  tourKey = 'onboarding-tour-completed',
  autoStart = true,
  isOpen: externalIsOpen,
  onOpenChange,
}) => {
  // 투어 상태 관리
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [hasTourBeenShown, setHasTourBeenShown] = useState(true); // 기본값은 이미 본 것으로 설정
  
  // 로컬 스토리지로부터 투어 완료 여부 확인
  useEffect(() => {
    const tourCompleted = localStorage.getItem(tourKey) === 'true';
    setHasTourBeenShown(tourCompleted);
    
    // 제어되지 않는 컴포넌트인 경우 자동 시작 처리
    if (externalIsOpen === undefined && autoStart && !tourCompleted) {
      setTimeout(() => {
        setIsOpen(true);
      }, 1000);
    }
  }, [tourKey, autoStart, externalIsOpen]);
  
  // 외부에서 제어하는 경우 isOpen 동기화
  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);
  
  // 현재 단계의 대상 요소 찾기
  useEffect(() => {
    if (isOpen && steps[currentStep]) {
      const target = document.querySelector(steps[currentStep].target) as HTMLElement;
      setTargetElement(target);
    }
  }, [currentStep, isOpen, steps]);
  
  // 다음 단계로 이동
  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length]);
  
  // 이전 단계로 이동
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);
  
  // 투어 완료
  const handleComplete = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(tourKey, 'true');
    setHasTourBeenShown(true);
    
    if (onComplete) {
      onComplete();
    }
    
    if (onOpenChange) {
      onOpenChange(false);
    }
  }, [tourKey, onComplete, onOpenChange]);
  
  // 투어 건너뛰기
  const handleSkip = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(tourKey, 'true');
    setHasTourBeenShown(true);
    
    if (onSkip) {
      onSkip();
    }
    
    if (onOpenChange) {
      onOpenChange(false);
    }
  }, [tourKey, onSkip, onOpenChange]);
  
  // 오버레이 클릭 이벤트 처리
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (steps[currentStep]?.disableOverlay) return;
    
    // 오버레이 클릭 시 투어 종료
    handleComplete();
  }, [currentStep, steps, handleComplete]);
  
  // 투어가 이미 표시되었거나 열려있지 않으면 아무것도 렌더링하지 않음
  if (!isOpen || hasTourBeenShown) {
    return null;
  }
  
  // 현재 단계 정보
  const currentTourStep = steps[currentStep];
  
  // 대상 요소가 없으면 아무것도 렌더링하지 않음
  if (!targetElement) {
    return null;
  }
  
  // 대상 요소의 위치 계산
  const targetRect = targetElement.getBoundingClientRect();
  const padding = currentTourStep.spotlightPadding ?? 8;
  
  return createPortal(
    <>
      {/* 오버레이 및 스포트라이트 */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-300" 
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tour-step-${currentStep}-title`}
      >
        {/* 스포트라이트 구현 (대상 요소 주변 투명한 영역) */}
        <div 
          className="absolute bg-transparent pointer-events-none"
          style={{
            top: targetRect.top - padding + window.scrollY,
            left: targetRect.left - padding + window.scrollX,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
            borderRadius: '4px',
          }}
        />
      </div>
      
      {/* 투어 단계 툴팁 */}
      <div
        className="fixed z-[60] bg-white rounded-lg shadow-xl max-w-xs p-4 transition-all duration-300"
        style={{
          top: getTooltipPosition(targetRect, currentTourStep.placement || 'bottom').top,
          left: getTooltipPosition(targetRect, currentTourStep.placement || 'bottom').left,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* 닫기 버튼 */}
        <button 
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
          onClick={handleComplete}
          aria-label="투어 닫기"
        >
          <X size={16} />
        </button>
        
        {/* 제목 */}
        <h3 
          id={`tour-step-${currentStep}-title`}
          className="text-base font-semibold mb-2"
        >
          {currentTourStep.title}
        </h3>
        
        {/* 내용 */}
        <div className="text-sm text-gray-600 mb-4">
          {currentTourStep.content}
        </div>
        
        {/* 네비게이션 */}
        <div className="flex items-center justify-between">
          {/* 단계 표시 */}
          <div className="flex items-center space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === currentStep 
                    ? "w-4 bg-primary" 
                    : "w-1.5 bg-gray-200"
                )}
              />
            ))}
          </div>
          
          {/* 버튼 */}
          <div className="flex items-center space-x-2">
            {currentTourStep.showSkip !== false && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSkip}
              >
                건너뛰기
              </Button>
            )}
            
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrev}
              >
                이전
              </Button>
            )}
            
            {currentTourStep.showNext !== false && (
              <Button 
                size="sm" 
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? '완료' : '다음'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

// 툴팁 위치 계산 함수
const getTooltipPosition = (
  targetRect: DOMRect, 
  placement: 'top' | 'right' | 'bottom' | 'left'
) => {
  const OFFSET = 20; // 대상 요소로부터의 거리
  
  switch (placement) {
    case 'top':
      return {
        top: targetRect.top - OFFSET + window.scrollY,
        left: targetRect.left + targetRect.width / 2 + window.scrollX,
      };
    case 'right':
      return {
        top: targetRect.top + targetRect.height / 2 + window.scrollY,
        left: targetRect.right + OFFSET + window.scrollX,
      };
    case 'bottom':
      return {
        top: targetRect.bottom + OFFSET + window.scrollY,
        left: targetRect.left + targetRect.width / 2 + window.scrollX,
      };
    case 'left':
      return {
        top: targetRect.top + targetRect.height / 2 + window.scrollY,
        left: targetRect.left - OFFSET + window.scrollX,
      };
    default:
      return {
        top: targetRect.bottom + OFFSET + window.scrollY,
        left: targetRect.left + targetRect.width / 2 + window.scrollX,
      };
  }
};

export default TourGuide; 