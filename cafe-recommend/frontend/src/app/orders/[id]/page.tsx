'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label";
import { ArrowLeft, Package, User, Clock, CreditCard, AlertCircle, ShoppingBag } from 'lucide-react';
import { RootLayoutClient } from '@/components/layout/RootLayoutClient';
import { toast } from 'sonner';

// API 기본 URL - 환경변수 또는 설정 파일에서 가져오는 것이 좋음
const API_BASE_URL = 'http://116.124.191.174:15049'; 

interface OrderItem {
  id: number;
  menu_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  // menu_image_url?: string; // 필요시 추가
}

interface OrderDetails {
  id: string; // 주문 ID (보통 UUID 또는 문자열)
  user_id?: string; // 사용자 ID (세션 기반이므로, 여기서는 선택적)
  items: OrderItem[];
  total_amount: number;
  order_status: string; // 예: PENDING, PROCESSING, COMPLETED, CANCELLED
  payment_method: string; // 예: KAKAO, NAVER, CARD
  created_at: string; // 주문 생성 시간 (ISO 문자열)
  updated_at?: string; // 주문 업데이트 시간
  // PickupInfo 관련 정보 (API 응답에 따라 추가)
  pickup_option?: 'store' | 'takeout';
  customer_nickname?: string;
  estimated_pickup_time?: string; // 예상 픽업 시간 (있다면)
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      const fetchOrderDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const sessionId = localStorage.getItem('userSessionId') || sessionStorage.getItem('userSessionId');
          if (!sessionId) {
            setError("세션 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
            toast.error("세션 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
            // router.push('/auth/login'); // 로그인 페이지로 리디렉션
            setIsLoading(false);
            return;
          }

          // 실제 API 엔드포인트로 수정 필요
          const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': sessionId, // 세션 ID를 헤더에 포함
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('주문 정보를 찾을 수 없습니다.');
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `주문 상세 정보를 불러오는데 실패했습니다. (상태: ${response.status})`);
          }
          const data: OrderDetails = await response.json();
          setOrderDetails(data);
        } catch (err) {
          console.error("Error fetching order details:", err);
          setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchOrderDetails();
    }
  }, [orderId, router]);

  const getStatusBadgeVariant = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case '결제완료':
      case '주문완료':
        return 'success';
      case 'pending':
      case '결제대기':
        return 'outline';
      case 'processing':
      case '준비중':
        return 'secondary';
      case 'cancelled':
      case '주문취소':
        return 'destructive';
      default:
        return 'default';
    }
  };
  
  const formatOrderStatus = (status: string | undefined): string => {
    if (!status) return "알 수 없음";
    const statusMap: { [key: string]: string } = {
      pending: "결제 대기중",
      processing: "상품 준비중",
      shipped: "배송중", // 카페 프로젝트에는 없을 수 있음
      delivered: "픽업 완료", // 카페 프로젝트에는 없을 수 있음
      completed: "주문 완료",
      cancelled: "주문 취소",
      failed: "결제 실패",
      // 백엔드에서 오는 실제 상태값에 맞춰 추가
      PAYMENT_PENDING: "결제 대기중",
      PAYMENT_COMPLETED: "결제 완료",
      ORDER_CONFIRMED: "주문 확정",
      PREPARING_ORDER: "상품 준비중",
      READY_FOR_PICKUP: "픽업 준비 완료",
      ORDER_COMPLETED: "주문 완료", // 픽업까지 완료된 상태
      ORDER_CANCELLED: "주문 취소",
    };
    return statusMap[status.toUpperCase()] || status;
  };

  const formatPaymentMethod = (method: string | undefined): string => {
    if (!method) return "알 수 없음";
    const methodMap: { [key: string]: string } = {
      kakao: "카카오페이",
      naver: "네이버페이",
      card: "신용카드", // 일반적인 카드 결제
      // 백엔드 값에 따라 추가
      KAKAOPAY: "카카오페이",
      NAVERPAY: "네이버페이",
    };
    return methodMap[method.toUpperCase()] || method;
  };


  if (isLoading) {
    return (
      <RootLayoutClient>
        <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
          <p className="ml-4 text-lg">주문 상세 정보를 불러오는 중...</p>
        </div>
      </RootLayoutClient>
    );
  }

  if (error) {
    return (
      <RootLayoutClient>
        <div className="container mx-auto py-8 px-4 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center text-destructive">
                <AlertCircle size={28} className="mr-2" /> 오류 발생
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-6">{error}</p>
              <Button onClick={() => router.push('/orders')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> 주문 목록으로 돌아가기
              </Button>
            </CardContent>
          </Card>
        </div>
      </RootLayoutClient>
    );
  }

  if (!orderDetails) {
    return (
      <RootLayoutClient>
        <div className="container mx-auto py-8 px-4 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>주문 정보를 찾을 수 없습니다.</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-6">요청하신 주문 정보를 찾을 수 없습니다. 주문 ID를 다시 확인해주세요.</p>
              <Button onClick={() => router.push('/orders')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> 주문 목록으로 돌아가기
              </Button>
            </CardContent>
          </Card>
        </div>
      </RootLayoutClient>
    );
  }

  return (
    <RootLayoutClient>
      <div className="container mx-auto py-8 px-4">
        <Button onClick={() => router.push('/orders')} variant="outline" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> 주문 목록으로
        </Button>

        <Card className="max-w-3xl mx-auto shadow-lg">
          <CardHeader className="bg-muted/30">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <CardTitle className="text-2xl font-bold">주문 상세 내역</CardTitle>
                <CardDescription>주문 ID: {orderDetails.id}</CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(orderDetails.order_status)} className="mt-2 sm:mt-0 text-sm px-3 py-1">
                {formatOrderStatus(orderDetails.order_status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><ShoppingBag className="mr-2 h-5 w-5 text-primary" />주문 상품 정보</h3>
              <div className="space-y-3">
                {orderDetails.items.map(item => (
                  <div key={item.id || item.menu_id} className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/20">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.unit_price.toLocaleString()}원 x {item.quantity}개
                      </p>
                    </div>
                    <p className="font-semibold">{item.total_price.toLocaleString()}원</p>
                  </div>
                ))}
              </div>
              <div className="text-right mt-4 pt-4 border-t">
                <p className="text-lg font-bold">총 주문 금액: {orderDetails.total_amount.toLocaleString()}원</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><Package className="mr-2 h-5 w-5 text-primary" />픽업 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                <div>
                  <Label className="text-muted-foreground">주문자 (호출명)</Label>
                  <p className="font-medium">{orderDetails.customer_nickname || '미지정'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">픽업 방식</Label>
                  <p className="font-medium">
                    {orderDetails.pickup_option === 'store' && '매장 이용'}
                    {orderDetails.pickup_option === 'takeout' && '포장'}
                    {!orderDetails.pickup_option && '정보 없음'}
                  </p>
                </div>
                {orderDetails.estimated_pickup_time && (
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">예상 픽업 시간</Label>
                    <p className="font-medium">{new Date(orderDetails.estimated_pickup_time).toLocaleString('ko-KR')}</p>
                  </div>
                )}
              </div>
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><CreditCard className="mr-2 h-5 w-5 text-primary" />결제 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                <div>
                  <Label className="text-muted-foreground">결제 수단</Label>
                  <p className="font-medium">{formatPaymentMethod(orderDetails.payment_method)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">결제 상태</Label>
                  <Badge variant={getStatusBadgeVariant(orderDetails.order_status)} className="text-sm">
                    {formatOrderStatus(orderDetails.order_status)}
                  </Badge>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><Clock className="mr-2 h-5 w-5 text-primary" />주문 시간 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                <div>
                  <Label className="text-muted-foreground">주문 생성일</Label>
                  <p className="font-medium">{new Date(orderDetails.created_at).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {orderDetails.updated_at && (
                  <div>
                    <Label className="text-muted-foreground">최근 업데이트</Label>
                    <p className="font-medium">{new Date(orderDetails.updated_at).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
              </div>
            </section>
          </CardContent>
          <CardFooter className="bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">SipSmart를 이용해주셔서 감사합니다. 맛있게 드세요!</p>
          </CardFooter>
        </Card>
      </div>
      {/* Toaster 사용을 위해 RootLayoutClient 또는 해당 페이지에 Toaster 컴포넌트가 있어야 함 */}
      {/* <Toaster richColors position="top-center" /> */}
    </RootLayoutClient>
  );
} 