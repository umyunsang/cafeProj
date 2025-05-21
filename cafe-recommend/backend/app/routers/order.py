from fastapi import APIRouter, HTTPException, Depends, Query, Cookie, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.schemas.order import Order, OrderWithItems
from app.crud import order as order_crud

router = APIRouter()

@router.get("/orders", response_model=List[Order])
async def get_orders(
    skip: int = 0,
    limit: int = 10,
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """사용자 주문 목록 조회"""
    effective_session_id = x_session_id or session_id
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="세션 ID가 필요합니다.")
    
    # 세션 ID로 주문 조회
    orders, _ = order_crud.get_by_session(db, session_id=effective_session_id, skip=skip, limit=limit)
    return orders

@router.get("/orders/{order_id}", response_model=OrderWithItems)
async def get_order_details(
    order_id: int,
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """주문 상세 정보 조회"""
    effective_session_id = x_session_id or session_id
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="세션 ID가 필요합니다.")
    
    # 주문 상세 정보 조회
    order = order_crud.get_order_with_items(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")
    
    # 세션 기반 액세스 제어
    if order.session_id != effective_session_id:
        raise HTTPException(status_code=403, detail="이 주문에 접근할 권한이 없습니다.")
    
    return order

@router.get("/orders/status/{status}", response_model=List[Order])
async def get_orders_by_status(
    status: str,
    skip: int = 0,
    limit: int = 10,
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """상태별 주문 목록 조회"""
    effective_session_id = x_session_id or session_id
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="세션 ID가 필요합니다.")
    
    # 세션 ID + 상태로 주문 조회 (해당 구현 추가 필요)
    orders = []
    for order in db.query(Order).filter(
        Order.session_id == effective_session_id,
        Order.status == status
    ).order_by(Order.created_at.desc()).offset(skip).limit(limit):
        orders.append(order)
    
    return orders 