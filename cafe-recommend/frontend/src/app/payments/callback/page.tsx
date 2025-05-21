'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApiPost } from '@/lib/api-hooks';
import { toast } from 'sonner';
import cookieManager from '@/lib/cookies';

// 결제 오류 유형 분석 함수
const analyzePaymentError = (error: any): { reason: string; message: string } => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.log('분석할 오류:', errorMsg);
  
  // 오류 메시지 패턴에 따른 실패 유형 분류
  if (errorMsg.includes('취소') || errorMsg.includes('cancel') || errorMsg.includes('Cancel')) {
    return { reason: 'user_cancel', message: errorMsg };
  } 
  else if (errorMsg.includes('한도') || errorMsg.includes('초과') || errorMsg.includes('limit')) {
    return { reason: 'quota_exceeded', message: errorMsg };
  }
  else if (errorMsg.includes('시간') || errorMsg.includes('timeout') || errorMsg.includes('시간 초과')) {
    return { reason: 'timeout', message: errorMsg };
  }
  else if (errorMsg.includes('TID') || errorMsg.includes('결제 정보') || errorMsg.includes('payment info')) {
    return { reason: 'payment_failed', message: '결제 정보가 유효하지 않습니다. ' + errorMsg };
  }
  else {
    return { reason: 'payment_failed', message: errorMsg };
  }
};

function PaymentCallbackDetailsLoading() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-4">결제 정보 확인 중...</h1>
        <p className="text-gray-600 mb-6">잠시만 기다려주세요. 결제 정보를 확인하고 있습니다.</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    </div>
  );
}

function PaymentCallbackDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { execute: confirmPayment, loading, error: apiError } = useApiPost<{
    order_id: number;
    status: string;
    message: string;
  }>();

  useEffect(() => {
    console.log('[CallbackPage] useEffect triggered');
    const processPayment = async () => {
      setIsProcessing(true);
      setError(null);
      
      try {
        const pg_token = searchParams.get('pg_token');
        const paymentMethod = searchParams.get('payment_method') || 'kakao';

        const resultCode = searchParams.get('resultCode');
        const resultMessage = searchParams.get('resultMessage');

        if (resultCode && resultCode !== 'Success' && paymentMethod !== 'kakao') {
          throw new Error(resultMessage || `결제가 실패했습니다. (${resultCode})`);
        }
        
        let result;

        if (paymentMethod === 'kakao') {
          if (!pg_token) {
            // pg_token이 없는 경우는 카카오페이에서 정상적으로 돌아오지 않은 경우
            // 또는 직접 /payments/callback으로 접근한 경우로 간주
            console.warn('[CallbackPage] pg_token이 없습니다. 메뉴 페이지로 리디렉션합니다.');
            toast.error('잘못된 접근입니다. 결제를 다시 시도해주세요.');
            router.push('/menu');
            return;
          }

          const paymentInfoString = sessionStorage.getItem('kakaoPaymentInfo');
          if (!paymentInfoString) {
            // pg_token은 있지만 session 정보가 없는 경우: 이미 처리되었거나 비정상적인 재진입
            console.warn('[CallbackPage] pg_token은 있으나 카카오페이 세션 정보(kakaoPaymentInfo)가 없습니다. 이미 처리된 요청일 수 있습니다.');
            toast.info('이미 처리되었거나 잘못된 접근입니다. 주문 내역을 확인해주세요.');
            router.push('/orders'); // 주문 내역 페이지 또는 메인 페이지로 이동
            return;
          }
          const paymentInfo = JSON.parse(paymentInfoString);
          const { tid, orderId } = paymentInfo;

          if (!tid || !orderId) {
            throw new Error('카카오페이 세션 정보에 tid 또는 orderId가 누락되었습니다.');
          }

          const queryParams = new URLSearchParams({
            tid: tid,
            pg_token: pg_token,
            order_id: orderId.toString(),
          }).toString();
          
          const response = await fetch(`/api/payment/kakao/complete?${queryParams}`, {
            method: 'POST', 
            headers: {
              'Content-Type': 'application/json' 
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: '알 수 없는 오류'}));
            throw new Error(errorData.detail || `카카오페이 결제 승인에 실패했습니다. (${response.status})`);
          }
          result = await response.json();
          
          console.log("[CallbackPage] 결제 승인 API 응답 (result):", JSON.stringify(result, null, 2));

          sessionStorage.removeItem('kakaoPaymentInfo');
          
          if (result && result.order) {
            console.log("[CallbackPage] sessionStorage에 'lastCompletedOrder' 저장 시도. 데이터 (result.order):", JSON.stringify(result.order, null, 2));
            sessionStorage.setItem('lastCompletedOrder', JSON.stringify(result.order));
            const storedData = sessionStorage.getItem('lastCompletedOrder');
            console.log("[CallbackPage] 'lastCompletedOrder' 저장 후 sessionStorage에서 읽은 값:", storedData ? JSON.stringify(JSON.parse(storedData), null, 2) : 'null');
            
            try {
              console.log("[CallbackPage] 쿠키 저장 전 result.order.order_items:", JSON.stringify(result.order.order_items, null, 2));
              cookieManager.addOrderToHistory(result.order);
              console.log("[CallbackPage] 쿠키에 주문 기록 추가 완료:", JSON.stringify(result.order, null, 2));
            } catch (cookieError) {
              console.error("[CallbackPage] 쿠키에 주문 기록 저장 실패:", cookieError);
            }

          } else {
            console.error('[CallbackPage] 결제 승인 응답에 order 객체가 없습니다:', JSON.stringify(result, null, 2));
            throw new Error('결제 승인 후 주문 정보를 받지 못했습니다.');
          }
        } else if (searchParams.get('paymentKey')) { 
          throw new Error ('다른 결제 시스템(예: 토스) 처리 로직이 필요합니다.');
        } else {
          if (resultCode && resultCode !== 'Success') {
             throw new Error(resultMessage || `결제가 실패했습니다. (${resultCode})`);
          }
          throw new Error('처리할 수 없는 결제 콜백입니다. 카카오페이가 아니거나, 필수 정보가 부족합니다.');
        }
        
        if (!result || !result.order || !result.order.id) {
          console.error("[CallbackPage] 리디렉션 전 주문 ID 없음. result:", JSON.stringify(result, null, 2));
          // 여기서 에러를 throw하면 catch 블록에서 처리되어 사용자에게 오류 메시지가 보인다.
          // 이미 toast.error가 위에서 발생했을 수 있으므로, 여기서는 추가적인 toast 없이 에러만 throw한다.
          throw new Error('결제 확인에 실패했습니다. (주문 ID 없음)');
        }
        
        console.log(`[CallbackPage] Success 페이지로 리디렉션 준비: /payments/success?order_id=${result.order.id}`);
        const dataBeforeRedirect = sessionStorage.getItem('lastCompletedOrder');
        console.log("[CallbackPage] 리디렉션 직전 sessionStorage('lastCompletedOrder'):", dataBeforeRedirect ? JSON.stringify(JSON.parse(dataBeforeRedirect), null, 2) : 'null 또는 undefined');

        toast.success('결제가 성공적으로 처리되었습니다.');
        router.push(`/payments/success?order_id=${result.order.id}`); 
        
      } catch (err: any) {
        console.error('Payment callback error:', err);
        setError(err.message || '결제 처리 중 오류가 발생했습니다.');
        toast.error(err.message || '결제 처리 중 오류가 발생했습니다.');
      } finally {
        setIsProcessing(false);
      }
    };

    processPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams]); // confirmPayment와 apiError는 직접적인 의존성이 아닐 수 있음, 필요시 추가/제거

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      {isProcessing ? (
        <div>
          <h1 className="text-2xl font-bold mb-4">결제 처리 중...</h1>
          <p className="text-gray-600 mb-6">잠시만 기다려주세요. 결제를 확인하고 있습니다.</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </div>
      ) : error ? (
        <div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">결제 오류</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/checkout')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            결제 다시 시도하기
          </button>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">결제 완료</h1>
          <p className="text-gray-700 mb-6">결제가 성공적으로 완료되었습니다. 결제 완료 페이지로 이동합니다.</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<PaymentCallbackDetailsLoading />}>
      <PaymentCallbackDetails />
    </Suspense>
  );
} 