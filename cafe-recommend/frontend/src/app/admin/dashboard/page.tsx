'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
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
import { OrderMetricsGrid } from '@/components/admin/charts/OrderMetricsCard';
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

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
    items: string;
    total: number;
    status: string;
    date: string;
  }[];
  popularItems: {
    name: string;
    count: number;
  }[];
  todaySummary: {
    totalSales: number;
    yesterdaySales: number;
    growthRate: number;
  };
}

interface OrderAnalytics {
  menu_sales: {
    id: number;
    name: string;
    category: string;
    quantity: number;
    total_sales: number;
  }[];
  hourly_orders: {
    hour: number;
    order_count: number;
    total_amount: number;
  }[];
  payment_method_sales: {
    method: string;
    order_count: number;
    total_amount: number;
  }[];
  order_status: {
    status: string;
    count: number;
    percentage: number;
  }[];
  completion_rate: number;
  cancellation_rate: number;
  category_sales: {
    category: string;
    total_sales: number;
    item_count: number;
  }[];
  daily_trend: {
    date: string;
    order_count: number;
    total_amount: number;
  }[];
  summary: {
    total_orders: number;
    total_sales: number;
    avg_order_value: number;
    period: {
      start: string;
      end: string;
    };
  };
}

// 성장률에 따른 색상 반환 함수
const getGrowthRateColor = (rate: number): string => {
  if (rate > 15) return 'text-green-600';
  if (rate > 0) return 'text-green-500';
  if (rate === 0) return 'text-gray-500';
  if (rate > -15) return 'text-red-500';
  return 'text-red-600';
};

// 성장률 아이콘 컴포넌트
const GrowthRateIcon = ({ rate }: { rate: number }) => {
  if (rate > 0) return <ArrowUpIcon className="h-5 w-5 text-green-500" />;
  if (rate < 0) return <ArrowDownIcon className="h-5 w-5 text-red-500" />;
  return <span className="h-5 w-5">-</span>;
};

