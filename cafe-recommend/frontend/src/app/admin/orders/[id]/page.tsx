'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast, Toaster } from 'sonner';
import { ArrowLeft, ShoppingCart, User, CreditCard, CalendarDays, Edit, CheckSquare, XSquare, RefreshCw, Package, ListOrdered, Edit2 } from 'lucide-react';
import { Order, OrderItem } from '@/components/admin/orders/OrderTable'; // OrderTable에서 타입 가져오기
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { OrderSummaryCard } from '@/components/admin/orders/details/OrderSummaryCard';
import { OrderItemsTable } from '@/components/admin/orders/details/OrderItemsTable';
import { OrderStatusActions } from '@/components/admin/orders/details/OrderStatusActions';
import { Textarea } from "@/components/ui/textarea";

// 주문 상태에 따른 Badge 스타일 (OrderTable의 것과 유사하게)
const getStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'delivered':
      return 'success';
    case 'pending':
    case 'processing':
      return 'secondary';
    case 'cancelled':
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return false;
    }
    return true;
  }, [router]);

  useEffect(() => {
    if (!orderId || !checkAuth()) {
      if (!orderId) router.push('/admin/orders');
      return;
    }

    const fetchOrderDetails = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

      try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });

        if (response.status === 401) {
          toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
          localStorage.removeItem('adminToken');
          sessionStorage.removeItem('adminToken');
          router.push('/admin');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: '주문 정보를 불러오는데 실패했습니다.' }));
          throw new Error(errorData.detail || '주문 상세 정보를 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        // API 응답 데이터를 프론트엔드 OrderItem 인터페이스에 맞게 변환
        const formattedOrder = {
          ...data,
          items: (data.items || []).map((item: any) => ({
            id: item.id,
            menu_id: item.menu_id,
            quantity: item.quantity,
            status: item.status,
            // menu 객체 생성 (백엔드에 menu_name, unit_price가 있다고 가정)
            menu: {
              name: item.menu_name || '알 수 없는 메뉴',
              price: item.unit_price ?? 0,
            },
            // 필요한 경우 ...item으로 나머지 백엔드 필드도 포함할 수 있으나,
            // 프론트엔드 OrderItem 인터페이스에 명시된 필드 위주로 매핑하는 것이 좋음
          })),
        };
        setOrder(formattedOrder);
      } catch (err: any) {
        console.error('Fetch order details error:', err);
        setError(err.message || '주문 정보를 불러오는 중 오류가 발생했습니다.');
        toast.error(err.message || '주문 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, router, checkAuth]);

  const handleOrderStatusChange = async (newStatus: string) => {
    if (!order || !checkAuth()) return;
    if (order.status === newStatus) return;

    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    setIsStatusUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
        router.push('/admin');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '주문 상태 변경에 실패했습니다.' }));
        throw new Error(errorData.detail || '주문 상태 변경 중 오류가 발생했습니다.');
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      toast.success(`주문 #${order.display_order_number} 상태가 ${newStatus}(으)로 변경되었습니다.`);

    } catch (err: any) {
      console.error('Order status update error:', err);
      toast.error(err.message || '주문 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleRefund = async () => {
    if (!order || !checkAuth()) return;

    if (['cancelled', 'failed', 'refunded'].includes(order.status.toLowerCase())) {
      toast.error('이미 취소되었거나 환불된 주문입니다.');
      setShowRefundDialog(false);
      return;
    }

    setIsRefunding(true);
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          amount: order.total_amount,
          reason: refundReason || '관리자 전체 환불' 
        }),
      });

      if (response.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
        router.push('/admin');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '환불 처리에 실패했습니다.' }));
        throw new Error(errorData.detail || '환불 처리 중 오류가 발생했습니다.');
      }
      
      const refundedOrder = await response.json();
      setOrder(refundedOrder);
      toast.success(`주문 #${order.display_order_number} 전액 환불 처리되었습니다.`);
      setRefundReason('');

    } catch (err: any) {
      toast.error(err.message || '환불 처리 중 오류가 발생했습니다.');
    } finally {
      setIsRefunding(false);
      setShowRefundDialog(false);
    }
  };

  const AVAILABLE_ORDER_STATUSES = ['pending', 'processing', 'completed', 'shipped', 'delivered', 'cancelled', 'failed'];

  if (loading && !order) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-4 text-center">
          <p className="flex items-center justify-center"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 주문 정보를 불러오는 중...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error && !order) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-4">
          <Button variant="outline" onClick={() => router.push('/admin/orders')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> 주문 목록으로 돌아가기
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">오류</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error || '주문 정보를 찾을 수 없습니다.'}</p>
              <Button onClick={() => router.refresh()} className="mt-2">새로고침</Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }
  
  if (!order) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-4 text-center">
           <Button variant="outline" onClick={() => router.push('/admin/orders')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> 주문 목록으로 돌아가기
          </Button>
          <p>주문 정보를 찾을 수 없습니다.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Toaster richColors position="top-right" />
      <div className="container mx-auto p-4 md:p-6">
        <Button variant="outline" onClick={() => router.push('/admin/orders')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> 주문 목록으로
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column / Main Info */} 
          <div className="lg:col-span-2 space-y-6">
            <OrderSummaryCard order={order} getStatusBadgeVariant={getStatusBadgeVariant} />

            <OrderItemsTable items={order.items} totalAmount={order.total_amount} />
          </div>

          {/* Right Column / Actions */} 
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader className="border-b mb-4">
                <CardTitle className="text-xl font-semibold">
                  <Edit2 className="mr-2 h-5 w-5 inline-block text-primary" />
                  주문 상태 변경
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="orderStatus" className="text-sm text-muted-foreground">현재 상태</Label>
                  <p className="font-semibold text-lg" id="orderStatusVal">{order.status}</p>
                </div>
                <div>
                  <Label htmlFor="newOrderStatus" className="text-sm text-muted-foreground">새로운 상태로 변경</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Select onValueChange={handleOrderStatusChange} defaultValue={order.status}>
                      <SelectTrigger id="newOrderStatus" className="flex-grow">
                        <SelectValue placeholder="상태 선택..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_ORDER_STATUSES.map(status => (
                          <SelectItem key={status} value={status} disabled={status === order.status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="border-b mb-4">
                <CardTitle className="text-xl font-semibold">
                  <RefreshCw className="mr-2 h-5 w-5 inline-block text-primary" />
                  환불 처리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  주문 금액 전체({order.total_amount.toLocaleString()}원)를 환불합니다.
                  환불된 주문은 되돌릴 수 없습니다.
                </p>
                <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      disabled={isRefunding || ['cancelled', 'failed', 'refunded'].includes(order.status.toLowerCase())}
                    >
                      {isRefunding ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                      전체 환불 진행
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>환불 확인</AlertDialogTitle>
                      <AlertDialogDescription>
                        정말로 주문 #{order.display_order_number}의 전체 금액 ({order.total_amount.toLocaleString()}원)을 환불하시겠습니까?
                        이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Label htmlFor="refundReason" className="text-xs text-muted-foreground">환불 사유 (선택)</Label>
                        <Textarea 
                            id="refundReason" 
                            placeholder="환불 사유를 입력하세요... (예: 고객 요청)"
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            className="mt-1 h-20"
                        />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isRefunding}>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRefund} disabled={isRefunding}>
                        {isRefunding ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                        환불 실행
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {['cancelled', 'failed', 'refunded'].includes(order.status.toLowerCase()) && (
                    <p className="text-xs text-destructive mt-2 text-center">이미 취소 또는 환불된 주문입니다.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 