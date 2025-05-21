'use client';

import { useState } from 'react';
import { 
  BarChart, Bar, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

export interface MenuSalesItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  total_sales: number;
}

interface AdvancedMenuChartProps {
  data: MenuSalesItem[];
  className?: string;
}

export default function AdvancedMenuChart({ data, className }: AdvancedMenuChartProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // 카테고리별로 데이터 그룹화
  const categoryGroups = data.reduce((groups, item) => {
    const category = item.category || '미분류';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, MenuSalesItem[]>);
  
  // 레이더 차트용 데이터 변환
  const transformDataForRadar = (data: MenuSalesItem[]) => {
    // 각 카테고리별 판매량 합계 계산
    const categoryTotals = data.reduce((totals, item) => {
      const category = item.category || '미분류';
      if (!totals[category]) {
        totals[category] = 0;
      }
      totals[category] += item.quantity;
      return totals;
    }, {} as Record<string, number>);
    
    // 레이더 차트용 데이터 형식으로 변환
    return Object.entries(categoryTotals).map(([category, quantity]) => ({
      category,
      quantity
    }));
  };
  
  // 검색어에 따라 데이터 필터링
  const filteredData = searchTerm
    ? data.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data;
  
  // 판매량 기준 상위 10개 항목만 표시
  const topItems = [...filteredData]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
  
  // 레이더 차트 데이터
  const radarData = transformDataForRadar(data);
  
  // 카테고리별 색상 매핑
  const categoryColors: Record<string, string> = {
    '커피': '#8884d8',
    '논커피': '#82ca9d',
    '스무디': '#ffc658',
    '티': '#ff8042',
    '디저트': '#a4de6c',
    '브런치': '#d0ed57',
    '미분류': '#83a6ed',
  };
  
  // 검색창에서 엔터키 누를 때 동작
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-xl">메뉴 판매량 분석</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="메뉴 또는 카테고리 검색..."
              className="pl-8 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bar-chart">
          <TabsList className="mb-4 flex justify-center">
            <TabsTrigger value="bar-chart">판매량 차트</TabsTrigger>
            <TabsTrigger value="radar-chart">카테고리 레이더</TabsTrigger>
            <TabsTrigger value="category-breakdown">카테고리별 분석</TabsTrigger>
          </TabsList>
          
          {/* 막대 차트 */}
          <TabsContent value="bar-chart">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topItems}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'quantity' ? `${value}개` : `${Number(value).toLocaleString()}원`,
                      name === 'quantity' ? '판매량' : '매출액'
                    ]}
                  />
                  <Legend />
                  <Bar name="판매량" dataKey="quantity" fill="#8884d8" />
                  <Bar name="매출액" dataKey="total_sales" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {/* 레이더 차트 */}
          <TabsContent value="radar-chart">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius={150} data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis />
                  <Radar
                    name="판매량"
                    dataKey="quantity"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Tooltip formatter={(value) => [`${value}개`, '판매량']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {/* 카테고리별 분석 */}
          <TabsContent value="category-breakdown">
            <div className="space-y-6">
              {Object.entries(categoryGroups).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{category}</h3>
                    <Badge variant="secondary">{items.length}개 메뉴</Badge>
                  </div>
                  
                  <div className="grid gap-3">
                    {items
                      .sort((a, b) => b.quantity - a.quantity)
                      .slice(0, 5)
                      .map(item => (
                        <div key={item.id} className="flex items-center bg-gray-50 rounded-md p-3">
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.total_sales.toLocaleString()}원</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-bold">{item.quantity}개</div>
                              <div className="text-xs text-gray-500">판매량</div>
                            </div>
                            <div 
                              className="h-10 w-2 rounded-full" 
                              style={{ 
                                backgroundColor: categoryColors[category] || '#8884d8',
                                opacity: 0.2 + (item.quantity / Math.max(...items.map(i => i.quantity)) * 0.8)
                              }}
                            />
                          </div>
                        </div>
                    ))}
                    
                    {items.length > 5 && (
                      <div className="text-center text-sm text-gray-500 mt-2">
                        외 {items.length - 5}개 메뉴
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 