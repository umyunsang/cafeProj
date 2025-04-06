'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PaymentFailPage() {
  const router = useRouter();

  useEffect(() => {
    toast.error('결제가 실패했습니다. 다시 시도해주세요.');
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-lg mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">결제 실패</h1>
        <p className="text-gray-600 mb-6">
          결제 처리 중 문제가 발생했습니다.
          다시 시도해주시기 바랍니다.
        </p>
        <div className="space-x-4">
          <Button onClick={() => router.push('/checkout')}>
            다시 시도하기
          </Button>
          <Button onClick={() => router.push('/menu')} variant="outline">
            메뉴로 돌아가기
          </Button>
        </div>
      </Card>
    </div>
  );
} 