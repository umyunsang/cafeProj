'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface InfoItem {
  icon: LucideIcon;
  label: string;
  value: string;
}

interface StoreInfoCardProps {
  title: string;
  infoItems: InfoItem[];
  className?: string;
}

export function StoreInfoCard({ title, infoItems, className }: StoreInfoCardProps) {
  return (
    <Card className={cn("bg-background dark:bg-neutral-800/50 border-border-color", className)}>
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-xl font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <ul className="space-y-2.5">
          {infoItems.map((item, index) => (
            <li key={index} className="flex items-start">
              <item.icon className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-primary" />
              <div className="flex-1">
                <span className="font-medium text-foreground">{item.label}:</span> {item.value}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
} 