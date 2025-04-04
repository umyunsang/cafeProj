import { cn } from "@/lib/utils";

interface MenuCardProps {
  name: string;
  price: number;
  description?: string;
  category: string;
  className?: string;
}

export function MenuCard({ name, price, description, category, className }: MenuCardProps) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-6 transition-all hover:shadow-lg",
      "hover:scale-[1.02] hover:border-primary/20",
      className
    )}>
      <div className="space-y-4">
        {/* 메뉴 이름과 가격 */}
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-semibold text-xl leading-tight">{name}</h3>
          <div className="text-lg font-medium text-primary">
            {price.toLocaleString()}원
          </div>
        </div>

        {/* 카테고리 */}
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
            {category}
          </span>
        </div>

        {/* 설명 */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
} 