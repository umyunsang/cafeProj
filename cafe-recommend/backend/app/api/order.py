from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.order import Order, OrderItem
from app.schemas.order import OrderCreate, OrderResponse, OrderUpdate
from app.crud.order import CRUDOrder, create_order, get_order_by_number
from app.core.auth import get_current_user
from app.models.user import User
from datetime import datetime
import uuid

router = APIRouter()
crud_order = CRUDOrder(Order)

def generate_order_number() -> str:
    """주문번호 생성 함수"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    unique_id = str(uuid.uuid4().int)[:6]
    return f"ORD-{timestamp}-{unique_id}"

@router.post("/orders", response_model=OrderResponse)
async def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """새로운 주문을 생성합니다."""
    try:
        order_number = generate_order_number()
        order = create_order(db, order_in, order_number)
        return order
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/orders", response_model=List[OrderResponse])
async def get_user_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """사용자의 주문 목록을 조회합니다."""
    orders = crud_order.get_by_user(db=db, user_id=current_user.id)
    return orders

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """주문 상세 정보를 조회합니다."""
    order = crud_order.get(db=db, id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this order")
    return order

@router.put("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    order_update: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """주문 상태를 업데이트합니다."""
    order = crud_order.get(db=db, id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this order")
    
    updated_order = crud_order.update_status(db=db, order_id=order_id, status=order_update.status)
    return updated_order

@router.post("/orders/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """주문을 취소합니다."""
    order = crud_order.get(db=db, id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this order")
    if order.status not in ["pending", "confirmed"]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled in current status")
    
    updated_order = crud_order.update_status(db=db, order_id=order_id, status="cancelled")
    return updated_order

@router.get("/admin/orders/{order_number}", response_model=OrderResponse)
async def get_order(
    order_number: str,
    db: Session = Depends(get_db)
):
    """주문번호로 주문 조회"""
    order = get_order_by_number(db, order_number)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="주문을 찾을 수 없습니다."
        )
    return order 