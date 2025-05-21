'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link'; // 링크용

interface GuideItem {
  icon: LucideIcon;
  label: string;
  value: string;
}

interface OrderGuideCardProps {
  title: string;
  guideItems: GuideItem[];
  actionButton?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function OrderGuideCard({ title, guideItems, actionButton, className }: OrderGuideCardProps) {
  return (
    <Card className={cn("bg-background dark:bg-neutral-800/50 border-border-color flex flex-col", className)}>
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-xl font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground flex-grow">
        <ul className="space-y-2.5">
          {guideItems.map((item, index) => (
            <li key={index} className="flex items-start">
              <item.icon className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-primary" />
              <div className="flex-1">
                <span className="font-medium text-foreground">{item.label}:</span> {item.value}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      {actionButton && (
        <CardFooter className="pt-4">
          {actionButton.href ? (
            <Link href={actionButton.href} passHref legacyBehavior>
              <Button asChild size="sm" className="w-full" variant="outline">
                <a>{actionButton.text}</a>
              </Button>
            </Link>
          ) : (
            <Button size="sm" className="w-full" variant="outline" onClick={actionButton.onClick}>
              {actionButton.text}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
} 