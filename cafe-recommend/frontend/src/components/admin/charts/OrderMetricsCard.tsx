'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowUpRight, ArrowDownRight, CreditCard, Clock, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';

interface OrderMetricsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  changePercentage?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  progressValue?: number;
  progressColor?: string;
  subValue?: string;
  className?: string;
}

export default function OrderMetricsCard({
  title,
  value,
  icon,
  changePercentage,
  changeType = 'neutral',
  progressValue,
  progressColor = 'bg-blue-500',
  subValue,
  className = '',
}: OrderMetricsCardProps) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <div className="text-2xl font-bold">
              {value}
            </div>
            
            {(changePercentage !== undefined) && (
              <div className={`flex items-center mt-1 text-sm ${
                changeType === 'positive' ? 'text-green-500' : 
                changeType === 'negative' ? 'text-red-500' : 
                'text-gray-500'
              }`}>
                {changeType === 'positive' && <ArrowUpRight className="h-3 w-3 mr-1" />}
                {changeType === 'negative' && <ArrowDownRight className="h-3 w-3 mr-1" />}
                {changePercentage}%
                {subValue && <span className="text-gray-500 ml-1">({subValue})</span>}
              </div>
            )}
          </div>
          
          <div className={`p-2 rounded-full ${
            changeType === 'positive' ? 'bg-green-100 text-green-600' : 
            changeType === 'negative' ? 'bg-red-100 text-red-600' : 
            'bg-blue-100 text-blue-600'
          }`}>
            {icon}
          </div>
        </div>
        
        {progressValue !== undefined && (
          <div className="mt-4 space-y-2">
            <Progress 
              value={progressValue} 
              className="h-2" 
              indicatorClassName={progressColor}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 편의를 위한 사전 구성된 메트릭 카드들
export function CompletionRateCard({ 
  completionRate, 
  completedOrders, 
  totalOrders,
  className 
}: { 
  completionRate: number, 
  completedOrders: number, 
  totalOrders: number,
  className?: string 
}) {
  return (
    <OrderMetricsCard
      title="주문 완료율"
      value={`${completionRate.toFixed(1)}%`}
      icon={<CheckCircle2 className="h-5 w-5" />}
      changeType="positive"
      progressValue={completionRate}
      progressColor="bg-green-500"
      subValue={`${completedOrders}/${totalOrders}건`}
      className={className}
    />
  );
}

export function CancellationRateCard({
  cancellationRate,
  cancelledOrders,
  totalOrders,
  className
}: {
  cancellationRate: number,
  cancelledOrders: number,
  totalOrders: number,
  className?: string
}) {
  return (
    <OrderMetricsCard
      title="주문 취소율" 
      value={`${cancellationRate.toFixed(1)}%`}
      icon={<AlertTriangle className="h-5 w-5" />}
      changeType="negative"
      progressValue={cancellationRate}
      progressColor="bg-red-500"
      subValue={`${cancelledOrders}/${totalOrders}건`}
      className={className}
    />
  );
}

export function AverageOrderValueCard({
  avgOrderValue,
  previousAvgOrderValue,
  className
}: {
  avgOrderValue: number,
  previousAvgOrderValue?: number,
  className?: string
}) {
  const changePercentage = previousAvgOrderValue
    ? ((avgOrderValue - previousAvgOrderValue) / previousAvgOrderValue) * 100
    : undefined;
  
  const changeType = changePercentage
    ? (changePercentage > 0 ? 'positive' : changePercentage < 0 ? 'negative' : 'neutral')
    : undefined;
    
  return (
    <OrderMetricsCard
      title="평균 주문 금액"
      value={`${Math.round(avgOrderValue).toLocaleString()}원`}
      icon={<CreditCard className="h-5 w-5" />}
      changePercentage={changePercentage !== undefined ? Math.abs(Number(changePercentage.toFixed(1))) : undefined}
      changeType={changeType}
      className={className}
    />
  );
}

export function TotalSalesCard({
  totalSales,
  previousTotalSales,
  className
}: {
  totalSales: number,
  previousTotalSales?: number,
  className?: string
}) {
  const changePercentage = previousTotalSales
    ? ((totalSales - previousTotalSales) / previousTotalSales) * 100
    : undefined;
  
  const changeType = changePercentage
    ? (changePercentage > 0 ? 'positive' : changePercentage < 0 ? 'negative' : 'neutral')
    : undefined;
    
  return (
    <OrderMetricsCard
      title="총 매출"
      value={`${totalSales.toLocaleString()}원`}
      icon={<TrendingUp className="h-5 w-5" />}
      changePercentage={changePercentage !== undefined ? Math.abs(Number(changePercentage.toFixed(1))) : undefined}
      changeType={changeType}
      className={className}
    />
  );
}

export interface OrderMetricsGridData {
  completionRate: number;
  cancellationRate: number;
  completedOrders: number;
  cancelledOrders: number;
  totalOrders: number;
  avgOrderValue: number;
  totalSales: number;
  previousAvgOrderValue?: number;
  previousTotalSales?: number;
  orderStatus?: { status: string; count: number; percentage: number; }[];
}

export function OrderMetricsGrid({ 
  data,
  className 
}: { 
  data: OrderMetricsGridData,
  className?: string
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <CompletionRateCard 
        completionRate={data.completionRate}
        completedOrders={data.completedOrders}
        totalOrders={data.totalOrders}
      />
      <CancellationRateCard
        cancellationRate={data.cancellationRate}
        cancelledOrders={data.cancelledOrders}
        totalOrders={data.totalOrders}
      />
      <AverageOrderValueCard
        avgOrderValue={data.avgOrderValue}
        previousAvgOrderValue={data.previousAvgOrderValue}
      />
      <TotalSalesCard
        totalSales={data.totalSales}
        previousTotalSales={data.previousTotalSales}
      />
    </div>
  );
} 