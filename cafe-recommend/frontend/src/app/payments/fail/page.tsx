'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { XCircle, AlertTriangle, RefreshCw, CreditCard, HelpCircle } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

// 결제 실패 유형별 정보 정의
interface FailureTypeInfo {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  solution: string;
}

// 결제 실패 유형별 정보 매핑
const failureTypeMap: Record<string, FailureTypeInfo> = {
  user_cancel: {
    icon: <XCircle className="h-12 w-12 text-yellow-500" />,
    title: '결제 취소됨',
    description: '결제가 사용자에 의해 취소되었습니다.',
    color: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20',
    solution: '결제를 계속 진행하시려면 다시 시도해주세요.'
  },
  payment_failed: {
    icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
    title: '결제 실패',
    description: '결제 처리 중 오류가 발생했습니다.',
    color: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
    solution: '카드 정보를 확인하시거나 다른 결제 수단을 이용해보세요.'
  },
  quota_exceeded: {
    icon: <CreditCard className="h-12 w-12 text-orange-500" />,
    title: '한도 초과',
    description: '결제 수단의 한도가 초과되었습니다.',
    color: 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20',
    solution: '다른 결제 수단을 이용하시거나 한도를 확인해주세요.'
  },
  timeout: {
    icon: <RefreshCw className="h-12 w-12 text-blue-500" />,
    title: '시간 초과',
    description: '결제 처리 시간이 초과되었습니다.',
    color: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20',
    solution: '네트워크 상태를 확인하고 다시 시도해주세요.'
  },
  default: {
    icon: <HelpCircle className="h-12 w-12 text-gray-500" />,
    title: '결제 실패',
    description: '결제 처리 중 문제가 발생했습니다.',
    color: 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/20',
    solution: '다시 시도하시거나 다른 결제 수단을 이용해보세요.'
  }
};

function PaymentFailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-2xl font-bold mb-4">결제 실패 정보 확인 중...</h1>
      <p className="text-gray-600 mb-6">잠시만 기다려주세요.</p>
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    </div>
  );
}

function PaymentFailDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failureType, setFailureType] = useState<string>('default');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { items } = useCart();

  useEffect(() => {
    // URL 파라미터에서 실패 원인과 메시지 추출
    const reason = searchParams.get('reason');
    const message = searchParams.get('message');
    
    // 세션 스토리지에서 추가 오류 정보 확인
    const storedError = sessionStorage.getItem('payment_error');
    
    console.log('결제 실패 정보:', { reason, message, storedError });
    
    // 실패 유형 결정
    let currentFailureType = 'default';
    if (reason && failureTypeMap[reason]) {
      currentFailureType = reason;
    } else if (reason === 'UserCancel' || reason === 'cancel') {
      currentFailureType = 'user_cancel';
    }
    setFailureType(currentFailureType);
    
    // 오류 메시지 설정
    if (message) {
      setErrorMessage(message);
    } else if (storedError) {
      setErrorMessage(storedError);
      // 사용 후 세션 스토리지 정리
      sessionStorage.removeItem('payment_error');
    }
    
    // 알림 표시
    toast.error(failureTypeMap[currentFailureType].title);
  }, [searchParams]);

  // 결제 재시도
  const handleRetry = () => {
    // 장바구니가 비어있으면 메뉴 페이지로 리디렉션
    if (!items || items.length === 0) {
      toast.info('장바구니가 비어 있습니다. 메뉴 페이지로 이동합니다.');
      router.push('/menu');
    } else {
      router.push('/checkout');
    }
  };

  // 장바구니로 이동
  const handleViewCart = () => {
    router.push('/cart');
  };

  // 메뉴로 돌아가기
  const handleGoToMenu = () => {
    router.push('/menu');
  };

  // 활성 실패 유형 정보
  const activeFailureInfo = failureTypeMap[failureType] || failureTypeMap.default;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className={`max-w-lg mx-auto ${activeFailureInfo.color}`}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            {activeFailureInfo.icon}
          </div>
          <CardTitle className="text-2xl">{activeFailureInfo.title}</CardTitle>
          <CardDescription className="text-base">
            {activeFailureInfo.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center">
          {errorMessage && (
            <div className="bg-background/80 p-4 rounded-md mb-4 text-sm">
              <p className="font-semibold mb-1">오류 상세:</p>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>
          )}
          
          <p className="mt-2 text-sm md:text-base">
            {activeFailureInfo.solution}
          </p>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-3">
          <Button 
            onClick={handleRetry} 
            className="w-full sm:w-auto"
            variant="default"
          >
            다시 시도하기
          </Button>
          <Button 
            onClick={handleViewCart}
            className="w-full sm:w-auto" 
            variant="outline"
          >
            장바구니 확인
          </Button>
          <Button 
            onClick={handleGoToMenu} 
            className="w-full sm:w-auto"
            variant="ghost"
          >
            메뉴로 돌아가기
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<PaymentFailLoading />}>
      <PaymentFailDetails />
    </Suspense>
  );
} 