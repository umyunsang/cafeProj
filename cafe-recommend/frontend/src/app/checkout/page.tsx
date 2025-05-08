'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckoutCart } from '@/components/checkout/CheckoutCart';
import { NaverPayIcon, KakaoPayIcon } from '@/components/payment/PaymentIcons';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';

export default function CheckoutPage() {
  const { items, sessionId } = useCart();
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setSelectedPayment('kakao');
  //   }, 0);
  //   return () => clearTimeout(timer);
  // }, []); // Hydration 오류를 유발할 수 있으므로 주석 처리

  const calculateTotal = () => {
    if (!items) return 0;
    return items.reduce((total, item) => {
      const price = typeof item.menu?.price === 'number' ? item.menu.price : 0;
      const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
      return total + (price * quantity);
    }, 0);
  };

  const handlePayment = async () => {
    if (!selectedPayment) {
      toast.error('결제 수단을 선택해주세요.');
      return;
    }

    if (!items || items.length === 0) {
      toast.error('장바구니가 비어있습니다.');
      return;
    }

    if (!sessionId) {
      toast.error('세션이 만료되었습니다. 페이지를 새로고침해주세요.');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('결제 시작 - 세션 ID:', sessionId);

      // 주문 생성
      const orderRequestData = {
        payment_method: selectedPayment,
        total_amount: calculateTotal(),
        items: items.map(item => ({
          menu_id: item.menu.id,
          name: item.menu.name,
          quantity: item.quantity,
          unit_price: item.menu.price,
          total_price: (item.menu?.price || 0) * item.quantity
        }))
      };
      console.log('주문 요청 데이터:', orderRequestData);

      const orderResponse = await fetch('http://116.124.191.174:15026/api/order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        credentials: 'include',
        body: JSON.stringify(orderRequestData)
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        console.error('주문 생성 실패:', errorData);
        let errorMessage = '주문 생성에 실패했습니다.';
        if (errorData.detail && Array.isArray(errorData.detail)) {
          // Format validation errors
          errorMessage = errorData.detail
            .map((err: any) => `${err.loc.join('.')} : ${err.msg}`)
            .join('; ');
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
        throw new Error(errorMessage);
      }

      const orderResponseData = await orderResponse.json();
      console.log('주문 응답 데이터:', orderResponseData);

      if (!orderResponseData.order_id) {
        throw new Error('주문 ID를 받지 못했습니다.');
      }

      // 결제 요청: 선택된 결제 수단에 따라 URL 및 요청 본문 분기
      let paymentApiUrl = '';
      let paymentRequestBody: any = {};

      if (selectedPayment === 'naver') {
        paymentApiUrl = 'http://116.124.191.174:15026/api/payment/naver/prepare';
        paymentRequestBody = {
          payment_method: 'naver',
          total_amount: calculateTotal(),
          items: items.map(item => ({
            menu_id: item.menu.id, // menu_id 사용
            quantity: item.quantity
          }))
        };
        console.log("네이버페이 요청 URL:", paymentApiUrl);
        console.log("네이버페이 요청 Body:", paymentRequestBody);
      } else if (selectedPayment === 'kakao') {
        paymentApiUrl = 'http://116.124.191.174:15026/api/payment/kakao';
        paymentRequestBody = {
          order_id: orderResponseData.order_id.toString(),
          total_amount: calculateTotal(),
          item_name: items.length > 1
            ? `${items[0].menu.name} 외 ${items.length - 1}건`
            : items[0].menu.name,
          quantity: items.reduce((sum: number, item: any) => sum + item.quantity, 0)
        };
        console.log("카카오페이 요청 URL:", paymentApiUrl);
        console.log("카카오페이 요청 Body:", paymentRequestBody);
      } else {
        throw new Error('지원하지 않는 결제 수단입니다.');
      }

      const paymentResponse = await fetch(paymentApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        credentials: 'include',
        body: JSON.stringify(paymentRequestBody)
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.detail || '결제 처리에 실패했습니다.');
      }

      const paymentData = await paymentResponse.json();
      // Log the raw payment data received from the API
      console.log('결제 API Raw 응답 데이터:', JSON.stringify(paymentData)); 

      console.log('결제 응답 데이터 (parsed):', paymentData);

      // 카카오페이 tid를 sessionStorage에 저장
      console.log('TID 저장 조건 확인:', { selectedPayment, hasTid: paymentData && paymentData.hasOwnProperty('tid'), tidValue: paymentData?.tid });
      if (selectedPayment === 'kakao' && paymentData.tid) { 
        sessionStorage.setItem('kakaoPaymentTid', paymentData.tid);
        console.log('카카오페이 TID 저장됨:', paymentData.tid);
      } else {
        console.log('카카오페이 TID 저장 조건 실패 또는 TID 없음');
      }
      
      // API 응답 처리: 결제 수단에 따라 분기
      if (selectedPayment === 'kakao') {
        if (!paymentData || !paymentData.next_redirect_pc_url) { // 카카오 응답 필수값 체크
          console.error('카카오페이 응답 오류: 리디렉션 URL이 없습니다.', paymentData);
          throw new Error('카카오페이 처리 중 오류 발생 (리디렉션 URL 없음)');
        }
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        const redirectUrl = isMobile && paymentData.next_redirect_mobile_url
          ? paymentData.next_redirect_mobile_url
          : paymentData.next_redirect_pc_url;

        console.log(`카카오페이 리다이렉션 URL (${isMobile ? '모바일' : 'PC'}):`, redirectUrl);
        window.location.href = redirectUrl;

      } else if (selectedPayment === 'naver') {
        // 네이버페이 응답 처리 (SDK 파라미터 확인)
        if (!paymentData || !paymentData.merchantPayKey) { // 네이버 응답 필수값 예시 (merchantPayKey)
          console.error('네이버페이 응답 오류: 필수 파라미터가 없습니다.', paymentData);
          throw new Error('네이버페이 처리 중 오류 발생 (응답 파라미터 부족)');
        }
        console.log('네이버페이 SDK 파라미터 수신:', paymentData);
        toast.info('네이버페이 SDK 연동 준비 완료 (콘솔 확인)');
        // TODO: 여기에 수신한 paymentData를 사용하여 네이버페이 SDK의 결제 함수를 호출하는 코드를 추가해야 합니다.
        // 예시: Naver.Pay.open(paymentData);
        try {
          // 생성된 네이버페이 객체(window.naverPayInstance)를 사용하여 open 호출
          if (window.naverPayInstance) {
            console.log("Naver.Pay.open 호출 시도...");
            // returnUrl에 주문 ID(merchantPayKey) 추가
            const originalReturnUrl = paymentData.returnUrl;
            const orderId = paymentData.merchantPayKey; // 우리 시스템 주문 ID
            if (!orderId) {
              throw new Error('결제 데이터에 merchantPayKey(주문 ID)가 없습니다.');
            }
            const separator = originalReturnUrl.includes('?') ? '&' : '?';
            const returnUrlWithOrderId = `${originalReturnUrl}${separator}order_id=${encodeURIComponent(orderId)}`;
            
            const openParams = { ...paymentData, returnUrl: returnUrlWithOrderId };
            console.log('Modified open params with order_id in returnUrl:', openParams);
            
            window.naverPayInstance.open(openParams); // 수정된 파라미터로 open 호출
          } else {
            console.error("Naver Pay SDK 객체(window.naverPayInstance)가 생성되지 않았습니다.");
            toast.error("네이버페이 SDK를 로드할 수 없습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.");
          }
        } catch (sdkError) {
           console.error("Naver.Pay.open 호출 중 오류:", sdkError);
           toast.error("네이버페이 결제창을 여는 중 오류가 발생했습니다.");
        }

      } else {
        // 기타 결제 수단 처리 (현재는 없음)
        console.error('알 수 없는 결제 수단 응답 처리:', selectedPayment, paymentData);
        throw new Error('알 수 없는 결제 수단입니다.');
      }

    } catch (error) {
      console.error('결제 처리 중 오류:', error);
      toast.error(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">결제하기</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <CheckoutCart />
        </div>
        <div>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">결제 방법 선택</h2>
            {isClient ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="kakao"
                    name="payment"
                    value="kakao"
                    checked={selectedPayment === 'kakao'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    className="form-radio"
                  />
                  <label htmlFor="kakao" className="flex items-center space-x-2">
                    <KakaoPayIcon />
                    <span>카카오페이</span>
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="naver"
                    name="payment"
                    value="naver"
                    checked={selectedPayment === 'naver'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    className="form-radio"
                  />
                  <label htmlFor="naver" className="flex items-center space-x-2">
                    <NaverPayIcon />
                    <span>네이버페이</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="h-10"></div>
            )}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">결제 금액</h3>
              <p className="text-2xl font-bold">{calculateTotal().toLocaleString()}원</p>
            </div>
            <Button
              className="w-full mt-6"
              onClick={handlePayment}
              disabled={isProcessing || !isClient}
            >
              {isProcessing ? '처리 중...' : '결제하기'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
} 