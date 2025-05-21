'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { CheckCircle, ShoppingBag, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import cookieManager from '@/lib/cookies';

// 백엔드 OrderResponse 스키마와 일치하도록 인터페이스 업데이트
interface OrderItemResponse {
  id: number;
  menu_id: number;
  menu_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderResponse {
  id: string;
  created_at: string;
  order_items: OrderItemResponse[];
  total_amount: number;
  status: string;
  payment_method: string;
}

// Suspense 폴백 UI
function PaymentDetailsLoading() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
  );
}

// useSearchParams를 사용하는 로직을 담는 컴포넌트
function PaymentDetails() {
  const router = useRouter();
  const searchParams = useSearchParams(); // 이 컴포넌트 내에서 useSearchParams 사용
  const { clearCart } = useCart();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const orderIdFromUrl = searchParams.get('order_id');
  const [hasProcessed, setHasProcessed] = useState(false); // 처리 여부 상태 추가

  useEffect(() => {
    if (!orderIdFromUrl) {
      toast.error('잘못된 접근입니다. 주문 정보가 없습니다.');
      if (!hasProcessed) router.push('/menu'); // 중복 라우팅 방지
      return;
    }

    const loadOrderData = async () => {
      setLoading(true);
      try {
        if (!hasProcessed) { // 아직 처리되지 않은 경우에만 실행
          const storedOrderData = sessionStorage.getItem('lastCompletedOrder');
          console.log('[SuccessPage] sessionStorage.getItem("lastCompletedOrder") 직후:', storedOrderData);
          if (storedOrderData) {
            const parsedOrder = JSON.parse(storedOrderData);
            console.log('[SuccessPage] parsedOrder:', parsedOrder);

            if (parsedOrder.id && orderIdFromUrl && parsedOrder.id.toString() === orderIdFromUrl) {
              setOrder(parsedOrder);
              toast.success('결제가 성공적으로 완료되었습니다!');
              clearCart(); // 성공 시 장바구니 비우기
              sessionStorage.removeItem('lastCompletedOrder'); // 성공 시 세션 스토리지 정리
              setHasProcessed(true); // 처리 완료 표시
              console.log("[SuccessPage] Order processed, cart cleared, session item removed.");
            } else {
              console.error(
                '세션에 저장된 주문 ID와 URL의 주문 ID가 일치하지 않거나, 세션 데이터에 ID가 없습니다.',
                '저장된 데이터:', parsedOrder,
                'URL ID:', orderIdFromUrl
              );
              toast.error('주문 정보를 처리하는 중 문제가 발생했습니다. 주문 내역을 확인해주세요.');
              sessionStorage.removeItem('lastCompletedOrder'); // 오류 시에도 세션 정리
              setHasProcessed(true); // 처리 시도 완료 (오류지만)
            }
          } else {
            console.error('세션 스토리지에서 주문 정보를 찾을 수 없습니다. (lastCompletedOrder is null)');
            toast.error('결제 완료 정보를 찾을 수 없습니다. 주문 내역을 확인하거나 다시 시도해주세요.');
            setHasProcessed(true); // 처리 시도 완료 (오류지만)
          }
        }
      } catch (error: any) {
        console.error('결제 성공 페이지 오류:', error);
        toast.error(error.message || '주문 정보를 불러오는 중 오류가 발생했습니다.');
        setHasProcessed(true); // 처리 시도 완료 (오류지만)
      } finally {
        setLoading(false);
      }
    };

    if (!order && !hasProcessed) {
        loadOrderData();
    }

  // order 상태가 직접적으로 useEffect를 다시 트리거하지 않도록 의존성 배열에서 order 제거
  }, [orderIdFromUrl, router, clearCart, hasProcessed]); 

  if (loading && !order) {
    return <PaymentDetailsLoading />; // 로딩 중 UI 사용
  }

  if (!order) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-lg mx-auto p-6">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-red-100 rounded-full mb-4">
              <ShoppingBag className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">주문 정보를 찾을 수 없습니다</h1>
            <p className="text-muted-foreground mb-6">
              요청하신 주문 정보를 불러오는데 실패했습니다. 다시 시도해주세요.
            </p>
            <div className="space-x-4">
              <Button onClick={() => router.push('/menu')}>
                메뉴로 돌아가기
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-lg mx-auto p-6">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">주문이 완료되었습니다</h1>
          <p className="text-muted-foreground mb-6">
            감사합니다! 주문이 성공적으로 처리되었습니다.
          </p>
          
          <div className="w-full mb-6">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">주문 번호</span>
              <span className="font-medium">{order.id}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">주문 일시</span>
              <span className="font-medium">{formatDate(new Date(order.created_at))}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">결제 방법</span>
              <span className="font-medium">{order.payment_method}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">주문 상태</span>
              <span className="font-medium">
                {order.status === 'completed' ? '완료' : 
                 order.status === 'cancelled' ? '취소됨' : 
                 '처리중'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium">총 결제 금액</span>
              <span className="font-bold text-lg">{order.total_amount.toLocaleString()}원</span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            주문 내역은 '주문 내역' 페이지에서 확인하실 수 있습니다.
          </p>
          
          <div className="space-x-4">
            <Button onClick={() => router.push('/orders')}>
              주문 내역 보기
            </Button>
            <Button variant="outline" onClick={() => router.push('/menu')}>
              메뉴로 돌아가기
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentDetailsLoading />}>
      <PaymentDetails />
    </Suspense>
  );
} 