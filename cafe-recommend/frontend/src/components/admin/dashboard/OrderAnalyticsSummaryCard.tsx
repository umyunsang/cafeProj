import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface OrderAnalyticsSummaryData {
  total_orders: number;
  total_sales: number;
  avg_order_value: number;
  period: {
    start: string;
    end: string;
  };
}

interface OrderAnalyticsSummaryCardProps {
  summary: OrderAnalyticsSummaryData | null | undefined;
  isLoading: boolean;
}

export const OrderAnalyticsSummaryCard = ({
  summary,
  isLoading,
}: OrderAnalyticsSummaryCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>주문 분석 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 bg-gray-100 rounded-lg animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>주문 분석 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <p>데이터가 없습니다. 기간을 선택하고 분석을 시작하세요.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold">
          주문 분석 요약 (기간: {summary.period.start} ~ {summary.period.end})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 bg-blue-50 rounded-xl shadow">
            <p className="text-sm font-medium text-blue-700 mb-1">총 주문 수</p>
            <p className="text-3xl font-bold text-blue-900">
              {summary.total_orders.toLocaleString()} 건
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl shadow">
            <p className="text-sm font-medium text-green-700 mb-1">총 매출액</p>
            <p className="text-3xl font-bold text-green-900">
              {summary.total_sales.toLocaleString()} 원
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-xl shadow">
            <p className="text-sm font-medium text-yellow-700 mb-1">
              평균 주문 금액
            </p>
            <p className="text-3xl font-bold text-yellow-900">
              {summary.avg_order_value.toLocaleString()} 원
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl shadow">
            <p className="text-sm font-medium text-purple-700 mb-1">
              분석 기간
            </p>
            <p className="text-lg font-semibold text-purple-900">
              {summary.period.start} ~ {summary.period.end}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 