// 매출 요약 카드 컴포넌트
const SalesSummaryCard = ({ data }: { data: DashboardData['todaySummary'] }) => {
  const growthRateClass = getGrowthRateColor(data.growthRate);
  
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">오늘 매출 요약</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">오늘 총 매출</p>
            <p className="text-2xl font-bold">{data.totalSales.toLocaleString()}원</p>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">어제 총 매출</p>
            <p className="text-2xl font-bold">{data.yesterdaySales.toLocaleString()}원</p>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">어제 대비 성장률</p>
            <div className="flex items-center">
              <GrowthRateIcon rate={data.growthRate} />
              <p className={`text-2xl font-bold ml-1 ${growthRateClass}`}>
                {Math.abs(data.growthRate).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

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
  const [loading, setLoading] = useState(false);
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

  const fetchOrderAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      // 날짜 형식 변환
      const startDateString = startDate ? 
        `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}` : 
        undefined;
        
      const endDateString = endDate ? 
        `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}` : 
        undefined;
      
      // 쿼리 파라미터 구성
      const queryParams = new URLSearchParams();
      if (startDateString) queryParams.append('start_date', startDateString);
      if (endDateString) queryParams.append('end_date', endDateString);
      
      const url = `/api/admin/order-analytics?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrderAnalytics(data);
      } else {
        toast.error('주문 분석 데이터를 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('주문 분석 데이터 로딩 실패:', error);
      toast.error('주문 분석 데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Toaster position="top-right" />
        <h1 className="text-3xl font-bold">대시보드</h1>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="order-analytics">주문 분석</TabsTrigger>
          </TabsList>
          
          {/* 개요 탭 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 실시간 매출 위젯 */}
            <RealtimeSalesWidget />
            
            {/* 매출 요약 카드 (신규) */}
            {dashboardData.todaySummary && (
              <SalesSummaryCard data={dashboardData.todaySummary} />
            )}
            
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
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">주문 ID</th>
                        <th className="text-left p-2">메뉴</th>
                        <th className="text-left p-2">총액</th>
                        <th className="text-left p-2">상태</th>
                        <th className="text-left p-2">날짜</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recentOrders.map((order) => (
                        <tr key={order.id} className="border-b">
                          <td className="p-2">{order.id}</td>
                          <td className="p-2">{order.items}</td>
                          <td className="p-2">{order.total.toLocaleString()}원</td>
                          <td className="p-2">{order.status}</td>
                          <td className="p-2">{order.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 인기 메뉴 */}
            <Card>
              <CardHeader>
                <CardTitle>인기 메뉴</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.popularItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span>{item.name}</span>
                      <span className="font-bold">{item.count}회 주문</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 주문 분석 탭 */}
          <TabsContent value="order-analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>기간 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-gray-500">시작일</span>
                    <DatePicker 
                      date={startDate} 
                      setDate={setStartDate} 
                      className="w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-gray-500">종료일</span>
                    <DatePicker 
                      date={endDate} 
                      setDate={setEndDate} 
                      className="w-full"
                    />
                  </div>
                  <Button 
                    className="mt-6" 
                    onClick={fetchOrderAnalytics}
                    disabled={loading}
                  >
                    {loading ? '로딩 중...' : '조회'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {orderAnalytics ? (
              <>
                {/* 요약 정보 - 메트릭스 카드로 교체 */}
                <OrderMetricsGrid
                  data={{
                    completionRate: orderAnalytics.completion_rate,
                    cancellationRate: orderAnalytics.cancellation_rate,
                    completedOrders: orderAnalytics.order_status.find(s => s.status === 'completed')?.count || 0,
                    cancelledOrders: orderAnalytics.order_status.find(s => s.status === 'cancelled')?.count || 0,
                    totalOrders: orderAnalytics.summary.total_orders,
                    avgOrderValue: orderAnalytics.summary.avg_order_value,
                    totalSales: orderAnalytics.summary.total_sales
                  }}
                  className="mb-6"
                />

                {/* 메뉴 판매량 분석 - 고급 차트로 교체 */}
                <AdvancedMenuChart 
                  data={orderAnalytics.menu_sales} 
                  className="mb-6"
                />

                {/* 일별 주문 및 매출 추이 - 개선된 시각화 */}
                <Card>
                  <CardHeader>
                    <CardTitle>일별 주문 및 매출 추이</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={orderAnalytics.daily_trend}>
                          <defs>
                            <linearGradient id="colorOrderCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                          <Tooltip 
                            formatter={(value, name) => [
                              name === 'order_count' ? `${value}건` : `${Number(value).toLocaleString()}원`,
                              name === 'order_count' ? '주문 수' : '매출액'
                            ]}
                          />
                          <Legend />
                          <Area 
                            yAxisId="left" 
                            type="monotone" 
                            dataKey="order_count" 
                            name="주문 수" 
                            stroke="#8884d8" 
                            fillOpacity={1} 
                            fill="url(#colorOrderCount)" 
                          />
                          <Area 
                            yAxisId="right" 
                            type="monotone" 
                            dataKey="total_amount" 
                            name="매출액" 
                            stroke="#82ca9d" 
                            fillOpacity={1} 
                            fill="url(#colorAmount)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 시간대별 주문량 */}
                <Card>
                  <CardHeader>
                    <CardTitle>시간대별 주문량</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={orderAnalytics.hourly_orders}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}시`} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="order_count" name="주문 수" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 결제 방법별 매출 */}
                <Card>
                  <CardHeader>
                    <CardTitle>결제 방법별 매출</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col md:flex-row justify-between">
                    <div className="w-full md:w-1/2 h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orderAnalytics.payment_method_sales}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="total_amount"
                            nameKey="method"
                            label={({ method, percent }) => `${method} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {orderAnalytics.payment_method_sales.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${Number(value).toLocaleString()}원`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 overflow-x-auto">
                      <table className="w-full mt-4 md:mt-0">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">결제 방법</th>
                            <th className="text-right p-2">주문 수</th>
                            <th className="text-right p-2">매출</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderAnalytics.payment_method_sales.map((item, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-2">{item.method}</td>
                              <td className="p-2 text-right">{item.order_count.toLocaleString()}</td>
                              <td className="p-2 text-right">{item.total_amount.toLocaleString()}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* 카테고리별 매출 */}
                <Card>
                  <CardHeader>
                    <CardTitle>카테고리별 매출</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col md:flex-row justify-between">
                    <div className="w-full md:w-1/2 h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orderAnalytics.category_sales}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="total_sales"
                            nameKey="category"
                            label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {orderAnalytics.category_sales.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${Number(value).toLocaleString()}원`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 overflow-x-auto">
                      <table className="w-full mt-4 md:mt-0">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">카테고리</th>
                            <th className="text-right p-2">항목 수</th>
                            <th className="text-right p-2">매출</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderAnalytics.category_sales.map((item, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-2">{item.category}</td>
                              <td className="p-2 text-right">{item.item_count.toLocaleString()}</td>
                              <td className="p-2 text-right">{item.total_sales.toLocaleString()}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* 주문 상태 분석 */}
                <Card>
                  <CardHeader>
                    <CardTitle>주문 상태 분석</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-1/2">
                        <h3 className="text-lg font-medium mb-4">주문 완료율 및 취소율</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="bg-green-50">
                            <CardContent className="p-4">
                              <div className="text-sm text-gray-600">완료율</div>
                              <div className="text-2xl font-bold text-green-600">{orderAnalytics.completion_rate.toFixed(1)}%</div>
                            </CardContent>
                          </Card>
                          <Card className="bg-red-50">
                            <CardContent className="p-4">
                              <div className="text-sm text-gray-600">취소율</div>
                              <div className="text-2xl font-bold text-red-600">{orderAnalytics.cancellation_rate.toFixed(1)}%</div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                      <div className="w-full md:w-1/2">
                        <h3 className="text-lg font-medium mb-4">주문 상태별 분포</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">상태</th>
                                <th className="text-right p-2">건수</th>
                                <th className="text-right p-2">비율</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderAnalytics.order_status.map((item, index) => (
                                <tr key={index} className="border-b">
                                  <td className="p-2">{item.status}</td>
                                  <td className="p-2 text-right">{item.count.toLocaleString()}</td>
                                  <td className="p-2 text-right">{item.percentage.toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 메뉴별 판매량 */}
                <Card>
                  <CardHeader>
                    <CardTitle>메뉴별 판매량 순위</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">순위</th>
                            <th className="text-left p-2">메뉴명</th>
                            <th className="text-left p-2">카테고리</th>
                            <th className="text-right p-2">판매 수량</th>
                            <th className="text-right p-2">매출</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderAnalytics.menu_sales.map((item, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-2">{index + 1}</td>
                              <td className="p-2">{item.name}</td>
                              <td className="p-2">{item.category}</td>
                              <td className="p-2 text-right">{item.quantity.toLocaleString()}</td>
                              <td className="p-2 text-right">{item.total_sales.toLocaleString()}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center p-12">
                  <div className="text-center">
                    <p className="mb-4 text-gray-500">분석 데이터가 없습니다.</p>
                    <Button onClick={fetchOrderAnalytics}>데이터 불러오기</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
} 