import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, Eye, MoreHorizontal, Check, X, PackageCheck, ShoppingBag } from "lucide-react";

// orders/page.tsx 에서 Order, OrderItem 인터페이스를 가져오거나 여기에 직접 정의
// 우선 간단하게 Order 인터페이스 정의
export interface OrderItem {
  id: number;
  menu_id: number | null;
  quantity: number;
  status: string; // 'pending' | 'completed' | 'cancelled'; (AdminOrdersPage와 일치하도록 string으로)
  menu: {
    name: string;
    price: number;
  };
  // AdminOrderItemResponse 스키마와 맞추기 위해 추가 필드가 있을 수 있음
  // unit_price: number;
  // total_price: number;
  // created_at: string;
  // updated_at: string;
}

export interface Order {
  id: string; 
  order_number: string; 
  display_order_number: string; 
  status: string; 
  total_amount: number;
  created_at: string; 
  items: OrderItem[];
  customer_name?: string; 
  payment_method?: string; 
  // AdminOrderResponse 스키마와 맞추기 위해 추가 필드가 있을 수 있음
  // user_id?: number;
  // payment_key?: string;
  // session_id?: string;
  // delivery_address?: string;
  // delivery_request?: string;
  // phone_number?: string;
  // updated_at?: string;
}

interface OrderTableProps {
  orders: Order[]; 
  currentOrders: Order[]; 
  sortConfig: { key: keyof Order | 'customer_name'; direction: "ascending" | "descending" } | null;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  requestSort: (key: keyof Order | 'customer_name') => void;
  getSortIndicator: (key: keyof Order | 'customer_name') => string;
  handleViewOrderDetails?: (orderId: string) => void; 
  paginate: (pageNumber: number) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: string) => Promise<void>; // 주문 상태 변경 핸들러 추가
  processingOrderId?: string | null; // 현재 처리 중인 주문 ID (옵셔널로 추가)
}

