import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

// 성장률에 따른 색상 반환 함수
const getGrowthRateColor = (rate: number): string => {
  if (rate > 15) return "text-green-600";
  if (rate > 0) return "text-green-500";
  if (rate === 0) return "text-gray-500";
  if (rate > -15) return "text-red-500";
  return "text-red-600";
};

// 성장률 아이콘 컴포넌트
const GrowthRateIcon = ({ rate }: { rate: number }) => {
  if (rate > 0) return <ArrowUpIcon className="h-5 w-5 text-green-500" />;
  if (rate < 0) return <ArrowDownIcon className="h-5 w-5 text-red-500" />;
  return <span className="h-5 w-5">-</span>;
};

export interface SalesSummaryData {
  totalSales: number;
  yesterdaySales: number;
  growthRate: number;
}

// 매출 요약 카드 컴포넌트
export const SalesSummaryCard = ({ data }: { data: SalesSummaryData }) => {
  const growthRateClass = getGrowthRateColor(data.growthRate);

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">오늘 매출 요약</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">
              오늘 총 매출
            </p>
            <p className="text-2xl font-bold">
              {data.totalSales.toLocaleString()}원
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">
              어제 총 매출
            </p>
            <p className="text-2xl font-bold">
              {data.yesterdaySales.toLocaleString()}원
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">
              어제 대비 성장률
            </p>
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