import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface HourlyOrderData {
  hour: number;
  order_count: number;
  total_amount: number;
}

interface HourlyOrdersChartProps {
  data: HourlyOrderData[];
}

const formatHour = (hour: number) => {
  return `${String(hour).padStart(2, '0')}:00`;
};

export const HourlyOrdersChart = ({ data }: HourlyOrdersChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>시간대별 주문 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <p>표시할 데이터가 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>시간대별 주문 분석</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="hour" 
              tickFormatter={formatHour} 
              angle={-45} 
              textAnchor="end" 
              height={50} 
            />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: '주문 건수', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: '매출액 (원)', angle: -90, position: 'insideRight' }} />
            <Tooltip formatter={(value: any, name: any) => [value.toLocaleString() + (name === 'total_amount' ? '원' : '건'), name === 'order_count' ? '주문 건수' : '매출액']} />
            <Legend />
            <Bar yAxisId="left" dataKey="order_count" name="주문 건수" fill="#8884d8" barSize={20} />
            <Line yAxisId="right" type="monotone" dataKey="total_amount" name="매출액" stroke="#82ca9d" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}; 