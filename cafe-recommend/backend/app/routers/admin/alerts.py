from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, desc, and_
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

from app.api.deps import get_db
from app.models.order import Order
from app.schemas.notifications import OrderSurgeNotification

router = APIRouter()

@router.get("/order-surge", response_model=OrderSurgeNotification)
def get_order_surge(
    time_window_minutes: int = 30,
    surge_threshold: int = 10,
    db: Session = Depends(get_db)
):
    """지정된 시간 내에 주문량 급증을 감지합니다."""
    # 현재 시간 기준으로 지정된 시간 창 내의 주문 수 계산
    time_threshold = datetime.utcnow() - timedelta(minutes=time_window_minutes)
    
    # 최근 주문 수 계산
    recent_order_count = db.query(func.count(Order.id)).filter(
        Order.created_at >= time_threshold
    ).scalar() or 0
    
    # 이전 기간 (동일한 길이)의 주문 수 계산
    previous_time_threshold = time_threshold - timedelta(minutes=time_window_minutes)
    previous_order_count = db.query(func.count(Order.id)).filter(
        and_(
            Order.created_at >= previous_time_threshold,
            Order.created_at < time_threshold
        )
    ).scalar() or 0
    
    # 주문 급증 여부 확인
    is_surge = recent_order_count >= surge_threshold and recent_order_count > previous_order_count * 1.5
    
    return OrderSurgeNotification(
        id=1,  # ID는 API에서만 사용되는 값
        is_surge=is_surge,
        recent_order_count=recent_order_count,
        previous_order_count=previous_order_count,
        time_window_minutes=time_window_minutes,
        created_at=datetime.utcnow(),
        severity="high" if is_surge else "low"
    )

@router.get("/hourly-order-trends")
def get_hourly_order_trends(
    days_back: int = 7,
    db: Session = Depends(get_db)
):
    """시간대별 주문 추세를 분석합니다."""
    # 지정된 일수만큼 이전 날짜부터 현재까지의 데이터 분석
    start_date = datetime.utcnow() - timedelta(days=days_back)
    
    # 시간대별 주문 데이터 집계 (0-23시간)
    hourly_data = []
    
    for hour in range(24):
        # 특정 시간에 대한 주문 수 쿼리
        order_count = db.query(func.count(Order.id)).filter(
            and_(
                Order.created_at >= start_date,
                func.extract('hour', Order.created_at) == hour
            )
        ).scalar() or 0
        
        hourly_data.append({
            "hour": hour,
            "count": order_count
        })
    
    # 피크 시간대 찾기 (주문량이 가장 많은 시간)
    peak_hour = max(hourly_data, key=lambda x: x["count"])
    
    # 저조한 시간대 찾기 (주문량이 가장 적은 시간)
    slow_hour = min(hourly_data, key=lambda x: x["count"])
    
    return {
        "hourly_trends": hourly_data,
        "peak_hour": peak_hour,
        "slow_hour": slow_hour,
        "days_analyzed": days_back
    }

@router.get("/unusual-order-patterns")
def detect_unusual_patterns(
    std_dev_threshold: float = 2.0,  # 표준편차 기준값
    db: Session = Depends(get_db)
):
    """비정상적인 주문 패턴을 탐지합니다."""
    # 지난 30일 동안의 일별 주문 데이터 수집
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    daily_orders = []
    current_date = start_date
    
    while current_date <= end_date:
        next_date = current_date + timedelta(days=1)
        
        # 해당 날짜의 주문 수 계산
        order_count = db.query(func.count(Order.id)).filter(
            and_(
                Order.created_at >= current_date,
                Order.created_at < next_date
            )
        ).scalar() or 0
        
        daily_orders.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "count": order_count
        })
        
        current_date = next_date
    
    # 주문 수에 대한 평균 및 표준편차 계산
    counts = [day["count"] for day in daily_orders]
    
    if not counts:
        return {"message": "분석할 주문 데이터가 없습니다."}
    
    avg_orders = sum(counts) / len(counts)
    
    # 표준편차 계산
    variance = sum((x - avg_orders) ** 2 for x in counts) / len(counts)
    std_dev = variance ** 0.5
    
    # 비정상적인 패턴 탐지 (표준편차의 N배 이상 차이나는 날)
    unusual_days = []
    
    for day in daily_orders:
        if abs(day["count"] - avg_orders) > std_dev_threshold * std_dev:
            unusual_days.append({
                "date": day["date"],
                "count": day["count"],
                "difference_from_avg": day["count"] - avg_orders,
                "std_deviations": abs(day["count"] - avg_orders) / std_dev if std_dev > 0 else 0
            })
    
    return {
        "unusual_days": unusual_days,
        "average_daily_orders": avg_orders,
        "std_deviation": std_dev,
        "threshold_used": std_dev_threshold
    } 