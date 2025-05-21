import { useOrderStatus } from '@/lib/api-hooks';
import { useEffect } from 'react';

// 주문 상태에 따른 스타일 및 아이콘 설정
const statusConfig = {
  pending: {
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
    icon: '⏳',
  },
  preparing: {
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    icon: '👨‍🍳',
  },
  ready: {
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    icon: '✅',
  },
  completed: {
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
    icon: '🎉',
  },
  cancelled: {
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    icon: '❌',
  },
};

// 기본 스타일 설정
const defaultStyle = {
  bgColor: 'bg-gray-100',
  textColor: 'text-gray-800',
  borderColor: 'border-gray-300',
  icon: '❓',
};

interface OrderStatusProps {
  orderId: number | null;
  onStatusChange?: (status: string) => void;
  showDescription?: boolean;
}

export default function OrderStatus({ 
  orderId, 
  onStatusChange,
  showDescription = true,
}: OrderStatusProps) {
  const { status, loading, error } = useOrderStatus(orderId);
  
  // 상태 변경 시 콜백 호출
  useEffect(() => {
    if (status && onStatusChange) {
      onStatusChange(status.status);
    }
  }, [status, onStatusChange]);

  if (!orderId) {
    return null;
  }

  if (loading && !status) {
    return (
      <div className="flex items-center animate-pulse p-4 rounded-md bg-gray-50 border border-gray-200">
        <div className="mr-3 bg-gray-200 h-6 w-6 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          {showDescription && <div className="h-3 bg-gray-200 rounded w-1/2"></div>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800">
        <p className="font-medium">주문 상태를 불러올 수 없습니다</p>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // 현재 상태에 맞는 스타일 설정 가져오기
  const currentStyle = statusConfig[status.status as keyof typeof statusConfig] || defaultStyle;

  // 마지막 업데이트 시간 형식화
  const lastUpdated = new Date(status.updated_at).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div 
      className={`p-4 rounded-md border ${currentStyle.bgColor} ${currentStyle.borderColor} transition-all duration-300 ease-in-out`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center">
        <span className="text-2xl mr-3" aria-hidden="true">{currentStyle.icon}</span>
        <div className="flex-1">
          <h3 className={`font-bold ${currentStyle.textColor}`}>
            주문 상태: {getStatusText(status.status)}
          </h3>
          {showDescription && (
            <p className={`text-sm mt-1 ${currentStyle.textColor}`}>
              {status.description}
            </p>
          )}
          <p className="text-xs mt-2 text-gray-500">
            마지막 업데이트: {lastUpdated}
          </p>
        </div>
      </div>
    </div>
  );
}

// 상태값 한글화 함수
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '대기 중',
    preparing: '준비 중',
    ready: '준비 완료',
    completed: '주문 완료',
    cancelled: '주문 취소',
  };
  
  return statusMap[status] || '알 수 없음';
} 