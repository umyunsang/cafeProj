'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Edit2, RefreshCw } from "lucide-react"; // RefreshCw for loading indicator

interface OrderStatusActionsProps {
  currentStatus: string;
  availableStatuses: string[];
  onStatusChange: (newStatus: string) => Promise<void>;
  isLoading?: boolean; // Optional loading state for the select/button
}

export const OrderStatusActions = (
  { currentStatus, availableStatuses, onStatusChange, isLoading = false }: OrderStatusActionsProps
) => {
  return (
    <Card>
      <CardHeader className="border-b mb-4">
        <CardTitle className="text-xl font-semibold">
          <Edit2 className="mr-2 h-5 w-5 inline-block text-primary" />
          주문 상태 변경
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="currentOrderStatusDisplay" className="text-sm text-muted-foreground">현재 상태</Label>
          <p className="font-semibold text-lg" id="currentOrderStatusDisplay">{currentStatus}</p>
        </div>
        <div>
          <Label htmlFor="newOrderStatusSelect" className="text-sm text-muted-foreground">새로운 상태로 변경</Label>
          <div className="mt-1 flex items-center gap-2">
            <Select 
              onValueChange={onStatusChange} 
              defaultValue={currentStatus} 
              disabled={isLoading}
            >
              <SelectTrigger id="newOrderStatusSelect" className="flex-grow">
                {isLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <SelectValue placeholder="상태 선택..." />
                )}
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map(status => (
                  <SelectItem 
                    key={status} 
                    value={status} 
                    disabled={status === currentStatus || isLoading} // 현재 상태이거나 로딩 중이면 비활성화
                  >
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* 
            <Button onClick={() => { 
              // 이 버튼은 Select의 onValueChange가 직접 핸들러를 호출하므로 
              // 별도의 상태 관리(e.g. useState로 선택된 값 임시 저장) 없이는 현재 불필요.
              // 만약 분리한다면, Select에서 값을 선택하고 이 버튼으로 확정하는 흐름.
            }} disabled={isLoading} className="whitespace-nowrap">
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              변경 확인
            </Button> 
            */}
          </div>
        </div>
        {isLoading && <p className="text-xs text-muted-foreground text-center mt-2">상태를 변경 중입니다...</p>}
      </CardContent>
    </Card>
  );
}; 