import { useCart } from '@/contexts/CartContext';
import { Card } from '@/components/ui/card';

export default function CheckoutCart() {
  const { cart } = useCart();

  if (!cart?.items?.length) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">장바구니가 비어있습니다.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">주문 상품</h2>
      <div className="space-y-4">
        {cart.items.map((item: any) => (
          <div key={item.menu.id} className="flex justify-between items-center py-2 border-b">
            <div>
              <p className="font-medium">{item.menu.name}</p>
              <p className="text-sm text-gray-500">{item.quantity}개</p>
            </div>
            <p className="font-medium">{(item.menu.price * item.quantity).toLocaleString()}원</p>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between items-center">
          <span className="font-semibold">총 결제금액</span>
          <span className="text-xl font-bold">
            {cart.items.reduce((sum: number, item: any) => sum + (item.menu.price * item.quantity), 0).toLocaleString()}원
          </span>
        </div>
      </div>
    </Card>
  );
} 