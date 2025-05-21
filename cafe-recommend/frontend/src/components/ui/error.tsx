'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, X, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ErrorDisplayProps {
  /** 에러 메시지 */
  message: string;
  /** 에러 세부 정보 (선택 사항) */
  details?: string;
  /** 에러 코드 (선택 사항) */
  code?: string | number;
  /** 에러 심각도 */
  severity?: 'error' | 'warning' | 'info';
  /** 에러 해결 방법 안내 텍스트 (선택 사항) */
  actionText?: string;
  /** 에러 해결 액션 (새로고침, 홈으로 이동 등) */
  actionType?: 'reload' | 'goHome' | 'dismiss' | 'custom';
  /** 커스텀 액션 핸들러 */
  onAction?: () => void;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 자동으로 사라지는 시간 (밀리초) */
  autoHideAfter?: number;
}

export function ErrorDisplay({
  message,
  details,
  code,
  severity = 'error',
  actionText,
  actionType,
  onAction,
  className,
  autoHideAfter
}: ErrorDisplayProps) {
  const [visible, setVisible] = useState(true);

  // 자동 숨김 타이머 설정
  useEffect(() => {
    if (autoHideAfter && autoHideAfter > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, autoHideAfter);
      
      return () => clearTimeout(timer);
    }
  }, [autoHideAfter]);

  // 에러 처리 액션 핸들러
  const handleAction = () => {
    if (onAction) {
      onAction();
      return;
    }

    switch (actionType) {
      case 'reload':
        window.location.reload();
        break;
      case 'goHome':
        window.location.href = '/';
        break;
      case 'dismiss':
        setVisible(false);
        break;
      default:
        break;
    }
  };

  // 컴포넌트가 보이지 않을 때는 렌더링하지 않음
  if (!visible) return null;

  // 심각도에 따른 스타일 결정
  const severityStyles = {
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  };

  const iconStyles = {
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500'
  };

  const actionIcon = {
    reload: <RefreshCw className="w-4 h-4 mr-2" />,
    goHome: <Home className="w-4 h-4 mr-2" />,
    dismiss: <X className="w-4 h-4 mr-2" />,
    custom: null
  };

  return (
    <Card className={cn('border overflow-hidden', severityStyles[severity], className)}>
      <CardContent className="p-4">
        <div className="flex items-start">
          <div className="shrink-0 mr-3">
            <AlertCircle className={cn('h-5 w-5', iconStyles[severity])} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{message}</h3>
                {details && <p className="text-sm mt-1">{details}</p>}
                {code && <p className="text-xs opacity-70 mt-2">에러 코드: {code}</p>}
              </div>
              <button 
                onClick={() => setVisible(false)} 
                className="p-1 rounded-full hover:bg-black/5 transition-colors"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {actionType && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleAction}
                className={cn(
                  'mt-3',
                  severity === 'error' ? 'hover:bg-red-100' : null,
                  severity === 'warning' ? 'hover:bg-yellow-100' : null,
                  severity === 'info' ? 'hover:bg-blue-100' : null
                )}
              >
                {actionIcon[actionType]}
                {actionText || (
                  actionType === 'reload' ? '새로고침' :
                  actionType === 'goHome' ? '홈으로 이동' : 
                  actionType === 'dismiss' ? '닫기' : '확인'
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * 에러 바운더리 컴포넌트 - 컴포넌트 트리 내부의 JavaScript 에러를 감지하고 처리
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    console.error('컴포넌트 에러:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <ErrorDisplay
          message="오류가 발생했습니다"
          details="컴포넌트 렌더링 중 문제가 발생했습니다."
          actionType="reload"
          actionText="페이지 새로고침"
        />
      );
    }

    return this.props.children;
  }
}

/**
 * 네트워크 오류 표시 컴포넌트
 */
export function NetworkError({ retry }: { retry?: () => void }) {
  return (
    <ErrorDisplay
      message="네트워크 연결 오류"
      details="인터넷 연결을 확인하고 다시 시도해 주세요."
      severity="warning"
      actionType={retry ? 'custom' : 'reload'}
      onAction={retry}
      actionText="다시 시도"
    />
  );
}

/**
 * 권한 오류 표시 컴포넌트
 */
export function UnauthorizedError() {
  return (
    <ErrorDisplay
      message="권한이 없습니다"
      details="이 기능을 사용하려면 로그인이 필요합니다."
      severity="info"
      actionType="goHome"
      actionText="홈으로 이동"
    />
  );
}

/**
 * 일반 서버 오류 표시 컴포넌트
 */
export function ServerError() {
  return (
    <ErrorDisplay
      message="서버 오류"
      details="서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
      severity="error"
      actionType="reload"
      actionText="새로고침"
    />
  );
}

/**
 * 개발 중인 기능 표시 컴포넌트
 */
export function FeatureInDevelopment() {
  return (
    <ErrorDisplay
      message="개발 중인 기능"
      details="이 기능은 현재 개발 중입니다. 곧 만나보실 수 있습니다."
      severity="info"
      actionType="goHome"
      actionText="홈으로 이동"
    />
  );
} 