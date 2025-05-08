'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Clock, CheckCircle, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// 백엔드 API 기본 URL
const API_BASE_URL = 'http://116.124.191.174:15026';

interface OrderItem {
  id: number;
  menu_id: number | null;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  menu: {
    name: string;
    price: number;
  };
}

interface Order {
  id: string;
  order_number: string;
  display_order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  payment_method?: string;
}

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [orderDatesInMonth, setOrderDatesInMonth] = useState<Set<string>>(new Set());
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  // 개발용 디버깅 - 마운트 시 DOM 요소 로깅
  const calendarRef = useRef<HTMLDivElement>(null);

  // 날짜를 YYYY-MM-DD 형식으로 변환하는 함수
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 같은 날짜인지 비교하는 함수 (년, 월, 일만 비교)
  const isSameDate = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // 주문 번호에서 날짜 정보 추출 함수
  const getDateFromOrderNumber = (orderNumber: string): Date | null => {
    try {
      // 주문번호가 "YYYYMMDD-숫자" 형식인지 확인 (예: "20250504-001")
      const match = orderNumber.match(/^(\d{4})(\d{2})(\d{2})-\d+$/);
      if (match && match[1] && match[2] && match[3]) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // JavaScript 월은 0-11
        const day = parseInt(match[3], 10);
        return new Date(year, month, day);
      }
    } catch (error) {
      console.error('주문번호에서 날짜 추출 실패:', orderNumber, error);
    }
    return null;
  };

  // 주문이 선택한 날짜에 속하는지 확인하는 함수
  const isOrderFromSelectedDate = (order: Order, selectedDate: Date): boolean => {
    if (!selectedDate) return true;
    
    try {
      // 1. 주문 번호에서 날짜 추출해서 비교
      const dateFromOrderNumber = getDateFromOrderNumber(order.order_number);
      if (dateFromOrderNumber) {
        if (isSameDate(dateFromOrderNumber, selectedDate)) {
          return true;
        }
      }
      
      // 2. created_at을 기반으로 비교
      const orderDate = new Date(order.created_at);
      return isSameDate(orderDate, selectedDate);
    } catch (error) {
      console.error('날짜 비교 오류:', error, order);
      return false;
    }
  };

  const checkAuth = useCallback(() => {
    const localToken = localStorage.getItem('adminToken');
    const sessionToken = sessionStorage.getItem('adminToken');
    const token = localToken || sessionToken;
    if (!token) {
      window.location.href = '/admin';
      return false;
    }
    return true;
  }, []);

  const fetchOrders = useCallback(async (date?: Date) => {
    if (!checkAuth()) return;

    setLoading(true);
    try {
      // 날짜 선택 디버깅
      if (date) {
        console.log(`fetchOrders 시작: ${formatDateString(date)}`);
      } else {
        console.log('fetchOrders 시작: 날짜 미선택');
      }
      
      const localToken = localStorage.getItem('adminToken');
      const sessionToken = sessionStorage.getItem('adminToken');
      const token = localToken || sessionToken;

      if (!token) {
        console.error('인증 토큰이 없습니다.');
        toast.error('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/admin';
        return;
      }

      // API URL 구성
      let fetchUrl = `${API_BASE_URL}/api/admin/orders`;
      
      // 날짜 필터링이 있는 경우
      if (date) {
        const dateString = formatDateString(date);
        console.log(`선택한 날짜: ${dateString}`);
        
        // 쿼리 파라미터 추가
        fetchUrl = `${fetchUrl}?start_date=${dateString}&end_date=${dateString}`;
      }

      console.log('API 요청 URL:', fetchUrl);

      // API 요청
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      // 응답 상태 확인
      console.log('응답 상태:', response.status);

      if (response.status === 401) {
        console.error('인증 실패 (401)');
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/admin';
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '주문 목록을 불러오는데 실패했습니다.';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          console.error('에러 응답 파싱 실패:', errorText);
        }
        
        console.error(`API 응답 에러 (${response.status}):`, errorText);
        throw new Error(errorMessage);
      }

      // 응답 데이터 처리
      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === '') {
        console.log('서버에서 빈 응답을 반환했습니다.');
        setOrders([]);
        setLoading(false);
        return;
      }
      
      // JSON 파싱
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('JSON 파싱 오류:', error, responseText);
        toast.error('서버 응답을 처리하는데 실패했습니다.');
        setOrders([]);
        setLoading(false);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('서버에서 주문 데이터가 없습니다.');
        setOrders([]);
        setLoading(false);
        return;
      }
      
      const ordersData = Array.isArray(data) ? data : [];

      // 주문 데이터 변환
      const formattedOrders = ordersData
        .filter((order: any) => order && order.items && Array.isArray(order.items) && order.items.length > 0)
        .map((order: any) => {
          // 주문번호 처리
          let orderNumber = order.order_number;
          let displayOrderNumber = orderNumber;
          
          if (!orderNumber) {
            // 주문번호가 없는 경우 ID를 사용
            displayOrderNumber = order.id.toString();
          } else if (orderNumber.includes('-')) {
            // 주문번호가 YYYYMMDD-XXX 형식인 경우 XXX 부분만 추출하여 정수로 변환
            try {
              const parts = orderNumber.split('-');
              if (parts.length > 1) {
                displayOrderNumber = parseInt(parts[1], 10).toString(); // 앞의 0 제거
              }
            } catch (error) {
              console.error('주문번호 파싱 오류:', error);
              displayOrderNumber = order.id.toString();
            }
          }

          return {
            id: order.id.toString(),
            order_number: orderNumber, // 원래 주문번호는 유지
            display_order_number: displayOrderNumber, // 화면에 표시할 주문번호
            status: order.status || 'pending',
            total_amount: typeof order.total_amount === 'number' ? order.total_amount : order.items.reduce((sum: number, item: any) => {
              const price = item.unit_price || 0;
              const quantity = item.quantity || 0;
              return sum + (price * quantity);
            }, 0),
            created_at: order.created_at,
            items: (order.items || []).map((item: any) => ({
              id: item.id,
              menu_id: item.menu_id,
              quantity: item.quantity || 0,
              status: item.status || 'pending' as 'pending' | 'completed' | 'cancelled',
              menu: {
                name: item.menu_name || '알 수 없는 메뉴',
                price: item.unit_price || 0
              }
            })),
            payment_method: order.payment_method
          };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log(`변환된 주문 목록: ${formattedOrders.length}개`);
      
      if (formattedOrders.length > 0) {
        console.log('첫 번째 주문 예시:', {
          id: formattedOrders[0].id,
          order_number: formattedOrders[0].order_number,
          created_at: formattedOrders[0].created_at,
          total_amount: formattedOrders[0].total_amount,
          items_count: formattedOrders[0].items.length
        });
      }

      // 선택된 날짜가 있는 경우 추가 필터링
      if (date) {
        console.log(`날짜 필터링: ${formatDateString(date)}`);
        const filteredOrders = formattedOrders.filter(order => isOrderFromSelectedDate(order, date));
        console.log(`필터링 결과: ${filteredOrders.length}개 주문`);
        setOrders(filteredOrders);
      } else {
        console.log('날짜 필터 없음, 모든 주문 표시');
        setOrders(formattedOrders);
      }
    } catch (error) {
      console.error('주문 목록 로딩 실패:', error);
      toast.error(error instanceof Error ? error.message : '주문 목록 로딩 중 오류 발생');
    } finally {
      setLoading(false);
    }
  }, [checkAuth]);

  useEffect(() => {
    console.log('선택된 날짜 변경됨:', selectedDate);
    fetchOrders(selectedDate);
  }, [fetchOrders, selectedDate]);

  useEffect(() => {
    const interval = setInterval(() => fetchOrders(selectedDate), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders, selectedDate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders(selectedDate);
      }
    };
    const handleFocus = () => {
       fetchOrders(selectedDate);
    };

    if (!checkAuth()) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchOrders, checkAuth, selectedDate]);

  const updateItemStatus = async (orderId: string, itemId: number, newStatus: 'completed' | 'cancelled') => {
    console.log(`updateItemStatus called: orderId=${orderId}, itemId=${itemId}, newStatus=${newStatus}`);

    if (!checkAuth()) {
        console.log('updateItemStatus: checkAuth failed, redirecting...');
        return;
    }

    try {
      const localToken = localStorage.getItem('adminToken');
      const sessionToken = sessionStorage.getItem('adminToken');
      const token = localToken || sessionToken;

      const apiUrl = `${API_BASE_URL}/api/admin/orders/${orderId}/items/${itemId}/status`;
      console.log(`updateItemStatus: Attempting to fetch ${apiUrl} with status ${newStatus}`);

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      console.log(`updateItemStatus: Fetch response status: ${response.status}`);

      if (response.status === 401) { 
        console.log('updateItemStatus: Unauthorized (401), redirecting...');
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        window.location.href = '/admin';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('updateItemStatus: Fetch error', errorData);
        throw new Error(errorData.detail || '상태 업데이트에 실패했습니다.');
      }

      toast.success(`주문 항목 상태를 ${newStatus === 'completed' ? '완료' : '취소'} 처리했습니다.`);
      
      console.log(`updateItemStatus: Successfully updated item ${itemId} to ${newStatus}. Refreshing data...`);

      fetchOrders(selectedDate);

    } catch (error) {
      console.error('updateItemStatus: Error caught', error);
      toast.error(error instanceof Error ? error.message : '상태 업데이트 중 오류 발생');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-50 border-yellow-300 dark:border-yellow-500">준비 중</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-blue-50 border-blue-300 dark:border-blue-500">결제 완료</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-200 text-green-900 dark:bg-green-600 dark:text-green-50 border-green-300 dark:border-green-500">처리 완료</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-200 text-red-900 dark:bg-red-600 dark:text-red-50 border-red-300 dark:border-red-500">주문 취소</Badge>;
      default:
        return <Badge variant="secondary">{status || '알 수 없음'}</Badge>;
    }
  };

  const getItemStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-50 border-yellow-300 dark:border-yellow-500 text-xs px-1.5 py-0.5">준비 중</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-200 text-green-900 dark:bg-green-600 dark:text-green-50 border-green-300 dark:border-green-500 text-xs px-1.5 py-0.5">완료</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-200 text-red-900 dark:bg-red-600 dark:text-red-50 border-red-300 dark:border-red-500 text-xs px-1.5 py-0.5">취소</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{status || '알 수 없음'}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "유효하지 않은 날짜";
    }
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul'
    });
  };

  const handleResetDate = () => {
    setSelectedDate(new Date());
    fetchOrders(new Date());
  };

  const handleDateSelect = (date: Date | undefined) => {
    console.log(`handleDateSelect 호출됨: ${date?.toISOString()}`);
    setSelectedDate(date);
    if (date) {
      console.log(`주문 가져오기 요청: ${formatDateString(date)}`);
      fetchOrders(date);
    }
  };

  const StatusBadge = ({ status }: { status: 'pending' | 'completed' | 'cancelled' }) => {
    let variant: "secondary" | "outline" | "destructive" | "default" = "outline";
    let text = "준비중";
    let icon = <Clock className="h-3 w-3 mr-1" />;
    let customClass = "";
    
    if (status === 'completed') {
      text = "완료";
      icon = <CheckCircle className="h-3 w-3 mr-1" />;
      customClass = "bg-green-200 text-green-900 dark:bg-green-600 dark:text-green-50 border-green-300 dark:border-green-500";
    } else if (status === 'cancelled') {
      text = "취소";
      icon = <XCircle className="h-3 w-3 mr-1" />;
      customClass = "bg-red-200 text-red-900 dark:bg-red-600 dark:text-red-50 border-red-300 dark:border-red-500";
    } else {
      customClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-50 border-yellow-300 dark:border-yellow-500";
    }
    
    return <Badge variant={variant} className={`text-xs px-2 py-0.5 flex items-center ${customClass}`}>{icon}{text}</Badge>;
  };

  // 월별 주문 데이터를 가져오는 함수
  const fetchMonthlyOrders = useCallback(async (year: number, month: number) => {
    if (!checkAuth()) return;

    setLoadingCalendar(true);
    try {
      const localToken = localStorage.getItem('adminToken');
      const sessionToken = sessionStorage.getItem('adminToken');
      const token = localToken || sessionToken;

      if (!token) {
        console.error('인증 토큰이 없습니다.');
        toast.error('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/admin';
        return;
      }

      // 선택한 월의 시작일과 마지막일 계산
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // 다음 달의 0일 = 현재 달의 마지막 날
      
      const startDateStr = formatDateString(startDate);
      const endDateStr = formatDateString(endDate);
      
      console.log(`월별 주문 조회: ${startDateStr} ~ ${endDateStr}`);
      
      // API 요청
      const fetchUrl = `${API_BASE_URL}/api/admin/orders?start_date=${startDateStr}&end_date=${endDateStr}`;
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        window.location.href = '/admin';
        return;
      }

      if (!response.ok) {
        throw new Error('월별 주문 데이터를 불러오는데 실패했습니다.');
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        setOrderDatesInMonth(new Set());
        return;
      }

      // JSON 파싱
      const data = JSON.parse(responseText);
      const ordersData = Array.isArray(data) ? data : [];
      
      // 주문 데이터에서 날짜 추출
      const orderDates = new Set<string>();
      
      ordersData.forEach((order: any) => {
        if (order && order.created_at) {
          try {
            // KST 기준으로 날짜 추출
            const orderDate = new Date(order.created_at);
            const dateStr = formatDateString(orderDate);
            orderDates.add(dateStr);
            
            // 주문 번호에서도 날짜 추출 시도
            const orderNumberDate = getDateFromOrderNumber(order.order_number);
            if (orderNumberDate) {
              orderDates.add(formatDateString(orderNumberDate));
            }
          } catch (error) {
            console.error('날짜 변환 오류:', error, order.created_at);
          }
        }
      });
      
      console.log(`${orderDates.size}일에 주문 내역이 있습니다.`, Array.from(orderDates));
      setOrderDatesInMonth(orderDates);
      
    } catch (error) {
      console.error('월별 주문 데이터 로딩 실패:', error);
    } finally {
      setLoadingCalendar(false);
    }
  }, [checkAuth]);

  // 해당 날짜에 주문이 있는지 확인하는 함수
  const hasOrdersOnDate = (date: Date) => {
    return orderDatesInMonth.has(formatDateString(date));
  };

  // 선택한 날짜가 변경될 때 해당 월의 주문 데이터 가져오기
  useEffect(() => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      fetchMonthlyOrders(year, month);
    }
  }, [selectedDate?.getMonth(), selectedDate?.getFullYear(), fetchMonthlyOrders]);

  // 달력 날짜 커스터마이징을 위한 렌더 함수
  const renderCalendarCell = (props: any) => {
    // props에서 필요한 값들 추출
    const { date, selected, disabled, today, outside } = props;
    
    // 날짜 문자열 형식 변환
    const dateString = formatDateString(date);
    
    // 주문 내역이 있는 날짜인지 확인
    const hasOrders = orderDatesInMonth.has(dateString);
    
    // 해당 날짜가 현재 표시 중인 월의 날짜인지 확인
    const isCurrentMonth = !outside;
    
    // 날짜 클릭 처리
    const handleClick = () => {
      // 기본 onClick 이벤트는 실행하지 않고 직접 처리
      if (!disabled && date) {
        console.log(`커스텀 날짜 클릭: ${dateString}`);
        handleDateSelect(date);
      }
    };
    
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={`
          relative w-9 h-9 
          flex flex-col items-center justify-center
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          ${selected ? 'bg-blue-600 text-white dark:bg-blue-500 rounded-full' : ''}
          ${today && !selected ? 'border border-blue-500 rounded-full' : ''}
          ${disabled ? 'text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-200'}
        `}
      >
        {/* 날짜 숫자 */}
        <span className="text-sm">{date.getDate()}</span>
        
        {/* 주문 표시 마커 */}
        {hasOrders && isCurrentMonth && (
          <div className="absolute" style={{ bottom: '-4px' }}>
            <div 
              style={{ 
                width: '6px', 
                height: '6px', 
                backgroundColor: '#10b981', 
                borderRadius: '50%',
                border: '1px solid white',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            />
          </div>
        )}
      </button>
    );
  };

  // 달력 스타일 제거
  useEffect(() => {
    // 기존 스타일 요소 제거
    const existingStyle = document.getElementById('order-date-style');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    return () => {
      // 컴포넌트 언마운트 시 스타일 요소 제거
      const styleToRemove = document.getElementById('order-date-style');
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, []);

  return (
    <AdminLayout>
      <Toaster position="top-right" richColors />
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">주문 관리</h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Card className="md:col-span-4 bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-gray-700 dark:text-gray-200">달력</CardTitle>
                <Button 
                  onClick={handleResetDate} 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                >
                  오늘
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center" ref={calendarRef}>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={() => {}} // 빈 함수로 설정 (커스텀 렌더러에서 처리)
                  className="rounded-md border dark:border-gray-700"
                  onMonthChange={(date) => {
                    console.log(`달력 월 변경: ${date.getFullYear()}-${date.getMonth()+1}`);
                    // 월이 변경되면 해당 월의 주문 데이터 로드
                    const year = date.getFullYear();
                    const month = date.getMonth();
                    fetchMonthlyOrders(year, month);
                  }}
                  components={{
                    Day: renderCalendarCell
                  }}
                />
              </div>
              
              <div className="mt-4 flex flex-col items-center justify-center">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span>
                    {selectedDate ? selectedDate.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : '날짜를 선택하세요'}
                  </span>
                </div>
                
                {/* 범례 */}
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <div className="relative mr-2 flex-shrink-0">
                    <div style={{ 
                      width: '6px', 
                      height: '6px', 
                      backgroundColor: '#10b981', 
                      borderRadius: '50%',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}></div>
                  </div>
                  <span>주문 내역 있음</span>
                </div>
                
                {loadingCalendar && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    주문 데이터 확인 중...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-8 bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-700 dark:text-gray-200 flex items-center">
                {selectedDate ? (
                  <>
                    <CalendarIcon className="h-5 w-5 mr-2 text-green-600" />
                    <span className="font-medium">{selectedDate.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long'
                    })}</span>
                    <span className="ml-2 text-sm text-gray-500">주문 내역</span>
                  </>
                ) : (
                  <span>오늘 주문 내역</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <p className="text-center text-gray-500 dark:text-gray-400 py-8">주문 목록을 불러오는 중...</p>}
              {!loading && orders.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-2">
                    {selectedDate 
                      ? `${selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}에 해당하는 주문 내역이 없습니다.`
                      : '해당하는 주문 내역이 없습니다.'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    달력에서 녹색 점이 표시된 날짜를 선택하여 주문 내역을 확인하세요.
                  </p>
                </div>
              )}
              {!loading && orders.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {orders.length}개의 주문이 있습니다.
                  </p>
                  {orders.map((o) => (
                    <Card key={o.id} className="border dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                      <CardHeader className="bg-gray-50 dark:bg-gray-900/50 p-4 flex flex-row justify-between items-center border-b dark:border-gray-700">
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                            주문 #{o.display_order_number}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(o.created_at)}</p>
                        </div>
                        <Badge 
                          variant="outline"
                          className={`text-xs font-medium 
                            ${o.items.every(i => i.status === 'completed' || i.status === 'cancelled') && o.items.some(i=> i.status === 'completed')
                              ? 'bg-green-200 text-green-900 dark:bg-green-600 dark:text-green-50 border-green-300 dark:border-green-500' 
                              : o.items.some(i => i.status === 'cancelled') 
                                ? 'bg-red-200 text-red-900 dark:bg-red-600 dark:text-red-50 border-red-300 dark:border-red-500' 
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-50 border-yellow-300 dark:border-yellow-500'
                            }`}
                        >
                            {o.items.every(i => i.status === 'completed' || i.status === 'cancelled') && o.items.some(i=> i.status === 'completed') ? '처리 완료' : o.items.some(i => i.status === 'cancelled') ? '부분 취소' : '처리 중'}
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {o.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-md border dark:border-gray-600">
                            <div className="flex-1 pr-4">
                              <p className="font-medium text-gray-900 dark:text-gray-100">{item.menu.name} <span className="text-sm text-gray-500 dark:text-gray-400">x {item.quantity}</span></p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{item.menu.price.toLocaleString()}원</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <StatusBadge status={item.status} />
                              {item.status === 'pending' && (
                                <>
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full">
                                            <CheckCircle className="h-4 w-4" />
                                          </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>상태 변경 확인</AlertDialogTitle>
                                            <AlertDialogDescription>'{item.menu.name}' 항목을 완료 상태로 변경하시겠습니까?</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>취소</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => updateItemStatus(o.id, item.id, 'completed')} className="bg-green-600 hover:bg-green-700">완료 처리</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>주문 취소 확인</AlertDialogTitle>
                                          <AlertDialogDescription>'{item.menu.name}' 항목을 취소 상태로 변경하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>닫기</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => updateItemStatus(o.id, item.id, 'cancelled')} className="bg-red-600 hover:bg-red-700">주문 취소</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between items-center text-right font-semibold text-gray-800 dark:text-gray-100 pt-3 mt-3 border-t dark:border-gray-700">
                          <span>총 금액: {o.total_amount.toLocaleString()}원</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
} 