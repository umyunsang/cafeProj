'use client';

import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaymentOptionButtonProps extends Omit<ButtonProps, 'variant' | 'onClick'> {
  methodName: string;
  icon?: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function PaymentOptionButton({
  methodName,
  icon,
  isSelected,
  onClick,
  disabled = false,
  className,
  ...props
}: PaymentOptionButtonProps) {
  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      className={cn(
        'flex-1 py-6 h-auto text-lg justify-center items-center gap-3 transition-all duration-200 ease-in-out transform hover:scale-105',
        isSelected ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background' : '',
        className
      )}
      onClick={onClick}
      aria-pressed={isSelected}
      disabled={disabled}
      {...props}
    >
      {icon}
      {methodName}
    </Button>
  );
} 