'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import RealtimeSalesWidget from '@/components/admin/RealtimeSalesWidget';
import AdvancedMenuChart from '@/components/admin/charts/AdvancedMenuChart';
import { OrderMetricsGrid, OrderMetricsGridData } from '@/components/admin/charts/OrderMetricsCard';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';
import { PopularMenuItemsChart } from '@/components/admin/charts/PopularMenuItemsChart';
import { SalesSummaryCard, SalesSummaryData } from '@/components/admin/dashboard/SalesSummaryCard';
import { OrderAnalyticsSummaryCard, OrderAnalyticsSummaryData } from '@/components/admin/dashboard/OrderAnalyticsSummaryCard';
import { HourlyOrdersChart, HourlyOrderData } from '@/components/admin/charts/HourlyOrdersChart';
import { PaymentMethodChart, PaymentMethodSaleData } from '@/components/admin/charts/PaymentMethodChart';
import { CategorySalesChart, CategorySaleData } from '@/components/admin/charts/CategorySalesChart';
import { DailyTrendChart, DailyTrendData } from '@/components/admin/charts/DailyTrendChart';
import { MenuSalesItem } from '@/components/admin/charts/AdvancedMenuChart';

// 색상 팔레트 정의
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28AFF', '#FF6B6B', '#4ECDC4'];

interface DashboardData {
  dailySales: {
    date: string;
    amount: number;
    lastYearAmount: number;
    growthRate: number;
  }[];
  recentOrders: {
    id: number;
    items: string | any[];
    total: number;
    status: string;
    date: string;
  }[];
  popularItems: {
    name: string;
    count: number;
  }[];
  todaySummary: SalesSummaryData;
}

