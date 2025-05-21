'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateToKorean } from '@/lib/utils';
import cookieManager from '@/lib/cookies';
import { useUser } from '@/contexts/UserContext';

/**
 * 주문 항목 인터페이스
 */
interface OrderItem {
  id: number;
  menu_id: number;
  menu_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

/**
 * 주문 데이터 인터페이스
 */
interface OrderData {
  id: string;
  created_at: string;
  order_items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: string;
}

export default function OrderHistoryPage() {
  const router = useRouter();
  const { anonymousId } = useUser();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  // 쿠키에서 주문 내역 가져오기
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setLoading(true);
    try {
      // 쿠키에서 주문 히스토리 가져오기
      const orderHistory = cookieManager.getOrderHistory<OrderData>();
      setOrders(orderHistory || []);
    } catch (error) {
      console.error('주문 내역 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [anonymousId]);

  // 주문 상태에 따른 배지 스타일
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">완료</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">취소</Badge>;
      default:
        return <Badge className="bg-yellow-500">처리중</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="flex items-center space-x-2 mb-4" 
          onClick={() => router.push('/')}
        >
          <ArrowLeft size={16} />
          <span>홈으로 돌아가기</span>
        </Button>
        <h1 className="text-3xl font-bold">주문 내역</h1>
        <p className="text-muted-foreground">최근 주문 내역을 확인할 수 있습니다.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : orders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">주문 내역이 없습니다</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                아직 주문 내역이 없습니다. 메뉴를 둘러보고 첫 주문을 해보세요!
              </p>
              <Button onClick={() => router.push('/menu')} className="mt-2">
                메뉴 보기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">주문번호: {order.id}</div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">{formatDateToKorean(new Date(order.created_at))}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3 sm:mt-0 mt-2">
                  {getStatusBadge(order.status)}
                  <div className="text-lg font-semibold">{order.total_amount.toLocaleString()}원</div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">주문 상품:</h4>
                  {order.order_items && Array.isArray(order.order_items) && order.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start py-2 border-b last:border-b-0 border-dashed">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate" title={item.menu_name}>{item.menu_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.unit_price.toLocaleString()}원 x {item.quantity}개
                        </div>
                      </div>
                      <div className="font-medium text-sm text-right ml-2 shrink-0">
                        {item.total_price.toLocaleString()}원
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-4 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">결제 방법: </span>
                    <span className="font-medium">{order.payment_method === 'naver' ? '네이버페이' : order.payment_method === 'kakao' ? '카카오페이' : order.payment_method}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="w-full sm:w-auto"
                  >
                    주문 상세 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 