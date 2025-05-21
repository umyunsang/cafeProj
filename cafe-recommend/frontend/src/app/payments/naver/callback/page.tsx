'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://116.124.191.174:15049';

// 네이버페이 결과 코드별 에러 매핑
const naverPayErrorMap: Record<string, { reason: string, message: string }> = {
  'UserCancel': {
    reason: 'user_cancel',
    message: '사용자가 결제를 취소했습니다.'
  },
  'OwnerCancel': {
    reason: 'user_cancel',
    message: '판매자가 결제를 취소했습니다.'
  },
  'Error': {
    reason: 'payment_failed',
    message: '결제 처리 중 오류가 발생했습니다.'
  },
  'InvalidAccountInfo': {
    reason: 'payment_failed',
    message: '계좌 정보가 올바르지 않습니다.'
  },
  'VerificationRequired': {
    reason: 'payment_failed',
    message: '추가 인증이 필요합니다.'
  },
  'InsufficientBalance': {
    reason: 'quota_exceeded',
    message: '잔액이 부족합니다.'
  },
  'TimeOut': {
    reason: 'timeout',
    message: '결제 시간이 초과되었습니다.'
  }
};

function NaverPaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const resultCode = searchParams.get('resultCode');
    const paymentId = searchParams.get('paymentId');
    const merchantPayId = searchParams.get('order_id'); // 'merchantPayId' 대신 'order_id' 읽기
    const reserveId = searchParams.get('reserveId'); // 추가 파라미터 (백엔드에서 필요시 사용)
    const resultMessage = searchParams.get('resultMessage') || ''; // 결과 메시지

    console.log('Naver Pay Callback Params:', {
      resultCode,
      paymentId,
      merchantPayId,
      reserveId,
      resultMessage
    });

    if (!resultCode) {
      const errorDetail = '잘못된 접근입니다. (결과 코드 없음)';
      toast.error(errorDetail);
      
      // 세션 스토리지에 오류 상세 저장
      sessionStorage.setItem('payment_error', errorDetail);
      router.replace('/payments/fail?reason=payment_failed&message=' + encodeURIComponent(errorDetail));
      return;
    }

    if (resultCode === 'Success') {
      if (!paymentId || !merchantPayId) {
        const errorDetail = '결제 정보가 누락되었습니다.';
        toast.error(errorDetail);
        
        // 세션 스토리지에 오류 상세 저장
        sessionStorage.setItem('payment_error', errorDetail);
        router.replace('/payments/fail?reason=payment_failed&message=' + encodeURIComponent(errorDetail));
        return;
      }

      // 백엔드의 최종 승인 API 호출 (/api/payment/naver/callback)
      // 백엔드 API가 성공 시 /payments/success, 실패 시 /payments/fail 로 리다이렉션할 것으로 예상
      // 백엔드 API URL 생성 (쿼리 파라미터 포함)
      const backendApiUrl = new URL(`${API_BASE_URL}/api/payment/naver/callback`);
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
      console.error('Naver Pay payment failed or cancelled:', { resultCode, resultMessage });
      
      // 네이버페이 에러 매핑에서 적절한 에러 정보 가져오기
      const errorInfo = naverPayErrorMap[resultCode] || { 
        reason: 'payment_failed', 
        message: `결제가 실패했습니다: ${resultMessage || resultCode}` 
      };
      
      // 오류 메시지 표시
      toast.error(errorInfo.message);
      
      // 세션 스토리지에 상세 오류 저장
      const detailedMessage = resultMessage ? `${errorInfo.message} (${resultMessage})` : errorInfo.message;
      sessionStorage.setItem('payment_error', detailedMessage);
      
      // 실패 페이지로 리다이렉션 (reason과 message 포함)
      router.replace(`/payments/fail?reason=${errorInfo.reason}&message=${encodeURIComponent(detailedMessage)}`);
    }

  }, [searchParams, router]);

  // 로딩 중 또는 처리 중 UI (선택적)
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-xl font-semibold">네이버페이 결제 처리 중...</h1>
      <p className="text-gray-600">잠시만 기다려주세요.</p>
      <div className="flex justify-center mt-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
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