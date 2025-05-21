'use client';

// import { Button } from '@/components/ui/button'; // PaymentOptionButton으로 대체
import { PaymentOptionButton } from '@/components/payment/PaymentOptionButton'; // 경로 수정 가능성 있음
import { NaverPayIcon, KakaoPayIcon } from '@/components/payment/PaymentIcons';
import { PAYMENT_METHODS } from '@/config/constants';

interface PaymentMethodSelectorProps {
  selectedPayment: string;
  onPaymentSelect: (method: string) => void;
  disabled?: boolean; // 전체 비활성화 옵션
}

export function PaymentMethodSelector({
  selectedPayment,
  onPaymentSelect,
  disabled = false,
}: PaymentMethodSelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <PaymentOptionButton
        methodName="네이버페이"
        icon={<NaverPayIcon className="w-7 h-7" />}
        isSelected={selectedPayment === PAYMENT_METHODS.NAVER}
        onClick={() => onPaymentSelect(PAYMENT_METHODS.NAVER)}
        disabled={disabled}
      />
      <PaymentOptionButton
        methodName="카카오페이"
        icon={<KakaoPayIcon className="w-7 h-7" />}
        isSelected={selectedPayment === PAYMENT_METHODS.KAKAO}
        onClick={() => onPaymentSelect(PAYMENT_METHODS.KAKAO)}
        disabled={disabled}
      />
    </div>
  );
}
