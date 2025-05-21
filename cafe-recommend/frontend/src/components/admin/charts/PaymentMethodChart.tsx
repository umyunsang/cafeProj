import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 색상 팔레트 (대시보드 페이지와 동일하게 유지)
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28AFF', '#FF6B6B', '#4ECDC4'];

export interface PaymentMethodSaleData {
  method: string;
  order_count: number;
  total_amount: number;
}

interface PaymentMethodChartProps {
  data: PaymentMethodSaleData[];
}

export const PaymentMethodChart = ({ data }: PaymentMethodChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>결제 수단별 분석</CardTitle>
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
        <CardTitle>결제 수단별 분석</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent, total_amount }) => `${name} (${(percent * 100).toFixed(0)}%): ${total_amount.toLocaleString()}원`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="total_amount"
              nameKey="method"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, name: string, entry: any) => [
                `${value.toLocaleString()}원 (${entry.payload.order_count}건)`,
                name
            ]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}; 