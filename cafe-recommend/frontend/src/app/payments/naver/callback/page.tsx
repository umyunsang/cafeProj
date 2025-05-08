'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

function NaverPaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const resultCode = searchParams.get('resultCode');
    const paymentId = searchParams.get('paymentId');
    const merchantPayId = searchParams.get('order_id'); // 'merchantPayId' 대신 'order_id' 읽기
    const reserveId = searchParams.get('reserveId'); // 추가 파라미터 (백엔드에서 필요시 사용)

    console.log('Naver Pay Callback Params:', {
      resultCode,
      paymentId,
      merchantPayId,
      reserveId,
    });

    if (!resultCode) {
      toast.error('잘못된 접근입니다. (결과 코드 없음)');
      router.replace('/payments/fail?reason=invalid_callback'); // 기본 실패 페이지로 이동
      return;
    }

    if (resultCode === 'Success') {
      if (!paymentId || !merchantPayId) {
        toast.error('결제 정보가 누락되었습니다.');
        router.replace('/payments/fail?reason=missing_payment_info');
        return;
      }

      // 백엔드의 최종 승인 API 호출 (/api/payment/naver/callback)
      // 백엔드 API가 성공 시 /payments/success, 실패 시 /payments/fail 로 리다이렉션할 것으로 예상
      // 백엔드 API URL 생성 (쿼리 파라미터 포함)
      const backendApiUrl = new URL('http://116.124.191.174:15026/api/payment/naver/callback');
      backendApiUrl.searchParams.set('resultCode', resultCode);
      if (paymentId) backendApiUrl.searchParams.set('paymentId', paymentId);
      if (merchantPayId) backendApiUrl.searchParams.set('merchantPayId', merchantPayId);
      if (reserveId) backendApiUrl.searchParams.set('reserveId', reserveId);

      console.log('Redirecting to backend API for approval:', backendApiUrl.toString());

      // 백엔드로 리다이렉션하여 처리 위임
      // 백엔드에서 최종 처리 후 프론트엔드 success/fail 페이지로 다시 리다이렉션
      window.location.href = backendApiUrl.toString();

    } else {
      // resultCode가 Success가 아닌 경우 (예: UserCancel)
      const resultMessage = searchParams.get('resultMessage');
      console.error('Naver Pay payment failed or cancelled:', { resultCode, resultMessage });
      toast.error(`결제가 실패하거나 취소되었습니다: ${resultMessage || resultCode}`);
      router.replace(`/payments/fail?reason=${resultCode}&message=${resultMessage || ''}`);
    }

  }, [searchParams, router]);

  // 로딩 중 또는 처리 중 UI (선택적)
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-xl font-semibold">네이버페이 결제 처리 중...</h1>
      <p className="text-gray-600">잠시만 기다려주세요.</p>
      {/* 스피너 등 추가 가능 */}
    </div>
  );
}

// Suspense를 사용하여 searchParams 로딩을 처리
export default function NaverPaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center">처리 중...</div>}>
      <NaverPaymentCallbackContent />
    </Suspense>
  );
}