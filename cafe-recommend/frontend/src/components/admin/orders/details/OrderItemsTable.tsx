'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListOrdered } from "lucide-react";
import { OrderItem } from "@/components/admin/orders/OrderTable"; // OrderItem 타입 경로 확인

interface OrderItemsTableProps {
  items: OrderItem[];
  totalAmount: number; // 전체 주문의 총액 (상품 총액과 일치할 수도, 배송비 등 포함 가능성)
  // 아이템 총 수량은 내부에서 계산하거나 props로 받을 수 있음
}

export const OrderItemsTable = ({ items, totalAmount }: OrderItemsTableProps) => {
  if (!items) return null;

  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  // 주문 항목들의 순수 합계 (totalAmount와 다를 수 있음, 예를 들어 totalAmount가 할인/배송비 포함 시)
  // 여기서는 items에 있는 price와 quantity 기준으로 계산
  const itemsSubtotal = items.reduce((acc, item) => acc + (item.menu?.price || 0) * item.quantity, 0);


  return (
    <Card>
      <CardHeader className="border-b mb-4">
        <CardTitle className="text-xl font-semibold">
          <ListOrdered className="mr-2 h-5 w-5 inline-block text-primary" />
          주문 항목
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>메뉴</TableHead>
                  <TableHead className="text-right">단가</TableHead>
                  <TableHead className="text-center">수량</TableHead>
                  <TableHead className="text-right">합계</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id || index}> {/* API 응답에 item.id가 없다면 index 사용 */}
                    <TableCell className="font-medium">{item.menu?.name || '삭제된 메뉴'}</TableCell>
                    <TableCell className="text-right">{(item.menu?.price || 0).toLocaleString()}원</TableCell>
                    <TableCell className="text-center">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{((item.menu?.price || 0) * item.quantity).toLocaleString()}원</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-right mt-6 pr-2 space-y-1">
              <p className="text-md"><span className="text-muted-foreground">총 주문 수량:</span> {totalQuantity.toLocaleString()}개</p>
              {/* itemsSubtotal과 totalAmount가 다를 경우 둘 다 표시하거나, 의미에 맞게 선택 */}
              {/* 여기서는 totalAmount를 최종 결제 금액으로 간주하고, itemsSubtotal을 상품 총액으로 표시 */}
              <p className="text-md"><span className="text-muted-foreground">상품 총액 (항목 합계):</span> {itemsSubtotal.toLocaleString()}원</p>
              {itemsSubtotal !== totalAmount && (
                <p className="text-lg font-semibold"><span className="text-muted-foreground">최종 결제 금액:</span> {totalAmount.toLocaleString()}원</p>
              )}
              {itemsSubtotal === totalAmount && (
                 <p className="text-lg font-semibold"><span className="text-muted-foreground">총 상품 금액:</span> {totalAmount.toLocaleString()}원</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-4">주문 항목이 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}; 