'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PopularItem {
  name: string;
  count: number;
}

interface PopularMenuItemsChartProps {
  data: PopularItem[];
  colors: string[];
}

const PopularMenuItemsChartComponent: React.FC<PopularMenuItemsChartProps> = ({ data, colors }) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>인기 메뉴 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">표시할 인기 메뉴 데이터가 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>인기 메뉴 분석</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
              nameKey="name"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [`${value}개`, name]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const PopularMenuItemsChart = React.memo(PopularMenuItemsChartComponent); 