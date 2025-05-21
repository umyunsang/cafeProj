import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface CategorySaleData {
  category: string;
  total_sales: number;
  item_count: number;
}

interface CategorySalesChartProps {
  data: CategorySaleData[];
}

export const CategorySalesChart = ({ data }: CategorySalesChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>카테고리별 매출 분석</CardTitle>
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
        <CardTitle>카테고리별 매출 분석</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: '매출액 (원)', position: 'insideBottom', offset: -5 }} />
            <YAxis dataKey="category" type="category" width={80} />
            <Tooltip formatter={(value: any, name: any) => [
                value.toLocaleString() + (name === 'total_sales' ? '원' : '개'), 
                name === 'total_sales' ? '총 매출액' : '판매 수량'
            ]} />
            <Legend />
            <Bar dataKey="total_sales" name="총 매출액" fill="#82ca9d" barSize={20} />
            {/* item_count는 필요시 추가 Bar로 표시 가능 */}
            {/* <Bar dataKey="item_count" name="판매 수량" fill="#8884d8" /> */}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}; 