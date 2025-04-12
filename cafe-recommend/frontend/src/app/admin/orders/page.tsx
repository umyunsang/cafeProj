'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { Search, ShoppingBag, Clock, CreditCard, Package, CheckCircle, XCircle } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { formatDate } from '@/lib/utils';

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
  status: string;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'cancelled' | 'all'>('pending');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  const fetchOrders = useCallback(async (start?: string, end?: string) => {
    if (!checkAuth()) return;

    setLoading(true);
    try {
      const localToken = localStorage.getItem('adminToken');
      const sessionToken = sessionStorage.getItem('adminToken');
      const token = localToken || sessionToken;

      const queryParams = new URLSearchParams();
      if (start) queryParams.append('start_date', start);
      if (end) queryParams.append('end_date', end);
      const queryString = queryParams.toString();
      const fetchUrl = `/api/admin/orders${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(fetchUrl, {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '주문 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      const ordersData = Array.isArray(data) ? data : [];

      const formattedOrders = ordersData
        .filter((order: any) => order && order.items && order.items.length > 0)
        .map((order: any) => ({
          id: order.id.toString(),
          order_number: order.order_number || `ID-${order.id}`,
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
          }))
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(formattedOrders);
    } catch (error) {
      console.error('주문 목록 로딩 실패:', error);
      toast.error(error instanceof Error ? error.message : '주문 목록 로딩 중 오류 발생');
    } finally {
      setLoading(false);
    }
  }, [checkAuth]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
      }
    };
    const handleFocus = () => {
       fetchOrders();
    };

    if (!checkAuth()) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchOrders, checkAuth]);

  const searchOrder = async () => {
    if (!checkAuth()) return;
    if (!orderNumber.trim()) {
      toast.error('주문번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const localToken = localStorage.getItem('adminToken');
      const sessionToken = sessionStorage.getItem('adminToken');
      const token = localToken || sessionToken;
      const response = await fetch(`/api/admin/orders/${orderNumber}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        window.location.href = '/admin';
        return;
      }
      if (!response.ok) throw new Error('주문을 찾을 수 없습니다.');
      const orderData = await response.json();
      if (!orderData || !orderData.items || orderData.items.length === 0) {
        throw new Error('유효하지 않은 주문 데이터입니다.');
      }
      const formattedOrder = {
        id: orderData.id.toString(),
        order_number: orderData.order_number || `ID-${orderData.id}`,
        status: orderData.status || 'pending',
        total_amount: typeof orderData.total_amount === 'number' ? orderData.total_amount : (orderData.items || []).reduce((sum: number, item: any) => (sum + (item.unit_price || 0) * (item.quantity || 0)), 0),
        created_at: orderData.created_at,
        items: (orderData.items || []).map((item: any) => ({
          id: item.id,
          menu_id: item.menu_id,
          quantity: item.quantity || 0,
          status: item.status || 'pending' as 'pending' | 'completed' | 'cancelled',
          menu: { name: item.menu_name || '알 수 없는 메뉴', price: item.unit_price || 0 }
        }))
      };
      setOrder(formattedOrder);
      toast.success('주문을 찾았습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '주문 조회 실패');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

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

      const apiUrl = `/api/admin/orders/${orderId}/items/${itemId}/status`;
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

      if (order && order.id === orderId) {
         setOrder(prevOrder => {
           if (!prevOrder) return null;
           return {
             ...prevOrder,
             items: prevOrder.items.map(item => 
               item.id === itemId ? { ...item, status: newStatus } : item
             )
           };
         });
      } else {
         fetchOrders();
      }

    } catch (error) {
      console.error('updateItemStatus: Error caught', error);
      toast.error(error instanceof Error ? error.message : '상태 업데이트 중 오류 발생');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-transparent">준비 중</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-transparent">결제 완료</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-transparent">처리 완료</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-transparent">주문 취소</Badge>;
      default:
        return <Badge variant="secondary">{status || '알 수 없음'}</Badge>;
    }
  };

  const getItemStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-transparent text-xs px-1.5 py-0.5">준비 중</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-transparent text-xs px-1.5 py-0.5">완료</Badge>;
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

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    if (startDate && new Date(startDate).setHours(0,0,0,0) > orderDate.getTime()) return false;
    if (endDate && new Date(endDate).setHours(23, 59, 59, 999) < orderDate.getTime()) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return order.items.some(item => item.status === 'pending');
    if (activeTab === 'completed') return order.items.every(item => item.status === 'completed' || item.status === 'cancelled') && order.items.some(item => item.status === 'completed');
    if (activeTab === 'cancelled') return order.items.some(item => item.status === 'cancelled');
    return false;
  });

  const handleDateFilter = () => {
    fetchOrders(startDate, endDate);
  };

  const handleDateFilterClear = () => {
    setStartDate('');
    setEndDate('');
    fetchOrders();
  };

  const StatusBadge = ({ status }: { status: 'pending' | 'completed' | 'cancelled' }) => {
    let variant: "secondary" | "outline" | "destructive" | "default" = "secondary";
    let text = "준비중";
    let icon = <Clock className="h-3 w-3 mr-1" />;
    if (status === 'completed') {
      variant = "default";
      text = "완료";
      icon = <CheckCircle className="h-3 w-3 mr-1" />;
    } else if (status === 'cancelled') {
      variant = "destructive";
      text = "취소";
      icon = <XCircle className="h-3 w-3 mr-1" />;
    }
    return <Badge variant={variant} className="text-xs px-2 py-0.5 flex items-center">{icon}{text}</Badge>;
  };

  return (
    <AdminLayout>
      <Toaster position="top-right" richColors />
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">주문 관리</h1>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
           <CardHeader>
            <CardTitle className="text-lg text-gray-700 dark:text-gray-200">주문 번호로 검색</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              type="text"
              placeholder="주문 번호 입력..."
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="flex-grow dark:bg-gray-700 dark:text-gray-100"
              onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
            />
            <Button onClick={searchOrder} disabled={loading} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              {loading ? '검색 중...' : '검색'}
            </Button>
          </CardContent>
        </Card>

        {order && (
          <Card className="mt-4 bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b dark:border-gray-700">
              <CardTitle className="text-lg text-gray-700 dark:text-gray-200">검색 결과: 주문 #{order.order_number}</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOrder(null)}>
                <XCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                 <p>주문 시간: {formatDate(order.created_at)}</p>
                 <p>총 금액: <span className="font-semibold text-gray-800 dark:text-gray-200">{order.total_amount.toLocaleString()}원</span></p>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">주문 항목:</h4>
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border dark:border-gray-200 dark:border-gray-600">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{item.menu.name} <span className="text-sm text-gray-500 dark:text-gray-400">x {item.quantity}</span></p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{item.menu.price.toLocaleString()}원</p>
                    </div>
                    <div className="flex items-center gap-2">
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
                                 <AlertDialogAction onClick={() => updateItemStatus(order.id, item.id, 'completed')} className="bg-green-600 hover:bg-green-700">완료 처리</AlertDialogAction>
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
                                 <AlertDialogAction onClick={() => updateItemStatus(order.id, item.id, 'cancelled')} className="bg-red-600 hover:bg-red-700">주문 취소</AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         </>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
           <CardHeader>
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <CardTitle className="text-lg text-gray-700 dark:text-gray-200">주문 내역</CardTitle>
               <div className="flex flex-col sm:flex-row gap-2 items-center w-full md:w-auto">
                 <div className="flex gap-2 items-center w-full sm:w-auto">
                   <Label htmlFor="start-date" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">시작일</Label>
                   <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
                 </div>
                 <div className="flex gap-2 items-center w-full sm:w-auto">
                   <Label htmlFor="end-date" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">종료일</Label>
                   <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
                 </div>
                 <div className="flex gap-2 w-full sm:w-auto">
                   <Button onClick={handleDateFilter} size="sm" variant="outline" className="w-full sm:w-auto">적용</Button>
                   <Button onClick={handleDateFilterClear} size="sm" variant="ghost" className="w-full sm:w-auto">초기화</Button>
                 </div>
               </div>
             </div>
           </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'completed' | 'cancelled' | 'all')} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="pending">처리 중</TabsTrigger>
                <TabsTrigger value="completed">완료됨</TabsTrigger>
                <TabsTrigger value="cancelled">취소됨</TabsTrigger>
                <TabsTrigger value="all">전체 보기</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {loading && <p className="text-center text-gray-500 dark:text-gray-400 py-8">주문 목록을 불러오는 중...</p>}
                {!loading && filteredOrders.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    해당하는 주문 내역이 없습니다.
                    {(startDate || endDate) && ' 선택한 날짜 범위를 확인해주세요.'}
                  </p>
                )}
                {!loading && filteredOrders.length > 0 && (
                  <div className="space-y-4">
                    {filteredOrders.map((o) => (
                      <Card key={o.id} className="border dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="bg-gray-50 dark:bg-gray-900/50 p-4 flex flex-row justify-between items-center border-b dark:border-gray-700">
                          <div>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100">주문 #{o.order_number}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(o.created_at)}</p>
                          </div>
                           <Badge variant={o.items.every(i => i.status === 'completed' || i.status === 'cancelled') && o.items.some(i=> i.status === 'completed') ? 'default' : o.items.some(i => i.status === 'cancelled') ? 'destructive' : 'secondary'} className="text-xs font-medium">
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
                          <div className="text-right font-semibold text-gray-800 dark:text-gray-100 pt-3 mt-3 border-t dark:border-gray-700">
                            총 금액: {o.total_amount.toLocaleString()}원
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
} 