'use client';

import { Card } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';

interface CheckoutCartProps {
  onError?: (error: string) => void;
}

export function CheckoutCart({ onError }: CheckoutCartProps) {
  const { items, loading, error } = useCart();

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">장바구니가 비어있습니다.</p>
      </div>
    );
  }

  const calculateSubtotal = () => {
    return items.reduce((total, item) => {
      return total + (item.menu.price * item.quantity);
    }, 0);
  };

  const calculateTotal = () => {
    return Math.round(calculateSubtotal());
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">주문 내역</h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">{item.menu.name}</h3>
                <p className="text-sm text-gray-500">{item.quantity}개</p>
              </div>
              <p className="font-medium">
                {(item.menu.price * item.quantity).toLocaleString()}원
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">결제 금액</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>소계</span>
            <span>{calculateSubtotal().toLocaleString()}원</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>총 결제금액</span>
            <span>{calculateTotal().toLocaleString()}원</span>
          </div>
        </div>
      </Card>
    </div>
  );
} 