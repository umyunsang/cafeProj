'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, ShoppingBag, Clock, CreditCard, Package, CheckCircle, XCircle } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OrderItem {
  id: number;
  menu_id: number;
  quantity: number;
  status: 'pending' | 'completed';
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
  const [activeTab, setActiveTab] = useState('all');

  const checkAuth = () => {
    // localStorage와 sessionStorage 모두에서 토큰 확인
    const localToken = localStorage.getItem('adminToken');
    const sessionToken = sessionStorage.getItem('adminToken');
    const token = localToken || sessionToken;
    
    if (!token) {
      window.location.href = '/admin';
      return false;
    }
    return true;
  };

  const fetchOrders = async () => {
    if (!checkAuth()) return;

    try {
      // localStorage와 sessionStorage 모두에서 토큰 확인
      const localToken = localStorage.getItem('adminToken');
      const sessionToken = sessionStorage.getItem('adminToken');
      const token = localToken || sessionToken;
      
      const response = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (response.status === 401) {
        // 인증 실패 시 두 스토리지 모두에서 토큰 제거
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        window.location.href = '/admin';
        return;
      }
      
      if (!response.ok) throw new Error('주문 목록을 불러오는데 실패했습니다.');
      
      const data = await response.json();
      console.log('주문 데이터:', data);
      
      // 주문 데이터가 배열이 아닌 경우 처리
      const ordersData = Array.isArray(data) ? data : [data];
      
      // 주문 데이터 형식 변환
      const formattedOrders = ordersData
        .filter((order: any) => order && order.items && order.items.length > 0) // 유효한 주문만 필터링
        .map((order: any) => ({
          id: order.id.toString(),
          order_number: order.id.toString(),
          status: order.status || 'pending',
          total_amount: order.total_amount || order.items.reduce((sum: number, item: any) => {
            const price = item.unit_price || 0;
            const quantity = item.quantity || 0;
            return sum + (price * quantity);
          }, 0),
          created_at: order.created_at,
          items: order.items.map((item: any) => ({
            id: item.id,
            menu_id: item.menu_id,
            quantity: item.quantity,
            status: item.status || 'pending',
            menu: {
              name: item.menu_name || '알 수 없는 메뉴',
              price: item.unit_price || 0
            }
          }))
        }));
      setOrders(formattedOrders);
    } catch (error) {
      console.error('주문 목록 로딩 실패:', error);
      toast.error('주문 목록을 불러오는데 실패했습니다.');
    }
  };

  useEffect(() => {
    if (checkAuth()) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const searchOrder = async () => {
    if (!checkAuth()) return;
    if (!orderNumber.trim()) {
      toast.error('주문번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // localStorage와 sessionStorage 모두에서 토큰 확인
      const localToken = localStorage.getItem('adminToken');
      const sessionToken = sessionStorage.getItem('adminToken');
      const token = localToken || sessionToken;
      
      const response = await fetch(`/api/admin/orders/${orderNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        // 인증 실패 시 두 스토리지 모두에서 토큰 제거
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        window.location.href = '/admin';
        return;
      }
      
      if (!response.ok) throw new Error('주문을 찾을 수 없습니다.');
      
      const order = await response.json();
      if (!order || !order.items || order.items.length === 0) {
        throw new Error('유효하지 않은 주문입니다.');
      }

      // 주문 데이터 형식 변환
      const formattedOrder = {
        id: order.id.toString(),
        order_number: order.id.toString(),
        status: order.status || 'pending',
        total_amount: order.total_amount || order.items.reduce((sum: number, item: any) => {
          const price = item.unit_price || 0;
          const quantity = item.quantity || 0;
          return sum + (price * quantity);
        }, 0),
        created_at: order.created_at,
        items: order.items.map((item: any) => ({
          id: item.id,
          menu_id: item.menu_id,
          quantity: item.quantity,
          status: item.status || 'pending',
          menu: {
            name: item.menu_name || '알 수 없는 메뉴',
            price: item.unit_price || 0
          }
        }))
      };
      setOrder(formattedOrder);
      toast.success('주문을 찾았습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '주문 조회에 실패했습니다.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = async (orderId: string, itemId: number, newStatus: 'completed') => {
    if (!checkAuth()) return;

    try {
      // localStorage와 sessionStorage 모두에서 토큰 확인
      const localToken = localStorage.getItem('adminToken');
      const sessionToken = sessionStorage.getItem('adminToken');
      const token = localToken || sessionToken;
      
      const response = await fetch(`/api/admin/orders/${orderId}/items/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.status === 401) {
        // 인증 실패 시 두 스토리지 모두에서 토큰 제거
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        window.location.href = '/admin';
        return;
      }
      
      if (!response.ok) throw new Error('상태 업데이트에 실패했습니다.');
      
      toast.success('메뉴 상태가 업데이트되었습니다.');
      fetchOrders();
      
      if (order && order.id === orderId) {
        const updatedResponse = await fetch(`/api/admin/orders/${orderId}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (updatedResponse.ok) {
          const orderData = await updatedResponse.json();
          if (orderData && orderData.items) {
            const formattedOrder = {
              id: orderData.id.toString(),
              order_number: orderData.id.toString(),
              status: orderData.status || 'pending',
              total_amount: orderData.total_amount || orderData.items.reduce((sum: number, item: any) => {
                const price = item.unit_price || 0;
                const quantity = item.quantity || 0;
                return sum + (price * quantity);
              }, 0),
              created_at: orderData.created_at,
              items: orderData.items.map((item: any) => ({
                id: item.id,
                menu_id: item.menu_id,
                quantity: item.quantity,
                status: item.status || 'pending',
                menu: {
                  name: item.menu_name || '알 수 없는 메뉴',
                  price: item.unit_price || 0
                }
              }))
            };
            setOrder(formattedOrder);
          }
        }
      }
    } catch (error) {
      toast.error('상태 업데이트에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">준비 중</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">제공 완료</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'pending') {
      return order.items.some(item => item.status === 'pending');
    }
    if (activeTab === 'completed') {
      return order.items.every(item => item.status === 'completed');
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">주문 관리</h1>
          <p className="text-gray-500 mt-1">주문을 검색하고 상태를 관리할 수 있습니다.</p>
        </div>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="주문번호 입력"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={searchOrder} 
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? '검색 중...' : '검색'}
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">전체 주문</TabsTrigger>
            <TabsTrigger value="pending">처리 중</TabsTrigger>
            <TabsTrigger value="completed">완료</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div className="flex items-center">
                    <ShoppingBag className="h-5 w-5 mr-2 text-amber-600" />
                    <span className="font-medium text-lg">{order.order_number}</span>
                  </div>
                  <div className="mt-2 md:mt-0 flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.menu.name}</span>
                          <span className="text-sm text-gray-500">{item.quantity}개</span>
                        </div>
                        <div className="flex items-center mt-2">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                      {item.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateItemStatus(order.id, item.id, 'completed')}
                          className="ml-4"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          제공 완료
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-1 text-gray-500" />
                    <span className="text-gray-500">총 금액:</span>
                    <span className="font-medium ml-2">{order.total_amount.toLocaleString()}원</span>
                  </div>
                  <div>
                    {order.items.every(item => item.status === 'completed') ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        모든 메뉴 제공 완료
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        처리 중
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ShoppingBag className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>주문이 없습니다.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {order && (
          <Card className="p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">검색된 주문 상세 정보</h2>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div className="flex items-center">
                <ShoppingBag className="h-4 w-4 mr-2 text-amber-600" />
                <p className="text-gray-500">주문번호</p>
              </div>
              <p className="font-medium text-lg">{order.order_number}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Clock className="h-4 w-4 mr-2 text-amber-600" />
                  <p className="text-gray-500">주문 일시</p>
                </div>
                <p className="font-medium">{formatDate(order.created_at)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <CreditCard className="h-4 w-4 mr-2 text-amber-600" />
                  <p className="text-gray-500">총 금액</p>
                </div>
                <p className="font-medium text-lg">{order.total_amount.toLocaleString()}원</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Package className="h-4 w-4 mr-2 text-amber-600" />
                  <p className="text-gray-500">주문 상태</p>
                </div>
                <div className="flex space-x-2">
                  {order.items.map((item) => (
                    <Button 
                      key={item.id}
                      variant="outline" 
                      size="sm"
                      onClick={() => updateItemStatus(order.id, item.id, 'completed')}
                      className={item.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                    >
                      {item.status === 'completed' ? '제공 완료' : '제공 중'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2 text-amber-600" />
                주문 항목
              </h3>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.menu.name}</p>
                      <p className="text-sm text-gray-500">{item.quantity}개</p>
                    </div>
                    <span className="font-medium">{item.menu.price.toLocaleString()}원</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
} 