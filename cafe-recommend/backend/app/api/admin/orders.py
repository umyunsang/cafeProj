from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models.order import Order, OrderItem
from app.schemas.order import AdminOrderResponse, AdminOrderItemResponse, OrderItemStatusUpdate
from app.core.auth import get_current_admin
from app.models.user import User

router = APIRouter()

@router.get("/orders", response_model=List[AdminOrderResponse])
async def get_all_orders(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """모든 주문 목록을 조회합니다. (관리자 전용)"""
    try:
        # 모든 주문 조회 (최신 주문부터 정렬)
        orders = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.menu)
        ).order_by(Order.created_at.desc()).all()
        
        # 주문 목록을 AdminOrderResponse 형식으로 변환
        result = []
        for order in orders:
            # 주문 아이템 정보를 AdminOrderItemResponse 형식으로 변환
            order_items = [
                AdminOrderItemResponse(
                    id=item.id,
                    order_id=item.order_id,
                    menu_id=item.menu_id,
                    menu_name=item.menu.name if item.menu else "알 수 없음",
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    total_price=item.total_price,
                    status=item.status,
                    created_at=item.created_at,
                    updated_at=item.updated_at
                )
                for item in order.order_items
            ]
            
            # 주문 정보를 AdminOrderResponse 형식으로 변환
            result.append(AdminOrderResponse(
                id=order.id,
                order_number=str(order.id),
                user_id=order.user_id,
                total_amount=order.total_amount,
                status=order.status,
                payment_method=order.payment_method,
                payment_key=order.payment_key,
                session_id=order.session_id,
                delivery_address=order.delivery_address,
                delivery_request=order.delivery_request,
                phone_number=order.phone_number,
                created_at=order.created_at,
                updated_at=order.updated_at,
                items=order_items
            ))
        
        return result
    except Exception as e:
        print(f"주문 목록 조회 중 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"주문 목록을 조회하는 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/orders/{order_id}", response_model=AdminOrderResponse)
async def get_order_by_id(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """특정 주문의 상세 정보를 조회합니다. (관리자 전용)"""
    try:
        # 주문 조회
        order = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.menu)
        ).filter(Order.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="주문을 찾을 수 없습니다."
            )
        
        # 주문 아이템 정보를 AdminOrderItemResponse 형식으로 변환
        order_items = [
            AdminOrderItemResponse(
                id=item.id,
                order_id=item.order_id,
                menu_id=item.menu_id,
                menu_name=item.menu.name if item.menu else "알 수 없음",
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
                status=item.status,
                created_at=item.created_at,
                updated_at=item.updated_at
            )
            for item in order.order_items
        ]
        
        # 주문 정보를 AdminOrderResponse 형식으로 변환
        return AdminOrderResponse(
            id=order.id,
            order_number=str(order.id),
            user_id=order.user_id,
            total_amount=order.total_amount,
            status=order.status,
            payment_method=order.payment_method,
            payment_key=order.payment_key,
            session_id=order.session_id,
            delivery_address=order.delivery_address,
            delivery_request=order.delivery_request,
            phone_number=order.phone_number,
            created_at=order.created_at,
            updated_at=order.updated_at,
            items=order_items
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"주문 조회 중 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"주문을 조회하는 중 오류가 발생했습니다: {str(e)}"
        )

@router.put("/orders/{order_id}/items/{item_id}/status", response_model=AdminOrderResponse)
async def update_order_item_status(
    order_id: int,
    item_id: int,
    status_update: OrderItemStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """주문 항목의 상태를 업데이트합니다. (관리자 전용)"""
    try:
        # 주문 항목 조회
        order_item = db.query(OrderItem).filter(
            OrderItem.id == item_id,
            OrderItem.order_id == order_id
        ).first()
        
        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="주문 항목을 찾을 수 없습니다."
            )
        
        # 상태 업데이트
        order_item.status = status_update.status
        db.commit()
        
        # 업데이트된 주문 조회
        order = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.menu)
        ).filter(Order.id == order_id).first()
        
        # 주문 아이템 정보를 AdminOrderItemResponse 형식으로 변환
        order_items = [
            AdminOrderItemResponse(
                id=item.id,
                order_id=item.order_id,
                menu_id=item.menu_id,
                menu_name=item.menu.name if item.menu else "알 수 없음",
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
                status=item.status,
                created_at=item.created_at,
                updated_at=item.updated_at
            )
            for item in order.order_items
        ]
        
        # 주문 정보를 AdminOrderResponse 형식으로 변환
        return AdminOrderResponse(
            id=order.id,
            order_number=str(order.id),
            user_id=order.user_id,
            total_amount=order.total_amount,
            status=order.status,
            payment_method=order.payment_method,
            payment_key=order.payment_key,
            session_id=order.session_id,
            delivery_address=order.delivery_address,
            delivery_request=order.delivery_request,
            phone_number=order.phone_number,
            created_at=order.created_at,
            updated_at=order.updated_at,
            items=order_items
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"주문 항목 상태 업데이트 중 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"주문 항목 상태를 업데이트하는 중 오류가 발생했습니다: {str(e)}"
        ) 