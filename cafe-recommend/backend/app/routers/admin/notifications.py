from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import func, desc, and_
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
import json

from app.api.deps import get_db
from app.models.inventory import Ingredient, IngredientStock
from app.models.order import Order
from app.schemas.notifications import (
    StockAlertNotification,
    OrderSurgeNotification,
    NotificationResponse,
    NotificationStatus
)

router = APIRouter()

# 활성 WebSocket 연결을 저장하는 딕셔너리
active_connections: List[WebSocket] = []

# WebSocket 연결 관리
@router.websocket("/ws")
async def websocket_notifications(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # 클라이언트와의 연결 유지를 위한 ping
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

# 모든 활성 클라이언트에 알림 브로드캐스트
async def broadcast_notification(notification: Dict[str, Any]):
    for connection in active_connections:
        try:
            await connection.send_json(notification)
        except Exception:
            # 연결 오류가 있는 클라이언트 처리 (나중에 연결 정리)
            pass

# 재고 관련 알림 엔드포인트
@router.get("/stock-alerts", response_model=List[StockAlertNotification])
def get_stock_alerts(db: Session = Depends(get_db)):
    """재고 부족 알림을 조회합니다."""
    # 재고 부족 또는 소진된 재료 찾기
    alerts = []
    ingredients = db.query(Ingredient).filter(Ingredient.is_active == True).all()
    
    for ingredient in ingredients:
        stock = db.query(IngredientStock).filter(
            IngredientStock.ingredient_id == ingredient.id
        ).first()
        
        if not stock:
            # 재고 정보가 없는 경우
            alerts.append(
                StockAlertNotification(
                    id=ingredient.id,
                    ingredient_name=ingredient.name,
                    ingredient_id=ingredient.id,
                    current_quantity=0,
                    min_stock_level=ingredient.min_stock_level,
                    unit=ingredient.unit,
                    status="재고 없음",
                    created_at=datetime.utcnow(),
                    severity="high"
                )
            )
        elif stock.current_quantity <= 0:
            # 재고가 소진된 경우
            alerts.append(
                StockAlertNotification(
                    id=ingredient.id,
                    ingredient_name=ingredient.name,
                    ingredient_id=ingredient.id,
                    current_quantity=stock.current_quantity,
                    min_stock_level=ingredient.min_stock_level,
                    unit=ingredient.unit,
                    status="재고 없음",
                    created_at=datetime.utcnow(),
                    severity="high"
                )
            )
        elif stock.current_quantity < ingredient.min_stock_level:
            # 재고가 최소 재고 수준보다 낮은 경우
            alerts.append(
                StockAlertNotification(
                    id=ingredient.id,
                    ingredient_name=ingredient.name,
                    ingredient_id=ingredient.id,
                    current_quantity=stock.current_quantity,
                    min_stock_level=ingredient.min_stock_level,
                    unit=ingredient.unit,
                    status="재고 부족",
                    created_at=datetime.utcnow(),
                    severity="medium"
                )
            )
    
    return alerts

# 주문 급증 알림 엔드포인트는 /api/admin/alerts/order-surge로 이동됨

# 알림 상태 업데이트 엔드포인트
@router.post("/mark-as-read/{notification_id}", response_model=NotificationStatus)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    """특정 알림을 읽음 상태로 표시합니다."""
    # 실제 구현에서는 알림 데이터베이스 테이블에 저장하고 상태를 업데이트하는 코드 필요
    # 현재는 단순 응답 반환
    return NotificationStatus(
        notification_id=notification_id,
        is_read=True,
        updated_at=datetime.utcnow()
    )

# 모든 알림 조회 엔드포인트
@router.get("/all", response_model=NotificationResponse)
def get_all_notifications(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """모든 알림을 조회합니다."""
    # 재고 알림 가져오기
    stock_alerts = get_stock_alerts(db)
    
    # 주문 급증 알림은 /api/admin/alerts/order-surge에서 확인
    # alerts.py의 API를 직접 호출하는 대신 HTTP 요청을 사용하는 것이 이상적이지만,
    # 간단한 구현을 위해 여기서는 주문 급증 알림 없이 재고 알림만 표시
    
    # 알림 통합 및 페이징
    all_notifications = []
    if stock_alerts:
        all_notifications.extend(stock_alerts)
    
    # 생성 시간 기준으로 정렬
    all_notifications.sort(key=lambda x: x.created_at, reverse=True)
    
    # 페이징 적용
    total = len(all_notifications)
    paginated_notifications = all_notifications[skip:skip+limit]
    
    return NotificationResponse(
        items=paginated_notifications,
        total=total,
        unread_count=total  # 실제 구현에서는 읽지 않은 알림 수를 계산
    ) 