export const OrderTable = ({
  orders,
  currentOrders,
  sortConfig,
  currentPage,
  totalPages,
  requestSort,
  getSortIndicator,
  handleViewOrderDetails,
  paginate,
  onUpdateOrderStatus, // prop 추가
  processingOrderId, // prop 추가
}: OrderTableProps) => {

  const getStatusTextAndVariant = (status: string): { text: string; variant: string } => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case 'paid':
        return { text: '결제완료', variant: 'default' }; // Shadcn-UI 기본 Badge 스타일
      case 'pending':
      case 'processing':
      case 'preparing':
        return { text: '준비중', variant: 'secondary' };
      case 'served': // "제공완료" 상태 (백엔드에서 completed 또는 served 사용 가정)
      case 'completed':
        return { text: '제공완료', variant: 'success' }; // 초록색 계열
      case 'ready_for_pickup': 
        return { text: '픽업대기', variant: 'warning' }; // 주황색 계열 (필요시 사용)
      case 'cancelled':
      case 'failed':
        return { text: '취소됨', variant: 'destructive' };
      default:
        return { text: status || '알수없음', variant: 'outline' };
    }
  };

  // 주문 상태에 따른 다음 액션 버튼들을 반환하는 함수
  const getActionButtons = (order: Order) => {
    const buttons = [];
    const currentStatus = order.status?.toLowerCase();
    const isCurrentOrderProcessing = processingOrderId === order.id;

    // 상세보기 버튼 (기존 로직 유지 또는 필요시 제거)
    if (handleViewOrderDetails) {
      buttons.push(
        <Button 
          key="view" 
          variant="outline" 
          size="icon" 
          onClick={() => handleViewOrderDetails(order.id)} 
          title="상세보기"
          disabled={isCurrentOrderProcessing} // 처리 중 비활성화
        >
          <Eye className="h-4 w-4" />
        </Button>
      );
    }

    // "결제완료" 상태일 때의 버튼
    if (currentStatus === 'paid') {
      buttons.push(
        <Button 
          key="serve" 
          variant="outline" 
          size="sm" 
          onClick={() => onUpdateOrderStatus(order.id, 'served')} 
          className="ml-2 bg-green-500 hover:bg-green-600 text-white"
          disabled={isCurrentOrderProcessing} // 처리 중 비활성화
        >
          <PackageCheck className="mr-2 h-4 w-4" /> 음료 제공
        </Button>
      );
      buttons.push(
        <Button 
          key="cancel-paid" 
          variant="destructive" 
          size="sm" 
          onClick={() => onUpdateOrderStatus(order.id, 'cancelled')} 
          className="ml-2 bg-red-500 hover:bg-red-600 text-white border-red-500 hover:border-red-600"
          disabled={isCurrentOrderProcessing} // 처리 중 비활성화
        >
          <X className="mr-2 h-4 w-4" /> 결제 취소
        </Button>
      );
    }
    // 다른 상태에 대한 버튼 로직 (예: 준비중, 픽업대기 등) - 현재 요청에서는 paid 상태에 집중
    // 필요에 따라 기존 로직을 참고하여 추가하거나, 현재는 단순화된 형태로 남겨둡니다.
    // 예시: "준비중"일 때 "픽업 준비 완료" 버튼
    /* else if (currentStatus === 'preparing') {
      buttons.push(
        <Button 
          key="ready" 
          variant="outline" 
          size="sm" 
          onClick={() => onUpdateOrderStatus(order.id, 'ready_for_pickup')} 
          className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-white"
          disabled={isCurrentOrderProcessing} // 처리 중 비활성화
        >
          <PackageCheck className="mr-2 h-4 w-4" /> 픽업 준비 완료
        </Button>
      );
    }*/
    
    // "제공완료" 또는 "취소됨" 상태가 아닐 때, 추가적인 상태 변경 옵션 (DropdownMenu)
    // 이 부분은 현재 요청의 핵심은 아니므로, 필요에 따라 유지하거나 제거/수정 가능
    if (currentStatus !== 'served' && currentStatus !== 'completed' && currentStatus !== 'cancelled') {
        const allStatuses = ['paid', 'preparing', 'ready_for_pickup', 'served', 'cancelled']; // 관리자가 변경 가능한 상태 목록
        const availableNextStatuses = allStatuses.filter(s => s !== currentStatus && s !== 'paid'); // paid는 초기 상태로 간주

        if (availableNextStatuses.length > 0 && buttons.length > 0) { // 이미 버튼이 있을 때만 더보기 메뉴 추가
             buttons.push(
                <DropdownMenu key="more-actions">
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-2" disabled={isCurrentOrderProcessing}>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>빠른 상태 변경</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {availableNextStatuses.map(statusOption => {
                            const { text: statusText } = getStatusTextAndVariant(statusOption);
                            return (
                                <DropdownMenuItem 
                                  key={statusOption} 
                                  onClick={() => onUpdateOrderStatus(order.id, statusOption)}
                                  disabled={isCurrentOrderProcessing} // 처리 중 비활성화
                                >
                                    {statusText}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        }
    }

    return buttons.length > 0 ? buttons : <span className="text-xs text-gray-500">-</span>; // 관리할 작업이 없으면 '-' 표시
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => requestSort('display_order_number')}>주문번호{getSortIndicator('display_order_number')}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('created_at')}>주문 시간{getSortIndicator('created_at')}</TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('total_amount')}>총액{getSortIndicator('total_amount')}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('status')}>상태{getSortIndicator('status')}</TableHead>
              <TableHead className="text-right min-w-[200px]">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentOrders.length > 0 ? (
              currentOrders.map(order => {
                const { text: statusText, variant: statusVariant } = getStatusTextAndVariant(order.status);
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.display_order_number}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{order.total_amount.toLocaleString()}원</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant as any}>{statusText}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {getActionButtons(order)}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  표시할 주문이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
          >
            이전
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
            <Button
              key={pageNumber}
              variant={currentPage === pageNumber ? "default" : "outline"}
              size="sm"
              onClick={() => paginate(pageNumber)}
            >
              {pageNumber}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </>
  );
}; 