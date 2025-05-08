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
  order_number: string | null;
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [order, setOrder] = useState<OrderResponse | null>(null); // OrderResponse 타입 사용
  const [error, setError] = useState<string | null>(null);
  const [cartCleared, setCartCleared] = useState(false);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);

  // 로컬 스토리지에서 세션 ID 가져오기
  useEffect(() => {
    console.log("Effect 1: Attempting to load sessionId from localStorage");
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      setLocalSessionId(storedSessionId);
      console.log('Effect 1: Loaded localSessionId:', storedSessionId);
    } else {
      console.log("Effect 1: No sessionId found in localStorage");
    }
  }, []); // Runs only once on mount

  useEffect(() => {
    console.log("Effect 2: Running. Dependencies:", { router, sessionId, localSessionId, cartCleared });
    const effectiveSessionId = sessionId || localSessionId;

    const handlePaymentSuccess = async () => {
        console.log("handlePaymentSuccess: Inside function. Current state:", { isProcessing, order: !!order, error: !!error });
      // 중복 실행 방지 체크 강화: 이미 완료되었거나 오류 상태면 종료
      if (order || error) {
          console.log('handlePaymentSuccess: Stopping execution because order or error is already set.');
          // 만약 order나 error가 설정되었는데 isProcessing이 true이면 false로 정정
          if (isProcessing) {
             console.log("handlePaymentSuccess: Correcting isProcessing to false because order/error is set.");
             setIsProcessing(false);
          }
          return;
      }
      // isProcessing 이 이미 true면 로직 실행 중이므로 반환 (동시 호출 방지)
       if (isProcessing) {
           console.log("handlePaymentSuccess: Stopping execution because isProcessing is already true.");
           return;
       }

      console.log('handlePaymentSuccess: Setting isProcessing to true.');
      setIsProcessing(true); // 실제 처리 시작 직전에 true로 설정

      try {
        const params = new URLSearchParams(window.location.search);
        const pg_token = params.get('pg_token');
        const order_id = params.get('order_id');
        const tid = sessionStorage.getItem('kakaoPaymentTid');
        console.log('handlePaymentSuccess: Payment info:', { pg_token, order_id, tid });

        if (tid) {
          sessionStorage.removeItem('kakaoPaymentTid');
          console.log('handlePaymentSuccess: Removed TID from sessionStorage');
        }

        if (!order_id) {
          console.error('handlePaymentSuccess: Order ID missing');
          setError('주문 정보를 찾을 수 없습니다.');
          console.log('handlePaymentSuccess: Setting isProcessing to false (order_id missing).');
          setIsProcessing(false);
          return;
        }

        // effectiveSessionId는 effect 시작 시점에 이미 검증됨
        if (!effectiveSessionId) {
           console.error('handlePaymentSuccess: Session ID missing (should not happen here)');
           setError('세션 ID가 없습니다. 다시 시도해주세요.');
           console.log('handlePaymentSuccess: Setting isProcessing to false (sessionId missing).');
           setIsProcessing(false);
           return;
        }
        console.log('handlePaymentSuccess: Effective Session ID:', effectiveSessionId);

        // --- API 호출 로직 ---
        try {
          let orderData: OrderResponse | null = null;
          console.log('handlePaymentSuccess: Entering API call try block.');

          if (tid && pg_token) {
            console.log('handlePaymentSuccess: Attempting KakaoPay complete API call.');
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
              console.error('handlePaymentSuccess: KakaoPay complete API failed:', errorData);
              throw new Error(errorData.detail || '결제 완료 처리에 실패했습니다.');
            }

            const completeData = await completeResponse.json();
            if (!completeData || !completeData.order) {
              console.error('handlePaymentSuccess: KakaoPay complete response format error:', completeData);
              throw new Error('결제 완료 응답 형식이 올바르지 않습니다.');
            }
            console.log('handlePaymentSuccess: KakaoPay complete API successful.');
            orderData = completeData.order;

          } else {
             console.log('handlePaymentSuccess: Attempting direct order fetch API call.');
            const orderResponse = await fetch(`/api/orders/${order_id}`, {
              headers: {
                'X-Session-ID': effectiveSessionId
              },
              credentials: 'include'
            });

              if (!orderResponse.ok) {
               const errorData = await orderResponse.json();
               console.error('handlePaymentSuccess: Direct order fetch API failed:', { status: orderResponse.status, data: errorData });
               if (orderResponse.status === 403) {
                   throw new Error(`주문 정보를 조회할 권한이 없습니다 (${errorData.detail || 'Forbidden'}). 세션이 만료되었거나 잘못된 접근일 수 있습니다.`);
               } else {
                   throw new Error(`주문 정보를 조회할 수 없습니다 (${errorData.detail || orderResponse.statusText}).`);
               }
             }
             orderData = await orderResponse.json();
             console.log('handlePaymentSuccess: Direct order fetch API successful.');
          }

          // --- 주문 정보 및 장바구니 처리 ---
          if (orderData) {
            console.log('handlePaymentSuccess: Order data received, updating state.');
            console.log('Received order data:', orderData);
            setOrder(orderData);
            if (!cartCleared) {
              // clearCart는 비동기일 수 있으므로 await 사용
              await clearCart();
              setCartCleared(true);
              console.log('handlePaymentSuccess: Cart cleared.');
              toast.success('결제가 완료되었습니다.');
            }
            console.log('handlePaymentSuccess: Setting isProcessing to false (success).');
            setIsProcessing(false); // Set processing to false on success

          } else {
             console.error('handlePaymentSuccess: No order data received after API calls.');
             // 이 경우는 에러로 간주
             throw new Error('주문 데이터를 가져오지 못했습니다.');
          }

        } catch (apiError) {
          console.error('handlePaymentSuccess: API call failed:', apiError);
          if (!error) { // Avoid overwriting existing error state
            setError(apiError instanceof Error ? apiError.message : '결제 처리 중 오류가 발생했습니다.');
            toast.error(apiError instanceof Error ? apiError.message : '결제 처리 중 오류가 발생했습니다.');
          }
           console.log('handlePaymentSuccess: Setting isProcessing to false (API error).');
           setIsProcessing(false); // Set processing to false on API error
        }
        // --- API 호출 로직 끝 ---

      } catch (outerError) {
        console.error('handlePaymentSuccess: Outer logic error:', outerError);
        if (!error) {
          setError('결제 처리 중 예기치 않은 오류가 발생했습니다.');
          toast.error('결제 처리 중 예기치 않은 오류가 발생했습니다.');
        }
         console.log('handlePaymentSuccess: Setting isProcessing to false (outer error).');
         setIsProcessing(false); // Set processing to false on outer error
      }
    };

    // --- Effect Trigger Logic ---
    console.log("Effect 2: Checking conditions to call handlePaymentSuccess.");
    if (effectiveSessionId && !order && !error) {
        // isProcessing 상태를 여기서 직접 확인하여 중복 호출 방지
        if (!isProcessing) {
            console.log("Effect 2: Conditions met and not processing. Calling handlePaymentSuccess.");
            handlePaymentSuccess();
        } else {
            console.log("Effect 2: Conditions met BUT already processing. Skipping call.");
        }
    } else if (!effectiveSessionId) {
        console.log('Effect 2: Waiting for effectiveSessionId.');
    } else if (order) {
        console.log('Effect 2: Order already loaded, skipping call.');
         // Ensure loading is off if order is loaded but processing is somehow still true
         if (isProcessing) {
             console.log("Effect 2: Correcting isProcessing to false as order is loaded.");
             setIsProcessing(false);
         }
    } else if (error) {
        console.log('Effect 2: Error occurred previously, skipping call.');
         // Ensure loading is off if error occurred previously but processing is somehow still true
         if (isProcessing) {
             console.log("Effect 2: Correcting isProcessing to false as error occurred.");
             setIsProcessing(false);
         }
    } else {
         // 이 경우는 거의 발생하지 않아야 함 (디버깅용)
         console.log('Effect 2: Conditions not met for unknown reason, skipping call.', { effectiveSessionId: !!effectiveSessionId, order: !!order, error: !!error, isProcessing });
     }
    // --- Effect Trigger Logic End ---

    // 의존성 배열에서 isProcessing, order, error 제거
  }, [router, sessionId, localSessionId, cartCleared, clearCart]);

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
          <p className="text-gray-500">주문하신 상품은 준비 후 제공해 드리겠습니다</p>
        </div>
        
        {order && (
          <div className="space-y-6">
            {/* 주문번호 강조 표시 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">주문번호</p>
                <p className="text-3xl font-bold text-primary">
                  {order.order_number?.split('-')[1] || order.id}
                </p>
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