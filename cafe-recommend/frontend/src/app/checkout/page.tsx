'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckoutCart } from '@/components/checkout/CheckoutCart';
// import { NaverPayIcon, KakaoPayIcon } from '@/components/payment/PaymentIcons'; // PaymentMethodSelector로 이동
// import { Lock } from 'lucide-react'; // OrderSummaryCard로 이동
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { apiClient } from '@/lib/apiClient';
import { LOCAL_STORAGE_KEYS, API_ENDPOINTS, PAYMENT_METHODS, CHECKOUT_PROCESS } from '@/config/constants'; 

// 새로 만든 UI 컴포넌트 import
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector';
import { OrderSummaryCard } from '@/components/checkout/OrderSummaryCard';

// API 응답 타입을 위한 인터페이스 정의 (예시, 실제 응답 구조에 맞게 수정 필요)
interface MenuItemInfo {
  menu_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderRequestData {
  payment_method: string;
  total_amount: number;
  items: MenuItemInfo[];
}

interface OrderResponse {
  order_id: string | number; // 실제 타입에 맞게 조정
  // ... 기타 주문 관련 필드
}

interface NaverPayPrepareRequest {
  total_amount: number;
  items: { menu_id: number; quantity: number }[];
}

interface KakaoPayPrepareRequest {
  order_id: string;
  total_amount: number;
  item_name: string;
  quantity: number; 
}

interface PaymentPrepareResponse {
  // 카카오페이
  next_redirect_pc_url?: string;
  next_redirect_mobile_url?: string;
  tid?: string;
  // 네이버페이
  merchantPayKey?: string;
  returnUrl?: string;
  // ... 기타 PG사별 필드
}

export default function CheckoutPage() {
  const { items, sessionId, fetchCart, error: cartError, isLoading: cartLoading } = useCart();
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fetchAttempts = useRef(0);
  const router = useRouter();

  // 1. 컴포넌트가 클라이언트에서 실행 중인지 설정
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 2. 클라이언트에서 실행될 때, 저장된 결제 방법 복원
  useEffect(() => {
    if (isClient) {
      const savedPaymentMethod = localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_PAYMENT_METHOD);
      if (savedPaymentMethod) {
        setSelectedPayment(savedPaymentMethod);
      }
    }
  }, [isClient]);

  // 3. 장바구니 데이터 로드 및 로컬 스토리지에서 초기 데이터 복원 (useCart 개선 여지 있음)
  useEffect(() => {
    if (!isClient) return; // 클라이언트에서만 실행

    let localCartInitialized = false;
    const storedCartData = localStorage.getItem(LOCAL_STORAGE_KEYS.CAFE_CART_DATA);
    if (storedCartData) {
      try {
        const parsedCart = JSON.parse(storedCartData);
        if (parsedCart && parsedCart.items && parsedCart.items.length > 0) {
          // useCart 컨텍스트가 로컬스토리지에서 초기화하는 기능이 있다면 그것을 활용
          // 여기서는 일단 이 페이지 자체의 isInitialized 상태만 관리
          setIsInitialized(true);
          localCartInitialized = true;
          console.log('localStorage에서 장바구니 데이터로 초기 UI 구성');
        }
      } catch (err) {
        console.error('로컬 스토리지 장바구니 데이터 파싱 오류:', err);
      }
    }

    const loadCartData = async () => {
      if (fetchAttempts.current >= CHECKOUT_PROCESS.MAX_FETCH_ATTEMPTS) { // 상수 사용
        if (!localCartInitialized) {
          setLoadError('장바구니 데이터를 불러오는데 실패했습니다. 나중에 다시 시도해주세요.');
        }
        return;
      }

      try {
        fetchAttempts.current += 1;
        await fetchCart(); // useCart의 fetchCart 호출
        setIsInitialized(true); // API 호출 성공 시 최종 초기화 완료
        setLoadError(null);
      } catch (error) {
        console.error('장바구니 데이터 로드 실패 (API):', error);
        if (!localCartInitialized) { // 로컬 데이터로도 초기화 안된 경우에만 에러 표시
          setLoadError('장바구니 정보를 불러오는데 실패했습니다.');
          // setIsInitialized(true); // 오류가 나도 페이지는 접근 가능하게 할지 여부 결정
        }
      }
    };

    if (!cartLoading) { // cart가 이미 로딩중이 아니라면 로드 시도
        loadCartData();
    }

  }, [isClient, fetchCart, cartLoading]); // cartLoading 추가

