from fastapi import APIRouter, Depends, HTTPException, Cookie, Header
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ..database import get_db
from ..models.order import Order, OrderItem
from ..schemas.payment import OrderResponse
import logging

router = APIRouter()

@router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """
    사용자의 주문 내역을 조회합니다.
    세션 ID를 기반으로 주문을 조회합니다.
    """
    effective_session_id = x_session_id or session_id
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="세션 ID가 필요합니다.")
    
    try:
        # 세션 ID로 주문 조회 (최신 주문부터 정렬)
        orders = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.menu)
        ).filter(Order.session_id == effective_session_id).order_by(Order.created_at.desc()).all()
        
        # 주문 아이템 정보를 OrderItemResponse 스키마에 맞게 변환
        result = []
        for order in orders:
            order_items_response = [
                {
                    "id": item.id,
                    "menu_id": item.menu_id,
                    "menu_name": item.menu.name if item.menu else "알 수 없음",
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price
                } 
                for item in order.order_items
            ]
            
            result.append(OrderResponse(
                id=order.id,
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
                items=order_items_response
            ))
        
        return result
    except Exception as e:
        logging.error(f"주문 내역 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="주문 내역을 조회하는 중 오류가 발생했습니다.")

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """
    특정 주문의 상세 정보를 조회합니다.
    세션 ID를 기반으로 주문 소유권을 확인합니다.
    """
    effective_session_id = x_session_id or session_id
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="세션 ID가 필요합니다.")
    
    try:
        # 주문 조회
        order = db.query(Order).options(
            joinedload(Order.order_items).joinedload(OrderItem.menu)
        ).filter(Order.id == order_id).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")
        
        # 세션 ID 검증 (해당 주문이 현재 세션 사용자의 주문인지 확인)
        if order.session_id != effective_session_id:
            raise HTTPException(status_code=403, detail="해당 주문에 대한 접근 권한이 없습니다.")
        
        # 주문 아이템 정보를 OrderItemResponse 스키마에 맞게 변환
        order_items_response = [
            {
                "id": item.id,
                "menu_id": item.menu_id,
                "menu_name": item.menu.name if item.menu else "알 수 없음",
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total_price": item.total_price
            } 
            for item in order.order_items
        ]
        
        return OrderResponse(
            id=order.id,
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
            items=order_items_response
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"주문 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="주문을 조회하는 중 오류가 발생했습니다.") 