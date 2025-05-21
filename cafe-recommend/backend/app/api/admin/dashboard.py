from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, cast, Float
from datetime import datetime, timedelta
from typing import Optional, List
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.menu import Menu
from app.api.deps import get_current_active_admin, get_db
from app.models.admin import Admin
import json

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_data(
    current_admin: Admin = Depends(get_current_active_admin),
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

        # 전년 동일 기간 매출 데이터 추가
        last_year_start = datetime.now() - timedelta(days=365+7)
        last_year_end = datetime.now() - timedelta(days=365)
        
        last_year_sales = db.query(
            func.date(Order.created_at).label('date'),
            func.sum(Order.total_amount).label('amount')
        ).filter(
            Order.created_at >= last_year_start,
            Order.created_at <= last_year_end,
            Order.status != 'cancelled'
        ).group_by(
            func.date(Order.created_at)
        ).all()
        
        # 올해/작년 날짜 매핑 (월-일 기준)
        last_year_data = {}
        for sale in last_year_sales:
            # 월-일 형식으로 변환하여 키로 사용
            month_day = sale.date.strftime("%m-%d")
            last_year_data[month_day] = float(sale.amount) if sale.amount else 0

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

        # 오늘의 실시간 매출 합계
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        today_sales = db.query(
            func.sum(Order.total_amount).label('total')
        ).filter(
            Order.created_at >= today_start,
            Order.created_at <= today_end,
            Order.status != 'cancelled'
        ).scalar() or 0
        
        # 어제 총 매출
        yesterday = today - timedelta(days=1)
        yesterday_start = datetime.combine(yesterday, datetime.min.time())
        yesterday_end = datetime.combine(yesterday, datetime.max.time())
        
        yesterday_sales = db.query(
            func.sum(Order.total_amount).label('total')
        ).filter(
            Order.created_at >= yesterday_start,
            Order.created_at <= yesterday_end,
            Order.status != 'cancelled'
        ).scalar() or 0

        return {
            "dailySales": [
                {
                    "date": sale.date.strftime("%Y-%m-%d") if sale.date else None,
                    "amount": float(sale.amount) if sale.amount else 0,
                    "lastYearAmount": last_year_data.get(sale.date.strftime("%m-%d"), 0) if sale.date else 0,
                    "growthRate": calculate_growth_rate(
                        float(sale.amount) if sale.amount else 0,
                        last_year_data.get(sale.date.strftime("%m-%d"), 0) if sale.date else 0
                    )
                }
                for sale in daily_sales
            ],
            "recentOrders": [
                (lambda o: {
                    "id": o.id,
                    "items": (
                        lambda items_str: json.loads(items_str) if items_str else []
                        if isinstance(items_str, str) 
                        else items_str # 이미 객체/리스트인 경우
                    )(o.items) 
                    if isinstance(o.items, str) 
                       and o.items.strip().startswith(("{", "[")) 
                       and o.items.strip().endswith(("}", "]"))
                    else (
                        [] # 문자열이 아니거나, 유효한 JSON 형태가 아닌 경우 기본값
                    ),
                    "total": float(o.total_amount) if o.total_amount else 0,
                    "status": o.status,
                    "date": o.created_at.strftime("%Y-%m-%d %H:%M") if o.created_at else None
                })(order)
                for order in recent_orders
            ],
            "popularItems": [
                {
                    "name": item.name,
                    "count": int(item.count) if item.count else 0
                }
                for item in popular_items
            ],
            "todaySummary": {
                "totalSales": float(today_sales),
                "yesterdaySales": float(yesterday_sales),
                "growthRate": calculate_growth_rate(float(today_sales), float(yesterday_sales))
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def calculate_growth_rate(current: float, previous: float) -> float:
    """전년 대비 성장률 계산"""
    if previous == 0:
        return 0
    return round(((current - previous) / previous) * 100, 2)

@router.get("/order-analytics")
async def get_order_analytics(
    start_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    current_admin: Admin = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    주문 통계 및 분석 데이터를 제공합니다.
    - 메뉴별 판매량 
    - 시간대별 주문량
    - 결제 방법별 매출
    - 기간별 주문 완료율
    - 취소율
    """
    try:
        # 날짜 범위 필터 설정
        date_filter = []
        if start_date:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            date_filter.append(Order.created_at >= start)
        if end_date:
            end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            date_filter.append(Order.created_at < end)
        
        # 메뉴별 판매량 분석
        menu_sales = db.query(
            Menu.id, 
            Menu.name,
            Menu.category,
            func.sum(OrderItem.quantity).label('quantity'),
            func.sum(OrderItem.total_price).label('total_sales')
        ).join(
            OrderItem, OrderItem.menu_id == Menu.id
        ).join(
            Order, Order.id == OrderItem.order_id
        ).filter(
            Order.status != 'cancelled',
            *date_filter
        ).group_by(
            Menu.id
        ).order_by(
            func.sum(OrderItem.quantity).desc()
        ).all()
        
        # 시간대별 주문량 분석
        hourly_orders = db.query(
            extract('hour', Order.created_at).label('hour'),
            func.count(Order.id).label('order_count'),
            func.sum(Order.total_amount).label('total_amount')
        ).filter(
            Order.status != 'cancelled',
            *date_filter
        ).group_by(
            extract('hour', Order.created_at)
        ).order_by(
            extract('hour', Order.created_at)
        ).all()
        
        # 결제 방법별 매출 분석
        payment_method_sales = db.query(
            Order.payment_method,
            func.count(Order.id).label('order_count'),
            func.sum(Order.total_amount).label('total_amount')
        ).filter(
            Order.status != 'cancelled',
            *date_filter
        ).group_by(
            Order.payment_method
        ).order_by(
            func.sum(Order.total_amount).desc()
        ).all()
        
        # 주문 상태별 분석 (완료율, 취소율 등)
        order_status = db.query(
            Order.status,
            func.count(Order.id).label('count')
        ).filter(
            *date_filter
        ).group_by(
            Order.status
        ).all()
        
        # 전체 주문 수
        total_orders = db.query(func.count(Order.id)).filter(*date_filter).scalar() or 0
        
        # 완료율, 취소율 계산
        completion_rate = 0
        cancellation_rate = 0
        status_counts = {status.status: status.count for status in order_status}
        
        if total_orders > 0:
            completion_rate = (status_counts.get('completed', 0) / total_orders) * 100
            cancellation_rate = (status_counts.get('cancelled', 0) / total_orders) * 100
        
        # 카테고리별 매출 분석
        category_sales = db.query(
            Menu.category,
            func.sum(OrderItem.total_price).label('total_sales'),
            func.count(OrderItem.id.distinct()).label('item_count')
        ).join(
            OrderItem, OrderItem.menu_id == Menu.id
        ).join(
            Order, Order.id == OrderItem.order_id
        ).filter(
            Order.status != 'cancelled',
            *date_filter
        ).group_by(
            Menu.category
        ).order_by(
            func.sum(OrderItem.total_price).desc()
        ).all()
        
        # 일별 매출 동향
        daily_trend = db.query(
            func.date(Order.created_at).label('date'),
            func.count(Order.id).label('order_count'),
            func.sum(Order.total_amount).label('total_amount')
        ).filter(
            Order.status != 'cancelled',
            *date_filter
        ).group_by(
            func.date(Order.created_at)
        ).order_by(
            func.date(Order.created_at)
        ).all()
        
        return {
            "menu_sales": [
                {
                    "id": item.id,
                    "name": item.name,
                    "category": item.category,
                    "quantity": int(item.quantity) if item.quantity else 0,
                    "total_sales": float(item.total_sales) if item.total_sales else 0
                }
                for item in menu_sales
            ],
            "hourly_orders": [
                {
                    "hour": int(item.hour) if item.hour is not None else 0,
                    "order_count": int(item.order_count) if item.order_count else 0,
                    "total_amount": float(item.total_amount) if item.total_amount else 0
                }
                for item in hourly_orders
            ],
            "payment_method_sales": [
                {
                    "method": item.payment_method or "알수없음",
                    "order_count": int(item.order_count) if item.order_count else 0,
                    "total_amount": float(item.total_amount) if item.total_amount else 0
                }
                for item in payment_method_sales
            ],
            "order_status": [
                {
                    "status": item.status or "알수없음",
                    "count": int(item.count) if item.count else 0,
                    "percentage": (int(item.count) / total_orders * 100) if total_orders > 0 else 0
                }
                for item in order_status
            ],
            "completion_rate": completion_rate,
            "cancellation_rate": cancellation_rate,
            "category_sales": [
                {
                    "category": item.category or "미분류",
                    "total_sales": float(item.total_sales) if item.total_sales else 0,
                    "item_count": int(item.item_count) if item.item_count else 0
                }
                for item in category_sales
            ],
            "daily_trend": [
                {
                    "date": item.date.strftime("%Y-%m-%d") if item.date else None,
                    "order_count": int(item.order_count) if item.order_count else 0,
                    "total_amount": float(item.total_amount) if item.total_amount else 0
                }
                for item in daily_trend
            ],
            "summary": {
                "total_orders": total_orders,
                "total_sales": sum(float(item.total_amount) for item in daily_trend if item.total_amount) if daily_trend else 0,
                "avg_order_value": sum(float(item.total_amount) for item in daily_trend if item.total_amount) / total_orders if total_orders > 0 else 0,
                "period": {
                    "start": start_date or "전체 기간",
                    "end": end_date or "현재"
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 