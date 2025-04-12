'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { CheckCircle, ShoppingBag, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

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
  id: number;
  user_id: number | null;
  total_amount: number;
  status: string;
  payment_method: string | null;
  payment_key: string | null;
  session_id: string | null;
  delivery_address: string | null;
  delivery_request: string | null;
  phone_number: string | null;
  created_at: string | null;
  updated_at: string | null;
  items: OrderItemResponse[];
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { clearCart, sessionId } = useCart();
  const [isProcessing, setIsProcessing] = useState(true);
  const [order, setOrder] = useState<OrderResponse | null>(null); // OrderResponse 타입 사용
  const [error, setError] = useState<string | null>(null);
  const [cartCleared, setCartCleared] = useState(false);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);

  // 로컬 스토리지에서 세션 ID 가져오기
  useEffect(() => {
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      setLocalSessionId(storedSessionId);
      console.log('로컬 스토리지에서 세션 ID 로드:', storedSessionId);
    }
  }, []);

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const pg_token = params.get('pg_token');
        const order_id = params.get('order_id');
        // const tid = params.get('tid'); // URL 파라미터 대신 sessionStorage에서 가져오기
        
        // sessionStorage에서 tid 가져오기
        const tid = sessionStorage.getItem('kakaoPaymentTid');
        console.log('sessionStorage에서 TID 로드:', tid);

        // 사용 후 tid 제거
        if (tid) {
          sessionStorage.removeItem('kakaoPaymentTid');
          console.log('sessionStorage에서 TID 제거됨');
        }
        
        if (!order_id) {
          setError('주문 정보를 찾을 수 없습니다.');
          setIsProcessing(false);
          return;
        }

        // 세션 ID 확인 (CartContext의 sessionId 또는 로컬 스토리지에서 가져온 세션 ID 사용)
        const effectiveSessionId = sessionId || localSessionId;
        
        if (!effectiveSessionId) {
          console.error('세션 ID가 없습니다.');
          setError('세션 ID가 없습니다. 다시 시도해주세요.');
          setIsProcessing(false);
          return;
        }

        try {
          console.log('결제 완료 처리 시작:', { pg_token, order_id, tid, effectiveSessionId });
          
          // tid가 있는 경우에만 카카오페이 결제 완료 처리
          if (tid && pg_token) {
            // 1. 카카오페이 결제 완료 처리
            const completeResponse = await fetch('/api/payment/kakao/complete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': effectiveSessionId
              },
              body: JSON.stringify({
                pg_token,
                order_id,
                tid,
              }),
            });

            if (!completeResponse.ok) {
              const errorData = await completeResponse.json();
              console.error('결제 완료 처리 실패:', errorData);
              throw new Error(errorData.error || '결제 완료 처리에 실패했습니다.');
            }
            
            // 결제 완료 API 응답에서 직접 주문 정보 가져오기
            const completeData = await completeResponse.json();
            if (!completeData || !completeData.order) {
              console.error('결제 완료 응답에서 주문 정보를 찾을 수 없습니다.', completeData);
              throw new Error('결제 완료 응답 형식이 올바르지 않습니다.');
            }
            console.log('결제 완료 API 응답 주문 정보:', completeData.order);
            setOrder(completeData.order); // 응답받은 주문 정보로 상태 업데이트

          } else {
            // tid나 pg_token이 없는 경우 (카카오페이 외 다른 결제 또는 직접 접근)
            // 주문 정보만 조회
            const orderResponse = await fetch(`/api/orders/${order_id}`, {
              headers: {
                'X-Session-ID': effectiveSessionId
              },
              credentials: 'include'
            });
            
            if (!orderResponse.ok) {
              const errorData = await orderResponse.json();
              console.error('주문 정보 조회 실패:', errorData);
              throw new Error('주문 정보를 조회할 수 없습니다.');
            }
            
            const orderData: OrderResponse = await orderResponse.json();
            console.log('주문 정보 (직접 조회):', orderData);
            setOrder(orderData);
          }
          
          // 3. 장바구니 비우기 (한 번만 실행)
          if (!cartCleared) {
            await clearCart();
            setCartCleared(true);
            toast.success('결제가 완료되었습니다.');
          }
        } catch (error) {
          console.error('결제 처리 실패:', error);
          setError(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.');
          toast.error(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.');
        }
      } catch (error) {
        console.error('결제 처리 중 오류:', error);
        setError('결제 처리 중 오류가 발생했습니다.');
        toast.error('결제 처리 중 오류가 발생했습니다.');
      } finally {
        setIsProcessing(false);
      }
    };

    // 세션 ID가 로드된 후에만 결제 처리 시작
    if (localSessionId || sessionId) {
      handlePaymentSuccess();
    }
  }, [router, sessionId, localSessionId, cartCleared]); // localSessionId 추가

  if (isProcessing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-lg mx-auto p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">결제 처리 중입니다...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-lg mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4 text-center">결제 오류</h1>
          <p className="text-red-500 text-center mb-4">{error}</p>
          <div className="mt-6 text-center">
            <Button onClick={() => router.push('/menu')} className="w-full">
              메뉴로 돌아가기
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-lg mx-auto p-6">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">결제가 완료되었습니다</h1>
          <p className="text-gray-500">주문하신 상품은 준비 후 배송해 드리겠습니다</p>
        </div>
        
        {order && (
          <div className="space-y-6">
            {/* 주문번호 강조 표시 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">주문번호</p>
                <p className="text-3xl font-bold text-primary">{order.id}</p>
                <p className="text-xs text-gray-400 mt-1">이 번호를 기억해주세요</p>
              </div>
            </div>
            
            {/* 주문 정보 요약 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center mb-1">
                  <ShoppingBag className="h-4 w-4 mr-1 text-gray-500" />
                  <p className="text-sm font-medium">결제금액</p>
                </div>
                <p className="text-lg font-bold">{order.total_amount.toLocaleString()}원</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center mb-1">
                  <Clock className="h-4 w-4 mr-1 text-gray-500" />
                  <p className="text-sm font-medium">주문일시</p>
                </div>
                <p className="text-sm">{formatDate(order.created_at)}</p>
              </div>
            </div>
            
            {/* 결제 상태 */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium mb-1">결제상태</p>
              <p className={`font-bold ${order.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                {order.status === 'paid' ? '결제완료' : order.status === 'pending' ? '결제대기' : order.status}
              </p>
            </div>

            {/* 주문 내역 */}
            <div className="border-t pt-4">
              <h2 className="font-semibold mb-3 flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2 text-primary" />
                주문 내역
              </h2>
              <div className="space-y-3">
                {order.items && order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{item.menu_name}</span>
                      <span className="text-gray-500 ml-2">x {item.quantity}</span>
                    </div>
                    <span className="font-medium">{item.total_price.toLocaleString()}원</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Button onClick={() => router.push('/menu')} className="w-full">
            메뉴로 돌아가기
          </Button>
        </div>
      </Card>
    </div>
  );
} 