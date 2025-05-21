'use client';

// 정적 생성 사용 안함
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Clock, CheckCircle, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { OrderTable } from '@/components/admin/orders/OrderTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from 'lucide-react';

// 백엔드 API 기본 URL
const API_BASE_URL = ''; // 상대 경로 사용을 위해 빈 문자열로 설정

interface OrderItem {
  id: number;
  menu_id: number | null;
  quantity: number;
  status: string; // OrderTable과 일관성을 위해 string으로 변경 (기존: 'pending' | 'completed' | 'cancelled')
  menu: {
    name: string;
    price: number;
  };
}

interface Order {
  id: string;
  order_number: string;
  display_order_number: string;
  status: string; // OrderTable과 일관성을 위해 string으로 변경
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  payment_method?: string;
  customer_name?: string; // OrderTable에서 customer_name 정렬을 위해 추가
}

// OrderStatus 타입을 string으로 유지하거나, 필요한 모든 상태를 명시합니다.
// type OrderStatus = 'pending' | 'paid' | 'preparing' | 'ready_for_pickup' | 'completed' | 'cancelled' | 'failed';
type OrderStatus = string; // 우선 string으로 유지하여 유연성 확보

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [orderDatesInMonth, setOrderDatesInMonth] = useState<Set<string>>(new Set());
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 테이블 관련 상태 추가
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('paid'); // 기본 필터를 'paid' (결제완료)로 변경
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order | 'customer_name'; direction: 'ascending' | 'descending' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null); // 현재 처리 중인 주문 ID

  // SSE 연결 상태 참조
  const eventSourceRef = useRef<EventSource | null>(null);

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
      const match = orderNumber.match(/^(\d{4})(\d{2})(\d{2})-\d+$/);
      if (match && match[1] && match[2] && match[3]) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; 
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
      const dateFromOrderNumber = getDateFromOrderNumber(order.order_number);
      if (dateFromOrderNumber && isSameDate(dateFromOrderNumber, selectedDate)) return true;
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
      router.push('/admin');
      return false;
    }
    return true;
  }, [router]);

  const fetchOrderDatesForCalendar = useCallback(async (year: number, month: number) => {
    // 이 함수는 SSE 메시지 수신 시 호출되므로, 간략하게 유지
    // 또는 필요시 API를 호출하여 해당 월의 주문 날짜들을 다시 가져올 수 있음
    // 여기서는 orders 상태를 기반으로 업데이트
    const dates = new Set<string>();
    orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        if (orderDate.getFullYear() === year && orderDate.getMonth() === month) {
            dates.add(formatDateString(orderDate));
        }
    });
    setOrderDatesInMonth(prevDates => new Set([...Array.from(prevDates), ...Array.from(dates)]));
  }, [orders]);

  useEffect(() => {
    if (!checkAuth()) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (!token) {
      console.error("Admin token not found for SSE connection.");
      // Consider redirecting to login or showing a message to the user
      return;
    }

    // Construct SSE URL with token as query parameter
    const sseUrl = `/api/admin/orders/realtime/subscribe?token=${encodeURIComponent(token)}`;
    console.log("Connecting to SSE with URL:", sseUrl); // Log the URL for debugging
    
    const es = new EventSource(sseUrl); 
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log("SSE connection established.");
      toast.success("실시간 주문 업데이트 연결 성공");
    };

    es.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        if (parsedData.event === 'connection_established' || parsedData.event === 'heartbeat') return;

        const orderEventData = parsedData.data;
        if (!orderEventData || !orderEventData.id) return;

        const newOrderData = {
          ...orderEventData,
          id: orderEventData.id.toString(),
          display_order_number: orderEventData.order_number 
                                ? (orderEventData.order_number.includes('-') 
                                  ? orderEventData.order_number.split('-')[1].replace(/^0+/, '') || '0' 
                                  : orderEventData.order_number)
                                : orderEventData.id.toString(),
          items: (orderEventData.items || []).map((item: any) => ({
            ...item,
            menu: item.menu_name ? { name: item.menu_name, price: item.unit_price } : { name: '알 수 없는 메뉴', price: 0 }
          })),
          // customer_name 추가 (SSE 페이로드에 있다면)
          customer_name: orderEventData.customer_name || undefined,
        } as Order;

        if (parsedData.event === 'new_order') {
          toast.info(`새 주문: #${newOrderData.display_order_number}`);
          setOrders(prevOrders => {
            if (prevOrders.find(o => o.id === newOrderData.id)) {
              return prevOrders.map(o => o.id === newOrderData.id ? newOrderData : o);
            }
            return [newOrderData, ...prevOrders];
          });
          const orderDate = new Date(newOrderData.created_at);
          fetchOrderDatesForCalendar(orderDate.getFullYear(), orderDate.getMonth());
        } else if (parsedData.event === 'order_update') {
          toast.info(`주문 업데이트: #${newOrderData.display_order_number} (${newOrderData.status})`);
          setOrders(prevOrders => 
            prevOrders.map(order => order.id === newOrderData.id ? newOrderData : order)
          );
        }
      } catch (error) {
        console.error("Error parsing SSE message or updating state:", error, event.data);
      }
    };

    es.onerror = (error) => {
      console.error("SSE error:", error);
      toast.error("실시간 연결 오류. 자동 재연결 시도 중...");
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [checkAuth, router, fetchOrderDatesForCalendar]);

  const fetchOrders = useCallback(async (date?: Date, filterStatus: string = statusFilter) => {
    if (!checkAuth()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin');
        return;
      }
      let fetchUrl = '/api/admin/orders';
      const params = new URLSearchParams();

      if (date) {
        const dateString = formatDateString(date);
        params.append('start_date', dateString);
        params.append('end_date', dateString);
      }

      // statusFilter가 'all'이 아니면 해당 상태로 필터링
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      if (params.toString()) {
        fetchUrl += `?${params.toString()}`;
      }

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
      });
      if (response.status === 401) {
        localStorage.removeItem('adminToken'); sessionStorage.removeItem('adminToken');
        toast.error('인증 만료. 다시 로그인해주세요.');
        router.push('/admin');
        return;
      }
      if (!response.ok) {
        const errorText = await response.text();
        const errorData = JSON.parse(errorText || '{}');
        throw new Error(errorData.detail || '주문 목록 로드 실패');
      }
      const data = await response.json();
      if (!data) {
        setOrders([]); setLoading(false); return;
      }
      const formattedOrders = (Array.isArray(data) ? data : [])
        .filter((order: any) => order && order.items && Array.isArray(order.items) && order.items.length > 0)
        .map((order: any): Order => ({
          id: order.id.toString(),
          order_number: order.order_number || order.id.toString(),
          display_order_number: order.order_number 
                                ? (order.order_number.includes('-') 
                                  ? order.order_number.split('-')[1].replace(/^0+/, '') || '0' 
                                  : order.order_number)
                                : order.id.toString(),
          status: order.status,
          total_amount: order.total_amount,
          created_at: order.created_at,
          items: (order.items || []).map((item: any): OrderItem => ({
            id: item.id,
            menu_id: item.menu_id,
            quantity: item.quantity,
            status: item.status,
            menu: { name: item.menu_name || "메뉴 없음", price: item.unit_price ?? 0 }
          })),
          payment_method: order.payment_method,
          customer_name: order.customer_name, // API 응답에 customer_name이 있다고 가정
        }));
      setOrders(formattedOrders);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '주문 목록 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [checkAuth, router, statusFilter]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!checkAuth() || processingOrderId) return; // 이미 다른 요청 처리 중이면 중복 실행 방지

    const originalOrders = [...orders]; // 롤백을 위해 원래 주문 목록 저장
    setProcessingOrderId(orderId); // 처리 시작을 알림

    // 낙관적 업데이트: UI 즉시 변경
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );

    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin');
        setOrders(originalOrders); // 토큰 없으면 롤백
        setProcessingOrderId(null);
        return;
      }

      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const responseData = await response.json();

      if (!response.ok) {
        toast.error(`주문 #${orderId} 상태 변경 실패: ${responseData.detail || '알 수 없는 오류'}`);
        setOrders(originalOrders); // 실패 시 롤백
      } else {
        toast.success(`주문 #${orderId} 상태가 ${newStatus}(으)로 변경되었습니다.`);
        // SSE를 통해 어차피 업데이트 될 것이므로, 여기서 setOrders를 다시 호출할 필요는 없을 수 있음
        // 단, SSE 지연이 있거나 확실한 동기화를 원하면 responseData 기반으로 업데이트
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, ...responseData, id: responseData.id.toString() } : order
          )
        );
      }
    } catch (error) {
      console.error("Update order status error:", error);
      toast.error(`주문 상태 변경 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
      setOrders(originalOrders); // 예외 발생 시 롤백
    } finally {
      setProcessingOrderId(null); // 처리 완료
    }
  };
  
  // 주문 항목 상태 업데이트 함수 (부분 취소 등에 사용될 수 있음)
  // 이 함수의 낙관적 업데이트는 더 복잡할 수 있음 (주문 전체 상태에도 영향)
  const updateItemStatus = async (orderId: string, itemId: number, newStatus: OrderStatus) => { 
    if (!checkAuth() || processingOrderId) return;

    const originalOrders = [...orders];
    setProcessingOrderId(orderId); // 아이템 변경도 주문 ID 기준으로 처리 중 표시

    // 낙관적 업데이트 (아이템 상태 + 주문 전체 상태 예측)
    // 실제로는 더 정교한 로직 필요: 모든 아이템이 취소되면 주문도 취소됨 등
    setOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId) {
          const updatedItems = order.items.map(item =>
            item.id === itemId ? { ...item, status: newStatus } : item
          );
          // 아이템 변경에 따른 주문 전체 상태 변경 로직 (간단화된 예시)
          let newOrderStatus = order.status;
          const allItemsCancelled = updatedItems.every(item => item.status === 'cancelled');
          if (allItemsCancelled) {
            newOrderStatus = 'cancelled';
          } else if (updatedItems.some(item => item.status === 'paid' || item.status === 'preparing')) {
            // 하나라도 진행 중인 아이템이 있으면 주문 상태도 그에 맞게 조정 (예시)
            // newOrderStatus = 'preparing'; // 또는 다른 적절한 상태
          }
          return { ...order, items: updatedItems, status: newOrderStatus };
        }
        return order;
      })
    );
  };

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') fetchOrders(selectedDate);
  }, [fetchOrders, selectedDate]);

  const handleFocus = useCallback(() => fetchOrders(selectedDate), [fetchOrders, selectedDate]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [handleVisibilityChange, handleFocus]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
    } catch { return dateString; }
  };

  const handleResetDate = () => { 
    setSelectedDate(undefined); 
    fetchOrders(undefined, statusFilter); // 현재 statusFilter 유지하면서 전체 날짜 조회
  };

  const handleDateSelect = (date: Date | undefined) => { 
    setSelectedDate(date); 
    fetchOrders(date, statusFilter); // 현재 statusFilter 유지하면서 해당 날짜 조회
  };

  // 상태 필터 변경 시 호출되는 함수
  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    fetchOrders(selectedDate, newStatus); // 선택된 날짜와 새로운 상태로 주문 조회
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };

  // 초기 로드 시 statusFilter의 기본값('paid')으로 주문을 가져옴
  useEffect(() => {
    fetchOrders(selectedDate, statusFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 최초 마운트 시에만 실행, selectedDate, statusFilter는 fetchOrders 내부에서 최신 값 사용

  // OrderTable에 전달할 데이터 필터링 및 정렬 (기존 로직 유지 또는 OrderTable 내부로 이전)
  const filteredAndSortedOrders = useCallback(() => {
    let filtered = orders;
    // 검색어 필터링 (기존 로직)
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.items.some(item => item.menu.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 상태 필터링은 fetchOrders에서 이미 처리했으므로, 여기서는 중복 필터링 안함 (또는 클라이언트 측 추가 필터링 필요시)

    // 정렬 (기존 로직)
    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        // customer_name에 대한 특별 처리
        if (sortConfig.key === 'customer_name') {
          const valA = a.customer_name || ''; // customer_name이 없을 경우 빈 문자열로 처리
          const valB = b.customer_name || '';
          if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        }
        // 다른 키에 대한 일반적인 처리 (a[sortConfig.key] 접근 시 타입 에러 방지 필요)
        const key = sortConfig.key as keyof Order;
        if (a[key] === undefined || b[key] === undefined) return 0; // 또는 다른 방식으로 처리
        if (a[key]! < b[key]!) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[key]! > b[key]!) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [orders, searchTerm, sortConfig]);

  const currentTableData = useCallback(() => {
    const sorted = filteredAndSortedOrders();
    const firstPageIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const lastPageIndex = firstPageIndex + ITEMS_PER_PAGE;
    return sorted.slice(firstPageIndex, lastPageIndex);
  }, [filteredAndSortedOrders, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedOrders().length / ITEMS_PER_PAGE);

  const paginate = (pageNumber: number) => { if (pageNumber >= 1 && pageNumber <= totalPages) setCurrentPage(pageNumber); };
  const requestSort = (key: keyof Order | 'customer_name') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };
  const getSortIndicator = (key: keyof Order | 'customer_name') => {
    if (sortConfig && sortConfig.key === key) return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    return '';
  };

  // 배달 관련 상태 제거
  const orderStatuses = ['all', 'pending', 'paid', 'preparing', 'ready_for_pickup', 'completed', 'cancelled', 'failed'];

  const hasOrdersOnDate = (date: Date) => orders.some((order: Order) => isOrderFromSelectedDate(order, date));
  
  const fetchOrderDatesForMonth = useCallback(async (currentDisplayMonth: Date) => {
    setLoadingCalendar(true);
    // 이 함수는 달력 월 변경시 해당 월의 모든 주문 날짜를 가져오기 위함.
    // 간소화를 위해, API를 호출하여 해당 월의 모든 주문 날짜 목록만 가져오거나 (백엔드 지원 필요)
    // 또는 현재 로드된 orders 상태에서 해당 월의 날짜들만 추출.
    // 여기서는 현재 로드된 orders에서 추출하는 방식을 유지. 
    // 더 정확하려면 API로 해당 월의 주문 유무 날짜들을 받아와야 함.
    const year = currentDisplayMonth.getFullYear();
    const month = currentDisplayMonth.getMonth();
    const datesInMonth = new Set<string>();
    orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        if (orderDate.getFullYear() === year && orderDate.getMonth() === month) {
            datesInMonth.add(formatDateString(orderDate));
        }
    });
    setOrderDatesInMonth(datesInMonth);
    setLoadingCalendar(false);
  }, [orders]); // orders 의존성 추가

  useEffect(() => {
    fetchOrders(selectedDate, statusFilter); // 초기 로드
    fetchOrderDatesForMonth(selectedDate || new Date()); // 초기 달력 날짜 로드
  }, []); // 마운트 시 한 번만 실행


  // 달력 셀 렌더링 함수
  const renderCalendarCell = (day: Date, modifiers: Record<string, boolean> | undefined) => {
    const dateString = formatDateString(day);
    // selectedDate가 변경되면 orders가 업데이트되고, 이로 인해 orderDatesInMonth도 업데이트되어야 함.
    // hasOrdersOnDate는 전체 orders를 순회하므로, orderDatesInMonth를 사용하는 것이 효율적.
    const hasOrders = orderDatesInMonth.has(dateString);
    
    const isSelected = modifiers?.selected || false;
    const isToday = modifiers?.today || false; 

    return (
      <div 
        className={`
          relative w-full h-full flex items-center justify-center rounded-md
          transition-colors duration-150 ease-in-out
          ${isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
            : isToday ? 'bg-accent text-accent-foreground' 
            : 'hover:bg-accent hover:text-accent-foreground'}
          ${modifiers?.disabled ? 'text-muted-foreground opacity-50' : 'cursor-pointer'}
        `}
      >
        {day.getDate()}
        {hasOrders && !isSelected && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
        )}
      </div>
    );
  };

  const handleViewOrderDetails = (orderId: string) => {
    router.push(`/admin/orders/${orderId}`);
  };

  return (
    <>
      {/* <Toaster richColors position="top-right" /> */}
      <div className="container mx-auto py-6 lg:py-10">
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">주문 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium mb-2">날짜 선택</h3>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="rounded-md border p-0 bg-white shadow"
                  month={selectedDate} 
                  onMonthChange={(month) => fetchOrderDatesForMonth(month)}
                  disabled={(date) => loadingCalendar || (date > new Date() && !isSameDate(date, new Date()))}
                  components={{ DayContent: (props) => renderCalendarCell(props.date, props.modifiers) }}
                  footer={
                    <div className="flex justify-between items-center pt-2 mt-2 border-t">
                      <Button variant="ghost" onClick={handleResetDate} disabled={!selectedDate}>
                        날짜 필터 해제
                      </Button>
                       <p className="text-sm text-gray-600">
                        {selectedDate ? `${formatDateString(selectedDate)} 주문` : '모든 주문'}
                      </p>
                    </div>
                  }
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                  <div className="relative w-full sm:w-auto flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="search" 
                      placeholder="주문번호, 고객명, 메뉴 검색..." 
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="pl-8 w-full"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 상태</SelectItem>
                      <SelectItem value="paid">결제완료</SelectItem>
                      <SelectItem value="pending">준비중</SelectItem>
                      <SelectItem value="served">제공완료</SelectItem>
                      <SelectItem value="cancelled">취소됨</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <div className="text-center py-10"> <p>주문 목록을 불러오는 중...</p> </div>
                ) : (
                  <OrderTable 
                    orders={currentTableData()}
                    currentOrders={currentTableData()}
                    sortConfig={sortConfig}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={ITEMS_PER_PAGE}
                    requestSort={requestSort}
                    getSortIndicator={getSortIndicator}
                    paginate={paginate}
                    onUpdateOrderStatus={updateOrderStatus}
                    handleViewOrderDetails={handleViewOrderDetails}
                    processingOrderId={processingOrderId}
                  />
                )}
                {!loading && filteredAndSortedOrders().length === 0 && selectedDate && (
                  <div className="text-center py-10 text-gray-500">
                    <p>{formatDateString(selectedDate)}에는 주문 내역이 없습니다.</p>
                  </div>
                )}
                 {!loading && orders.length === 0 && !selectedDate && (
                  <div className="text-center py-10 text-gray-500">
                    <p>표시할 주문 내역이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 