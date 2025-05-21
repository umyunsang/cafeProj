'use client';

import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import type { CartItem } from '@/contexts/CartContext'; // CartItem 타입 import

interface OrderSummaryCardProps {
  items: CartItem[] | null; // CheckoutPage에서 items 상태
  calculateTotal: () => number; // CheckoutPage의 calculateTotal 함수
  handlePayment: () => Promise<void>; // CheckoutPage의 handlePayment 함수
  isProcessing: boolean; // 결제 처리 중 상태
  selectedPayment: string; // 선택된 결제 방법
}

export function OrderSummaryCard({
  items,
  calculateTotal,
  handlePayment,
  isProcessing,
  selectedPayment,
}: OrderSummaryCardProps) {
  const totalAmount = calculateTotal();

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="text-xl">3. 최종 결제 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-lg">
          <span>총 상품 금액</span>
          <span>{totalAmount.toLocaleString()}원</span>
        </div>
        {/* 향후 배송비, 할인 등의 항목이 추가될 수 있는 영역 */}
        <div className="border-t border-dashed pt-4 mt-4 flex justify-between text-xl font-bold">
          <span>총 결제 금액</span>
          <span>{totalAmount.toLocaleString()}원</span>
        </div>
        <div className="mt-6 pt-4 border-t border-border flex items-center text-sm text-muted-foreground">
          <Lock size={16} className="mr-2 shrink-0" />
          <p>모든 결제 정보는 안전하게 암호화되어 전송되며, 외부에 노출되지 않습니다.</p>
        </div>
      </CardContent>
      <CardFooter>
        <LoadingButton
          size="lg"
          className="w-full text-lg py-6"
          onClick={handlePayment}
          isLoading={isProcessing}
          loadingText="결제 처리 중..."
          disabled={!selectedPayment || !items || items.length === 0}
        >
          {`${totalAmount.toLocaleString()}원 결제하기`}
        </LoadingButton>
      </CardFooter>
    </Card>
  );
} 