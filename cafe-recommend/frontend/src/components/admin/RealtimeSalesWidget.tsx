'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, AlertCircleIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://116.124.191.174:15030';

interface RealtimeSalesData {
  today_sales: number;
  current_hour: {
    hour: number;
    count: number;
    amount: number;
  };
  latest_order?: {
    id: number;
    order_number: string;
    total_amount: number;
    status: string;
    created_at: string;
  };
  timestamp: string;
}

// 프론트엔드에서 사용하는 OrderItem (OrderItemsTable 등에서 사용)
// RealtimeSalesWidget 내부에서는 이 형태로 변환된 items를 직접 사용하지 않지만,
// formatOrderItems 함수는 이 구조를 참고하여 menu 객체를 생성함.
interface FrontendOrderItem {
    id: number;
    menu_id: number;
    quantity: number;
    status: string;
    menu: {
        name: string;
        price: number;
    };
    // 필요에 따라 백엔드의 AdminOrderItemResponse의 다른 필드도 추가 가능
}

interface RealtimeSalesWidgetProps {
  className?: string;
}

export default function RealtimeSalesWidget({ className }: RealtimeSalesWidgetProps) {
  const [connected, setConnected] = useState(false);
  const [salesData, setSalesData] = useState<RealtimeSalesData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 마지막 시간대 매출 데이터 저장 (변화 감지용)
  const lastHourlyDataRef = useRef<{
    count: number;
    amount: number;
  }>({ count: 0, amount: 0 });

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // 관리자 토큰 가져오기
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        if (!token) {
          setError('관리자 인증 정보가 없습니다');
          return;
        }

        // WebSocket 연결
        const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/admin/realtime-sales?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('실시간 매출 데이터 WebSocket 연결됨');
          setConnected(true);
          setError(null);
        };

        ws.onmessage = (event) => {
          console.log('Raw WebSocket Data:', event.data); // 원본 데이터 로깅
          try {
            const message = JSON.parse(event.data);
            
            // formatOrderItems는 백엔드의 AdminOrderItemResponse[]를 프론트엔드의 FrontendOrderItem[] 형태로 변환하는 헬퍼
            const formatOrderItems = (backendItems: any[] | undefined): FrontendOrderItem[] => {
              if (!backendItems) return [];
              return backendItems.map((item: any) => ({
                id: item.id,
                menu_id: item.menu_id,
                quantity: item.quantity,
                status: item.status,
                menu: { 
                  name: item.menu_name || "알 수 없는 메뉴", 
                  price: item.unit_price ?? 0 
                },
              }));
            };

            let dataFromBackend = message.data; // message.data가 실제 백엔드 데이터 객체
            let processedLatestOrderForState: RealtimeSalesData['latest_order'] | undefined = undefined;

            if (message.type === 'order_event' || message.type === 'order_update') { // 백엔드가 'order_update'로 보낼 수 있음
              console.log(`[Raw ${message.type} Data]`, JSON.stringify(dataFromBackend, null, 2));

              if (dataFromBackend && typeof dataFromBackend === 'object' && dataFromBackend.id) {
                // dataFromBackend (AdminOrderResponse)를 RealtimeSalesData.latest_order 형태로 변환
                processedLatestOrderForState = {
                  id: dataFromBackend.id,
                  order_number: dataFromBackend.order_number || '',
                  total_amount: dataFromBackend.total_amount || 0,
                  status: dataFromBackend.status || 'unknown',
                  created_at: dataFromBackend.created_at || new Date().toISOString(),
                  // RealtimeSalesData.latest_order는 items를 포함하지 않으므로, 여기서 items를 설정하지 않음.
                };
                console.log(`[Processed ${message.type} for latest_order state]`, JSON.stringify(processedLatestOrderForState, null, 2));
              } else {
                console.warn(`[${message.type} Data] is not a valid order object:`, dataFromBackend);
              }
            }

            // initial_data 또는 update_data에 포함된 latest_order.items 등을 변환하는 로직
            // 이 데이터들은 RealtimeSalesData 인터페이스 전체를 따를 것으로 예상됨
            let finalDataToSet = { ...dataFromBackend }; // 변경을 위해 복사

            if (message.type === 'initial_data' || message.type === 'update_data') {
              if (finalDataToSet.latest_order && finalDataToSet.latest_order.items && Array.isArray(finalDataToSet.latest_order.items)) {
                console.log(`[${message.type}] Formatting latest_order.items`);
                finalDataToSet.latest_order = {
                    ...finalDataToSet.latest_order,
                    items: formatOrderItems(finalDataToSet.latest_order.items) // 이 부분은 latest_order 인터페이스에 items가 있다면 유효
                                                                               // 현재 RealtimeSalesData.latest_order에는 items가 없으므로,
                                                                               // 이 변환된 items는 salesData 상태에는 반영되지 않음 (의도된 동작인지 확인 필요)
                };
              }
              if (finalDataToSet.recent_orders && Array.isArray(finalDataToSet.recent_orders)) {
                console.log(`[${message.type}] Formatting recent_orders items`);
                finalDataToSet.recent_orders = finalDataToSet.recent_orders.map((order: any) => {
                  if (order && order.items && Array.isArray(order.items)) {
                    return { ...order, items: formatOrderItems(order.items) };
                  }
                  return order;
                });
              }
            }

            // 상태 업데이트 로직
            if (message.type === 'initial_data') {
              console.log('Setting initial_data to salesData:', JSON.stringify(finalDataToSet, null, 2));
              setSalesData(finalDataToSet as RealtimeSalesData);
              setLastUpdate(new Date());
              
              if (finalDataToSet.current_hour) { // current_hour는 hourly_data가 아닌 직접 참조
                lastHourlyDataRef.current = {
                  count: finalDataToSet.current_hour.count,
                  amount: finalDataToSet.current_hour.amount
                };
              }
            } 
            else if (message.type === 'update_data') {
              console.log('Setting update_data to salesData:', JSON.stringify(finalDataToSet, null, 2));
              setSalesData(finalDataToSet as RealtimeSalesData);
              setLastUpdate(new Date());
            }
            else if (message.type === 'order_event' || message.type === 'order_update') {
              if (processedLatestOrderForState) {
                console.log(`Reflecting ${message.type} in salesData.latest_order:`, JSON.stringify(processedLatestOrderForState, null, 2));
                setSalesData(prev => {
                  const newTimestamp = new Date().toISOString();
                  const currentSalesData = prev || {
                    today_sales: 0, 
                    current_hour: {hour: new Date(newTimestamp).getHours(), count:0, amount:0}, 
                    timestamp: newTimestamp 
                  };
                  return { 
                    ...currentSalesData,
                    latest_order: processedLatestOrderForState, 
                    timestamp: newTimestamp 
                  };
                });
              } else {
                console.warn(`No valid processed order data from ${message.type} to update salesData.latest_order.`);
              }
            }
            else if (message.type === 'error') {
              console.error('WebSocket error message from server:', message.message);
              setError(message.message);
            }
          } catch (err) {
            console.error('Error processing WebSocket message:', err);
            //메시지 처리 중 오류가 발생하면, 원본 event.data를 확인하는 것이 유용할 수 있음
            console.error('Original data that caused processing error:', event.data);
          }
        };

        ws.onerror = (event: Event) => {
          console.error('WebSocket 오류 발생:', event);
          // Event 객체의 표준 속성들을 로깅해볼 수 있습니다.
          // 예를 들어, event.type 등
          // 특정 WebSocket 오류 이벤트(예: CloseEvent)는 code, reason 등의 추가 속성을 가질 수 있습니다.
          // event 객체의 실제 타입을 확인하고 그에 맞는 속성을 로깅하는 것이 좋습니다.
          let errorMessage = '연결 오류가 발생했습니다.';
          if (event instanceof CloseEvent) {
            console.error(`  - Code: ${event.code}`);
            console.error(`  - Reason: ${event.reason}`);
            console.error(`  - Was Clean: ${event.wasClean}`);
            errorMessage = `연결 오류 (코드: ${event.code}${event.reason ? ', 이유: ' + event.reason : ''})`;
          } else {
            console.error('  - Event Type:', event.type);
            // 일반 Event 객체에는 code나 reason이 없을 수 있습니다.
            // 필요하다면 event 객체 전체를 JSON.stringify로 살펴보거나, 다른 속성을 로깅합니다.
             try {
                console.error('  - Event Details:', JSON.stringify(event, Object.getOwnPropertyNames(event)));
             } catch (e) {
                console.error('  - Event Details: (Unable to stringify - circular structure or other issue)');
             }
          }
          setError(errorMessage);
          setConnected(false);
        };

        ws.onclose = (event: CloseEvent) => {
          console.log('WebSocket 연결 종료:', event.code, event.reason);
          setConnected(false);
          
          // 비정상 종료시 자동 재연결 시도 (5초 후)
          if (event.code !== 1000) {
            setTimeout(() => {
              connectWebSocket();
            }, 5000);
          }
        };

        return ws;
      } catch (err) {
        console.error('WebSocket 연결 오류:', err);
        setError('WebSocket 연결에 실패했습니다');
        return null;
      }
    };

    const ws = connectWebSocket();

    // 컴포넌트 언마운트 시 WebSocket 연결 해제
    return () => {
      if (wsRef.current) { // wsRef 사용
        wsRef.current.close();
      }
    };
  }, []);

  // 변화율 계산 (현재 시간대의 이전 값 대비)
  const calculateChangeRate = (current: number, previous: number): number => {
    if (previous === 0) return current === 0 ? 0 : Infinity; // 0에서 증가하면 무한대, 0에서 0이면 0%
    return ((current - previous) / previous) * 100;
  };

  // 주문 개수 변화율
  const orderCountChange = salesData?.current_hour && lastHourlyDataRef.current
    ? calculateChangeRate(salesData.current_hour.count, lastHourlyDataRef.current.count)
    : 0;

  // 매출액 변화율
  const salesAmountChange = salesData?.current_hour && lastHourlyDataRef.current
    ? calculateChangeRate(salesData.current_hour.amount, lastHourlyDataRef.current.amount)
    : 0;

  return (
    <div className={className}>
      <Card className={`overflow-hidden ${connected ? 'border-green-400' : 'border-red-400'}`}>
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl flex items-center">
              <TrendingUpIcon className="mr-2 h-5 w-5" />
              실시간 매출 현황
            </CardTitle>
            
            <Badge variant={connected ? "success" : "destructive"} className="px-2 py-1">
              {connected ? '실시간 연결됨' : '연결 끊김'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          {error ? (
            <div className="flex items-center text-red-500 mb-4">
              <AlertCircleIcon className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          ) : null}
          
          {salesData ? (
            <div className="space-y-4">
              {/* 오늘 총 매출 */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="text-sm font-medium text-gray-500 mb-1">오늘의 총 매출</h3>
                <p className="text-3xl font-bold">{salesData.today_sales.toLocaleString()}원</p>
              </div>
              
              {/* 현재 시간대 주문 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">현재 시간대 주문 수</h3>
                  <div className="flex items-end">
                    <p className="text-2xl font-bold mr-2">
                      {salesData?.current_hour?.count !== undefined ? `${salesData.current_hour.count}건` : '집계 중...'}
                    </p>
                    {salesData?.current_hour?.count !== undefined && orderCountChange !== 0 && (
                      <span className={`text-sm flex items-center ${orderCountChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {orderCountChange > 0 ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                        {isFinite(orderCountChange) ? `${Math.abs(orderCountChange).toFixed(1)}%` : 'N/A'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">현재 시간대 매출액</h3>
                  <div className="flex items-end">
                    <p className="text-2xl font-bold mr-2">
                      {salesData?.current_hour?.amount !== undefined ? `${salesData.current_hour.amount.toLocaleString()}원` : '집계 중...'}
                    </p>
                    {salesData?.current_hour?.amount !== undefined && salesAmountChange !== 0 && (
                      <span className={`text-sm flex items-center ${salesAmountChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {salesAmountChange > 0 ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                        {isFinite(salesAmountChange) ? `${Math.abs(salesAmountChange).toFixed(1)}%` : 'N/A'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 최근 주문 */}
              {salesData.latest_order && (
                <div className="border rounded-lg p-4 bg-purple-50">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">최근 주문</h3>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">#{salesData.latest_order.order_number}</p>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(salesData.latest_order.created_at), { 
                          addSuffix: true, 
                          locale: ko 
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{salesData.latest_order.total_amount.toLocaleString()}원</p>
                      <Badge variant={
                        salesData.latest_order.status.toLowerCase() === 'completed' || salesData.latest_order.status.toLowerCase() === 'delivered' ? 'success' :
                        salesData.latest_order.status.toLowerCase() === 'cancelled' || salesData.latest_order.status.toLowerCase() === 'failed' || salesData.latest_order.status.toLowerCase() === 'refunded' ? 'destructive' :
                        'secondary' // pending, processing 등
                      } className="ml-2">
                        {salesData.latest_order.status}
                      </Badge>
                    </div>
                  </div>
                  {/* 만약 latest_order.items를 표시해야 한다면, RealtimeSalesData.latest_order에 items: FrontendOrderItem[]를 추가하고 여기서 렌더링 */}
                </div>
              )}
              
              {/* 마지막 업데이트 시간 */}
              {lastUpdate && (
                <div className="text-xs text-right text-gray-400">
                  마지막 업데이트: {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ko })}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              {connected ? '데이터 로딩 중...' : '연결 시도 중...'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 