interface OrderAnalytics {
  menu_sales: MenuSalesItem[];
  hourly_orders: HourlyOrderData[];
  payment_method_sales: PaymentMethodSaleData[];
  order_status: {
    status: string;
    count: number;
    percentage: number;
  }[];
  completion_rate: number;
  cancellation_rate: number;
  category_sales: CategorySaleData[];
  daily_trend: DailyTrendData[];
  summary: OrderAnalyticsSummaryData;
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    dailySales: [],
    recentOrders: [],
    popularItems: [],
    todaySummary: {
      totalSales: 0,
      yesterdaySales: 0,
      growthRate: 0
    }
  });
  
  const [orderAnalytics, setOrderAnalytics] = useState<OrderAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('대시보드 데이터 로딩 실패:', error);
      toast.error('대시보드 데이터를 불러오는데 실패했습니다');
    }
  };

  const handleFilterSubmit = async () => {
    if (!startDate || !endDate) {
      toast.error('시작일과 종료일을 모두 선택해주세요.');
      return;
    }
    setLoadingAnalytics(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `/api/admin/order-analytics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setOrderAnalytics(data);
        toast.success('주문 분석 데이터 로드 성공!');
      } else {
        toast.error('주문 분석 데이터 로드에 실패했습니다.');
        setOrderAnalytics(null);
      }
    } catch (error) {
      console.error('주문 분석 데이터 로딩 실패:', error);
      toast.error('주문 분석 데이터를 불러오는데 실패했습니다.');
      setOrderAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // OrderMetricsGrid에 전달할 데이터 가공
  const getOrderMetricsGridData = (): OrderMetricsGridData | null => {
    if (!orderAnalytics || !orderAnalytics.summary) return null;

    // order_status에서 completed와 cancelled 건수 찾기
    let completedOrders = 0;
    let cancelledOrders = 0;
    // orderAnalytics.order_status 가 존재하고 배열인지 확인
    if (Array.isArray(orderAnalytics.order_status)) {
        const completedStatus = orderAnalytics.order_status.find(s => s.status === 'COMPLETED' || s.status === 'DELIVERED'); // 백엔드 상태값에 따라 유연하게
        const cancelledStatus = orderAnalytics.order_status.find(s => s.status === 'CANCELLED' || s.status === 'REFUNDED');
        
        if (completedStatus) completedOrders = completedStatus.count;
        if (cancelledStatus) cancelledOrders = cancelledStatus.count;
    }


    return {
      completionRate: orderAnalytics.completion_rate,
      cancellationRate: orderAnalytics.cancellation_rate,
      // completedOrders 와 cancelledOrders 는 summary.total_orders 를 기반으로 계산하거나,
      // order_status 에서 직접 가져와야 함. API 응답에 따라 달라짐.
      // 여기서는 order_status 에서 가져온다고 가정. (위에서 계산 로직 추가)
      completedOrders: completedOrders, 
      cancelledOrders: cancelledOrders,
      totalOrders: orderAnalytics.summary.total_orders,
      avgOrderValue: orderAnalytics.summary.avg_order_value,
      totalSales: orderAnalytics.summary.total_sales,
      orderStatus: orderAnalytics.order_status,
      // previousAvgOrderValue, previousTotalSales는 현재 API 응답에 없으므로 undefined
    };
  };

  const orderMetricsData = getOrderMetricsGridData();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold">대시보드</h1>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-4">
          <TabsTrigger value="general">일반 통계</TabsTrigger>
          <TabsTrigger value="orderAnalysis">주문 상세 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* 실시간 매출 위젯 */}
          <RealtimeSalesWidget />
          
          {/* 매출 요약 카드 (신규) */}
          <SalesSummaryCard data={dashboardData.todaySummary} />
          
          {/* 일일 매출 그래프 - 전년 동기 대비 추가 */}
          <Card>
            <CardHeader>
              <CardTitle>일일 매출 (전년 동기 대비)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dashboardData.dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'growthRate') return [`${value}%`, '성장률'];
                        return [`${Number(value).toLocaleString()}원`, name === 'amount' ? '올해 매출' : '작년 매출'];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="amount" name="올해 매출" fill="#8884d8" />
                    <Bar dataKey="lastYearAmount" name="작년 매출" fill="#82ca9d" />
                    <Line
                      type="monotone"
                      dataKey="growthRate"
                      name="성장률"
                      stroke="#ff7300"
                      yAxisId={1}
                      dot={{ stroke: '#ff7300', strokeWidth: 2 }}
                    />
                    <YAxis 
                      yAxisId={1} 
                      orientation="right" 
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `${value}%`}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 최근 주문 */}
          <Card>
            <CardHeader>
              <CardTitle>최근 주문</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        주문 ID
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        메뉴
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        총액
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        상태
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        날짜
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.id}
                        </td>
                        <td className="px-6 py-4 whitespace-pre-wrap text-sm text-gray-500">
                          {(() => {
                            let parsedItems: any[] = [];
                            if (typeof order.items === 'string') {
                              try {
                                parsedItems = JSON.parse(order.items);
                              } catch (e) {
                                console.error(
                                  'Failed to parse order.items (string):',
                                  e,
                                  order.items
                                );
                                return order.items; // 파싱 실패시 원본 문자열 반환
                              }
                            } else if (Array.isArray(order.items)) {
                              parsedItems = order.items; // 이미 배열이면 그대로 사용
                            } else {
                              console.warn(
                                'order.items is neither a string nor an array:',
                                order.items
                              );
                              return '잘못된 메뉴 형식'; // 알 수 없는 타입
                            }

                            if (Array.isArray(parsedItems)) {
                              return parsedItems
                                .map(
                                  (item: any) =>
                                    `${item.menu_name} ${item.quantity}개`
                                )
                                .join(', ');
                            } else {
                              console.warn(
                                'Parsed items is not an array after processing:',
                                parsedItems
                              );
                              return '메뉴 정보 처리 오류';
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.total.toLocaleString()}원
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.status}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.date).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 기존 인기 메뉴 PieChart 로직을 아래 컴포넌트로 대체 */}
          {dashboardData && dashboardData.popularItems && (
            <PopularMenuItemsChart data={dashboardData.popularItems} colors={COLORS} />
          )}
        </TabsContent>

        <TabsContent value="orderAnalysis" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <DatePicker date={startDate} setDate={setStartDate} placeholder="시작일" />
              <span>~</span>
              <DatePicker date={endDate} setDate={setEndDate} placeholder="종료일" />
            </div>
            <Button onClick={handleFilterSubmit} disabled={loadingAnalytics}>
              {loadingAnalytics ? '조회 중...' : '분석 데이터 조회'}
            </Button>
          </div>

          {loadingAnalytics && (
            <div className="flex justify-center items-center py-10">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="ml-2">주문 분석 데이터를 불러오는 중입니다...</p>
            </div>
          )}

          {!loadingAnalytics && !orderAnalytics && (
            <div className="text-center py-10 text-gray-500">
              분석할 데이터가 없거나, 기간을 선택하고 '분석 데이터 조회' 버튼을 클릭해주세요.
            </div>
          )}

          {!loadingAnalytics && orderAnalytics && orderMetricsData && (
            <>
              <div className="space-y-6">
                {/* 주문 분석 요약 카드 */}
                <OrderAnalyticsSummaryCard summary={orderAnalytics?.summary} isLoading={loadingAnalytics} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 시간대별 주문 분석 차트 */}
                  {orderAnalytics && <HourlyOrdersChart data={orderAnalytics.hourly_orders} />}
                  
                  {/* 결제 수단별 분석 차트 */}
                  {orderAnalytics && <PaymentMethodChart data={orderAnalytics.payment_method_sales} />}

                  {/* 카테고리별 매출 분석 차트 */}
                  {orderAnalytics && <CategorySalesChart data={orderAnalytics.category_sales} />}

                  {/* 고급 메뉴 분석 차트 (AdvancedMenuChart)는 이미 컴포넌트화 되어 있음 */}
                  {orderAnalytics && orderAnalytics.menu_sales && orderAnalytics.menu_sales.length > 0 && (
                    <AdvancedMenuChart data={orderAnalytics.menu_sales} />
                  )}
                </div>
                {/* 주문 상태, 완료율/취소율 등은 OrderMetricsGrid 에서 표시될 수 있음 */}
                <OrderMetricsGrid data={orderMetricsData} />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 