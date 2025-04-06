'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/admin/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardData {
  dailySales: {
    date: string;
    amount: number;
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
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    dailySales: [],
    recentOrders: [],
    popularItems: [],
  });

  useEffect(() => {
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
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">대시보드</h1>

        {/* 일일 매출 그래프 */}
        <Card>
          <CardHeader>
            <CardTitle>일일 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.dailySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
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
      </div>
    </AdminLayout>
  );
} 