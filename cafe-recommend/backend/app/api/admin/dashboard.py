from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app.models.order import Order
from app.models.menu import Menu
from app.api.admin.auth import oauth2_scheme
import json

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_data(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        # 최근 7일간의 일일 매출 데이터
        daily_sales = db.query(
            func.date(Order.created_at).label('date'),
            func.sum(Order.total_amount).label('amount')
        ).filter(
            Order.created_at >= datetime.now() - timedelta(days=7),
            Order.status != 'cancelled'  # 취소된 주문 제외
        ).group_by(
            func.date(Order.created_at)
        ).all()

        # 최근 10개의 주문
        recent_orders = db.query(Order).order_by(
            Order.created_at.desc()
        ).limit(10).all()

        # 인기 메뉴 (주문 횟수 기준)
        popular_items = db.query(
            Menu.name,
            Menu.order_count.label('count')
        ).order_by(
            Menu.order_count.desc()
        ).limit(5).all()

        return {
            "dailySales": [
                {
                    "date": sale.date.strftime("%Y-%m-%d") if sale.date else None,
                    "amount": float(sale.amount) if sale.amount else 0
                }
                for sale in daily_sales
            ],
            "recentOrders": [
                {
                    "id": order.id,
                    "items": json.loads(order.items) if isinstance(order.items, str) else order.items,
                    "total": float(order.total_amount) if order.total_amount else 0,
                    "status": order.status,
                    "date": order.created_at.strftime("%Y-%m-%d %H:%M") if order.created_at else None
                }
                for order in recent_orders
            ],
            "popularItems": [
                {
                    "name": item.name,
                    "count": int(item.count) if item.count else 0
                }
                for item in popular_items
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 