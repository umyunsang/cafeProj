import {
  LineChart,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DailyTrendData {
  date: string;
  order_count: number;
  total_amount: number;
}

interface DailyTrendChartProps {
  data: DailyTrendData[];
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const DailyTrendChart = ({ data }: DailyTrendChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>일별 주문 동향</CardTitle>
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
        <CardTitle>일별 주문 동향 (선택 기간)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 50, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate} 
              angle={-45} 
              textAnchor="end"
            />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: '주문 건수', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: '매출액 (원)', angle: -90, position: 'insideRight' }} />
            <Tooltip formatter={(value: any, name: any) => [
                value.toLocaleString() + (name === 'total_amount' ? '원' : '건'), 
                name === 'order_count' ? '주문 건수' : '매출액'
            ]} />
            <Legend verticalAlign="top" wrapperStyle={{ top: -10, right: 0 }}/>
            <Bar yAxisId="left" dataKey="order_count" name="주문 건수" fill="#8884d8" barSize={15} />
            <Line yAxisId="right" type="monotone" dataKey="total_amount" name="매출액" stroke="#82ca9d" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}; 