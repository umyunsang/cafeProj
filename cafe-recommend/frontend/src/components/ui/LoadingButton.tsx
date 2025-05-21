'use client';

import React from 'react';
import { Button, type ButtonProps as ShadcnButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react'; // lucide-react의 로더 아이콘 사용

interface LoadingButtonProps extends ShadcnButtonProps {
  isLoading: boolean;
  loadingText?: string;
  icon?: React.ReactNode; // 일반 상태일 때의 아이콘 (옵션)
  children: React.ReactNode; // 일반 상태일 때의 버튼 텍스트
  size: ShadcnButtonProps['size'];
  variant: ShadcnButtonProps['variant'];
}

export function LoadingButton({
  isLoading,
  loadingText = '처리 중...',
  icon,
  children,
  className,
  disabled,
  size,
  variant,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      className={cn(className, isLoading && 'relative')} // 로딩 중 내부 요소 절대 위치를 위해
      disabled={isLoading || disabled}
      size={size}
      variant={variant}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </Button>
  );
} 