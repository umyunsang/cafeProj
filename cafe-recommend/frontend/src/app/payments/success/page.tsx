'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // URL 파라미터에서 결제 정보 추출
    const params = new URLSearchParams(window.location.search);
    const pg_token = params.get('pg_token');
    
    if (pg_token) {
      // TODO: 결제 승인 요청 처리
      console.log('결제 승인 토큰:', pg_token);
      toast.success('결제가 성공적으로 완료되었습니다.');
    } else {
      toast.error('결제 정보를 찾을 수 없습니다.');
      router.push('/checkout');
    }
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-lg mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">결제 완료</h1>
        <p className="text-gray-600 mb-6">
          결제가 성공적으로 완료되었습니다.
          주문 내역은 마이페이지에서 확인하실 수 있습니다.
        </p>
        <div className="space-x-4">
          <Button onClick={() => router.push('/menu')}>
            메뉴로 돌아가기
          </Button>
          <Button onClick={() => router.push('/mypage/orders')} variant="outline">
            주문 내역 보기
          </Button>
        </div>
      </Card>
    </div>
  );
} 