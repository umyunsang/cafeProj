'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { format, addHours } from 'date-fns';
import { ko } from 'date-fns/locale';

// 백엔드 OrderResponse 스키마와 일치하는 인터페이스
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

export default function OrdersPage() {
  const router = useRouter();
  const { sessionId } = useCart();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/orders', {
          headers: {
            'X-Session-ID': sessionId || '',
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || '주문 내역을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setOrders(data);
      } catch (error) {
        console.error('주문 내역 조회 오류:', error);
        setError(error instanceof Error ? error.message : '주문 내역을 불러오는데 실패했습니다.');
        toast.error('주문 내역을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      fetchOrders();
    } else {
      setIsLoading(false);
      setError('로그인이 필요합니다.');
    }
  }, [sessionId]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '결제 대기';
      case 'paid':
        return '결제 완료';
      case 'completed':
        return '주문 완료';
      case 'cancelled':
        return '주문 취소';
      default:
        return status;
    }
  };

  const getPaymentMethodText = (method: string | null) => {
    switch (method) {
      case 'kakao':
        return '카카오페이';
      case 'naver':
        return '네이버페이';
      default:
        return method || '알 수 없음';
    }
  };

  // UTC 시간을 KST(한국 시간)로 변환하는 함수
  const formatToKST = (dateString: string | null) => {
    if (!dateString) return '날짜 정보 없음';
    
    try {
      // UTC 시간을 Date 객체로 변환
      const date = new Date(dateString);
      // UTC 시간에 9시간을 더해 KST로 변환
      const kstDate = addHours(date, 9);
      // 한국 로케일로 포맷팅
      return format(kstDate, 'PPP p', { locale: ko });
    } catch (error) {
      console.error('날짜 변환 오류:', error);
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">주문 내역을 불러오는 중입니다...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">주문 내역</h1>
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>홈으로 돌아가기</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">주문 내역</h1>
      
      {orders.length === 0 ? (
        <Card className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <p className="text-gray-500 mb-4">주문 내역이 없습니다.</p>
            <Button onClick={() => router.push('/menu')}>메뉴 보기</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="max-w-4xl mx-auto p-6">
              <div className="flex flex-col md:flex-row justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">주문 #{order.id}</h2>
                  <p className="text-gray-600">
                    {formatToKST(order.created_at)}
                  </p>
                </div>
                <div className="text-right mt-2 md:mt-0">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'paid' || order.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : order.status === 'cancelled' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">결제 방법</p>
                    <p className="font-medium">{getPaymentMethodText(order.payment_method)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">결제 금액</p>
                    <p className="font-medium">{order.total_amount.toLocaleString()}원</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">주문 상품</h3>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{item.menu_name}</span>
                          <span className="text-gray-500 ml-2">x {item.quantity}</span>
                        </div>
                        <span>{item.total_price.toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/payments/success?order_id=${order.id}`)}
                  >
                    상세 정보
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 