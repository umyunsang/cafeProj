"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// 기능 소개 툴팁 (하이라이트 효과를 위한 확장)
interface FeatureTooltipProps extends React.ComponentPropsWithoutRef<typeof Tooltip> {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  highlight?: boolean;
  delay?: number;
  isNew?: boolean;
  isImportant?: boolean;
}

const FeatureTooltip = ({
  children,
  content,
  side = "top",
  align = "center",
  highlight = false,
  delay = 500,
  isNew = false,
  isImportant = false,
  ...props
}: FeatureTooltipProps) => {
  const [open, setOpen] = React.useState(false);
  const [hasBeenSeen, setHasBeenSeen] = React.useState(false);
  const [pulseDisabled, setPulseDisabled] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement>(null);

  // 로컬 스토리지에서 툴팁 상태 확인
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const tooltipKey = `tooltip-seen-${content?.toString().substring(0, 20)}`;
      const seen = localStorage.getItem(tooltipKey) === 'true';
      setHasBeenSeen(seen);
      
      // 중요하거나 새로운 기능이면 최초 방문 시 자동으로 표시
      if ((isNew || isImportant) && !seen) {
        const timer = setTimeout(() => {
          setOpen(true);
        }, delay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [content, delay, isNew, isImportant]);

  // 툴팁이 닫힐 때 로컬 스토리지에 상태 저장
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !hasBeenSeen && typeof window !== 'undefined') {
      const tooltipKey = `tooltip-seen-${content?.toString().substring(0, 20)}`;
      localStorage.setItem(tooltipKey, 'true');
      setHasBeenSeen(true);
      
      // 펄스 효과 비활성화 (사용자가 이미 툴팁을 확인했으므로)
      setTimeout(() => {
        setPulseDisabled(true);
      }, 1000);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={handleOpenChange} delayDuration={delay} {...props}>
        <TooltipTrigger asChild>
          <span 
            ref={triggerRef as React.RefObject<HTMLSpanElement>}
            className={cn(
              "inline-block relative",
              highlight && !hasBeenSeen && !pulseDisabled && "before:absolute before:inset-0 before:-m-1 before:rounded-full before:animate-pulse before:bg-primary/30 before:z-0"
            )}
            data-state={open ? "open" : "closed"}
            data-highlighted={highlight && !hasBeenSeen}
            data-new={isNew}
            data-important={isImportant}
          >
            {isNew && !hasBeenSeen && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-ping" aria-hidden="true" />
            )}
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align}
          role="tooltip"
          className={cn(
            isImportant && "font-medium bg-primary",
            isNew && !hasBeenSeen && "bg-success text-success-foreground"
          )}
          aria-live={isImportant ? "assertive" : "polite"}
        >
          {isNew && !hasBeenSeen && (
            <span className="mr-1 inline-block px-1 py-0.5 text-[0.625rem] font-bold uppercase bg-background text-foreground rounded">새로운 기능</span>
          )}
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  FeatureTooltip,
}; 