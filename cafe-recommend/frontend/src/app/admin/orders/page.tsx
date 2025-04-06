'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OrderItem {
  id: number;
  menu_id: number;
  quantity: number;
  menu: {
    name: string;
    price: number;
  };
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const searchOrder = async () => {
    if (!orderNumber.trim()) {
      toast.error('주문번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderNumber}`);
      if (!response.ok) throw new Error('주문을 찾을 수 없습니다.');
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      toast.error('주문 조회에 실패했습니다.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">주문 관리</h1>

      <Card className="p-6 mb-8">
        <div className="flex gap-4">
          <Input
            placeholder="주문번호 입력"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="flex-1"
          />
          <Button onClick={searchOrder} disabled={loading}>
            {loading ? '검색 중...' : '검색'}
          </Button>
        </div>
      </Card>

      {order && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">주문 상세 정보</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500">주문번호</p>
                <p className="font-medium">{order.order_number}</p>
              </div>
              <div>
                <p className="text-gray-500">주문 상태</p>
                <p className="font-medium">{order.status}</p>
              </div>
              <div>
                <p className="text-gray-500">주문 일시</p>
                <p className="font-medium">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">총 금액</p>
                <p className="font-medium">{order.total_amount.toLocaleString()}원</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">주문 항목</h3>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.menu.name}</p>
                      <p className="text-sm text-gray-500">{item.quantity}개</p>
                    </div>
                    <p className="font-medium">{(item.menu.price * item.quantity).toLocaleString()}원</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
} 