  // 4. 선택된 결제 방법 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    if (isClient && selectedPayment) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_PAYMENT_METHOD, selectedPayment);
    }
  }, [isClient, selectedPayment]);

  // 5. 페이지 벗어나기 직전, 선택된 결제 방법 저장 (선택적, 4번과 중복될 수 있음)
  useEffect(() => {
    if (!isClient) return;

    const handleBeforeUnload = () => {
      if (selectedPayment) { // 이미 4번에서 selectedPayment 변경 시마다 저장하므로, 이 부분은 백업용 또는 다른 로직 대체 가능
        // localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_PAYMENT_METHOD, selectedPayment);
        console.log('beforeunload: selectedPayment 저장 시도 (현재는 주석 처리됨)');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isClient, selectedPayment]);

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
      const orderRequestData: OrderRequestData = {
        payment_method: selectedPayment,
        total_amount: calculateTotal(),
        items: items.map(item => ({
          menu_id: item.menu.id,
          name: item.menu.name,
          quantity: item.quantity,
          unit_price: item.menu?.price || 0,
          total_price: (item.menu?.price || 0) * item.quantity
        }))
      };
      console.log('주문 요청 데이터:', orderRequestData);

      const orderResponseData = await apiClient.post<OrderResponse, OrderRequestData>(
        API_ENDPOINTS.ORDER,
        orderRequestData,
        { includeSessionId: true, sessionId: sessionId }
      );

      console.log('주문 응답 데이터:', orderResponseData);

      if (!orderResponseData.order_id) {
        throw new Error('주문 ID를 받지 못했습니다.');
      }

      let paymentApiEndpoint = ''; 
      let paymentRequestBody: NaverPayPrepareRequest | KakaoPayPrepareRequest;

      if (selectedPayment === PAYMENT_METHODS.NAVER) {
        paymentApiEndpoint = API_ENDPOINTS.NAVER_PAY_PREPARE;
        paymentRequestBody = {
          total_amount: calculateTotal(),
          items: items.map(item => ({
            menu_id: item.menu.id,
            quantity: item.quantity
          }))
        } satisfies NaverPayPrepareRequest;
        console.log("네이버페이 요청 Endpoint:", paymentApiEndpoint);
        console.log("네이버페이 요청 Body:", paymentRequestBody);
      } else if (selectedPayment === PAYMENT_METHODS.KAKAO) {
        paymentApiEndpoint = API_ENDPOINTS.KAKAO_PAY_PREPARE;
        paymentRequestBody = {
          order_id: orderResponseData.order_id.toString(),
          total_amount: calculateTotal(),
          item_name: items.length > 1
            ? `${items[0].menu.name} 외 ${items.length - 1}건`
            : items[0].menu.name,
          quantity: items.reduce((sum: number, item: any) => sum + item.quantity, 0)
        } satisfies KakaoPayPrepareRequest;
        console.log("카카오페이 요청 Endpoint:", paymentApiEndpoint);
        console.log("카카오페이 요청 Body:", paymentRequestBody);
      } else {
        throw new Error('지원하지 않는 결제 수단입니다.');
      }

      const paymentData = await apiClient.post<PaymentPrepareResponse, NaverPayPrepareRequest | KakaoPayPrepareRequest>(
        paymentApiEndpoint,
        paymentRequestBody,
        { includeSessionId: true, sessionId: sessionId }
      );

      console.log('결제 API 응답 데이터 (parsed):', paymentData);

      // 결제 정보 로컬 스토리지에 저장 (결제 완료 후 복구 목적)
      localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_PAYMENT_DATA, JSON.stringify({
        order_id: orderResponseData.order_id,
        payment_method: selectedPayment,
        timestamp: new Date().toISOString()
      }));

      // API 응답 처리: 결제 수단에 따라 분기
      if (selectedPayment === PAYMENT_METHODS.KAKAO) {
        if (!paymentData || !paymentData.next_redirect_pc_url) {
          console.error('카카오페이 응답 오류: 리디렉션 URL이 없습니다.', paymentData);
          throw new Error('카카오페이 처리 중 오류 발생 (리디렉션 URL 없음)');
        }
        
        if (paymentData.tid && orderResponseData.order_id) {
          console.log('카카오페이 TID 및 Order ID 저장:', paymentData.tid, orderResponseData.order_id);
          sessionStorage.setItem(LOCAL_STORAGE_KEYS.KAKAO_PAYMENT_INFO, JSON.stringify({
            tid: paymentData.tid, 
            orderId: orderResponseData.order_id.toString() 
          }));
        } else {
          console.error('카카오페이 TID 또는 주문 ID가 없습니다:', paymentData, orderResponseData);
          throw new Error('카카오페이 처리 중 TID 또는 주문 ID를 받지 못했습니다.');
        }
        
        // 카카오페이 리다이렉션 URL로 이동
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        const redirectUrl = isMobile && paymentData.next_redirect_mobile_url
          ? paymentData.next_redirect_mobile_url
          : paymentData.next_redirect_pc_url;

        console.log(`카카오페이 리다이렉션 URL (${isMobile ? '모바일' : 'PC'}):`, redirectUrl);
        
        // URL에 order_id가 없다면 추가
        let finalRedirectUrl = redirectUrl;
        if (!redirectUrl.includes('order_id=')) {
          const separator = redirectUrl.includes('?') ? '&' : '?';
          finalRedirectUrl = `${redirectUrl}${separator}order_id=${orderResponseData.order_id}`;
        }
        
        console.log('최종 리다이렉션 URL:', finalRedirectUrl);
        window.location.href = finalRedirectUrl;
      } else if (selectedPayment === PAYMENT_METHODS.NAVER) {
        // 네이버페이 응답 처리 (SDK 파라미터 확인)
        if (!paymentData || !paymentData.merchantPayKey) { 
          console.error('네이버페이 응답 오류: 필수 파라미터가 없습니다.', paymentData);
          throw new Error('네이버페이 처리 중 오류 발생 (응답 파라미터 부족)');
        }
        console.log('네이버페이 SDK 파라미터 수신:', paymentData);
        toast.info('네이버페이 SDK 연동 준비 완료 (콘솔 확인)');
        
        try {
          if (window.naverPayInstance) {
            console.log("Naver.Pay.open 호출 시도...");
            const originalReturnUrl = paymentData.returnUrl;
            if (!originalReturnUrl) { 
              throw new Error('네이버페이 응답 데이터에 returnUrl이 없습니다.');
            }

            const orderId = paymentData.merchantPayKey; 
            if (!orderId) {
              throw new Error('결제 데이터에 merchantPayKey(주문 ID)가 없습니다.');
            }
            const separator = originalReturnUrl.includes('?') ? '&' : '?';
            const returnUrlWithOrderId = `${originalReturnUrl}${separator}order_id=${encodeURIComponent(orderId)}`;
            
            const openParams = { ...paymentData, returnUrl: returnUrlWithOrderId };
            console.log('Modified open params with order_id in returnUrl:', openParams);
            
            localStorage.setItem(LOCAL_STORAGE_KEYS.NAVER_PAYMENT_KEY, paymentData.merchantPayKey);
            
            window.naverPayInstance.open(openParams); 
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

  // 로딩 상태 처리
  if (!isClient || !isInitialized || cartLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
      </div>
    );
  }

  // 장바구니가 비어 있거나 로드 오류 발생 시
  if ((!items || items.length === 0 || loadError) && isInitialized) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-8">주문결제</h1>
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">장바구니에 상품이 없습니다.</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              {loadError || "결제할 상품이 없습니다. 장바구니에 상품을 먼저 담아주세요."}
            </p>
            <Button onClick={() => router.push('/menu')}>메뉴 보러 가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">주문결제</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 왼쪽: 주문 상품 및 결제 수단 */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">1. 주문 상품 확인</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckoutCart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">2. 결제 수단 선택</CardTitle>
            </CardHeader>
            <CardContent>
              {/* PaymentMethodSelector 컴포넌트 사용 */}
              <PaymentMethodSelector 
                selectedPayment={selectedPayment}
                onPaymentSelect={setSelectedPayment}
                disabled={isProcessing} // 결제 처리 중에는 선택 비활성화
              />
              {cartError && <p className="mt-4 text-sm text-destructive">{cartError}</p>}
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽: 주문 요약 및 결제 버튼 */}
        <div className="lg:col-span-1">
          {/* OrderSummaryCard 컴포넌트 사용 */}
          <OrderSummaryCard 
            items={items}
            calculateTotal={calculateTotal}
            handlePayment={handlePayment}
            isProcessing={isProcessing}
            selectedPayment={selectedPayment}
          />
        </div>
      </div>
    </div>
  );
} 