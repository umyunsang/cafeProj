interface CartSummaryProps {
  cart: {
    id: number;
    items: Array<{
      id: number;
      menu_id: number;
      quantity: number;
      menu?: {
        id: number;
        name: string;
        price: number;
      };
    }>;
    total_price: number;
  };
}

export function CartSummary({ cart }: CartSummaryProps) {
  const total = cart.items.reduce(
    (sum, item) => sum + (item.menu?.price || 0) * item.quantity,
    0
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>소계</span>
        <span>{total.toLocaleString()}원</span>
      </div>
      <div className="flex justify-between font-medium text-lg pt-2 border-t">
        <span>총계</span>
        <span>{total.toLocaleString()}원</span>
      </div>
    </div>
  );
} 