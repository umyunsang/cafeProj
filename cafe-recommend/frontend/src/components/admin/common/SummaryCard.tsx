'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  valueClassName?: string; // 값 부분에 특별한 스타일링이 필요할 경우
  footer?: React.ReactNode; // 카드 하단에 추가 내용 표시
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon,
  description,
  valueClassName,
  footer,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {footer && <div className="mt-2 text-sm text-muted-foreground">{footer}</div>}
      </CardContent>
    </Card>
  );
}; 