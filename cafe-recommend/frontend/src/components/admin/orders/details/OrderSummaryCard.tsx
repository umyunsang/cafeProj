'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { Order } from "@/components/admin/orders/OrderTable";

interface OrderSummaryCardProps {
  order: Order;
  // getStatusBadgeVariant 함수는 OrderDetailPage에 있으므로 props로 받거나, 여기서 직접 정의해야 함.
  // 여기서는 OrderDetailPage의 것을 활용하기 위해 타입만 정의하고, 실제 함수는 page.tsx에서 전달받도록 함.
  // 아니면, 이 컴포넌트 내에 getStatusBadgeVariant를 복사/붙여넣기 할 수도 있음.
  // 이번에는 props로 받는다고 가정.
  getStatusBadgeVariant: (status: string) => "success" | "secondary" | "destructive" | "outline" | "default" | null | undefined;
}

export const OrderSummaryCard = ({ order, getStatusBadgeVariant }: OrderSummaryCardProps) => {
  if (!order) return null; // order가 없을 경우 렌더링하지 않음

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b mb-4">
        <CardTitle className="text-xl font-semibold">
          <Package className="mr-2 h-5 w-5 inline-block text-primary" />
          주문 #{order.display_order_number}
        </CardTitle>
        <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm px-3 py-1">
          {order.status}
        </Badge>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">주문 번호 (내부)</p>
            <p className="font-medium">{order.order_number}</p>
          </div>
          <div>
            <p className="text-muted-foreground">주문 일시</p>
            <p className="font-medium">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">고객명</p>
            <p className="font-medium">{order.customer_name || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">결제 수단</p>
            <p className="font-medium">{order.payment_method || '-'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">총 결제 금액</p>
            <p className="font-bold text-xl text-primary">{order.total_amount.toLocaleString()}원</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 