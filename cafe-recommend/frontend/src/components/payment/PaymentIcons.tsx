import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
}

export function NaverPayIcon({ className }: IconProps) {
  return (
    <div className={cn("flex items-center bg-[#03C75A] text-white px-4 py-2 rounded-md", className)}>
      <span className="font-bold">N</span>
      <span className="ml-1">Pay</span>
    </div>
  );
}

export function KakaoPayIcon({ className }: IconProps) {
  return (
    <div className={cn("flex items-center bg-[#FFEB00] text-[#3C1E1E] px-4 py-2 rounded-md", className)}>
      <span className="font-bold">K</span>
      <span className="ml-1">Pay</span>
    </div>
  );
} 