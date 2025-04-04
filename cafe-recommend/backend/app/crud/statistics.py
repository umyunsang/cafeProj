from typing import List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem
from app.models.menu import Menu
from app.models.user import User
from app.schemas.statistics import (
    MenuStatistics,
    UserStatistics,
    TimeBasedStatistics,
    OrderAnalytics,
    FavoriteMenu
)

class Statistics:
    @staticmethod
    def get_menu_statistics(db: Session, limit: int = 10) -> List[MenuStatistics]:
        """인기 메뉴 통계 조회"""
        stats = (
            db.query(
                Menu.id.label("menu_id"),
                Menu.name.label("menu_name"),
                func.count(OrderItem.id).label("total_orders"),
                func.sum(OrderItem.quantity).label("total_quantity"),
                func.sum(OrderItem.total_price).label("total_revenue"),
            )
            .join(OrderItem)
            .group_by(Menu.id)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(limit)
            .all()
        )
        
        return [
            MenuStatistics(
                menu_id=stat.menu_id,
                menu_name=stat.menu_name,
                total_orders=stat.total_orders,
                total_quantity=stat.total_quantity or 0,
                total_revenue=stat.total_revenue or 0,
                average_rating=0.0  # 향후 리뷰 시스템 추가 시 구현
            )
            for stat in stats
        ]

    @staticmethod
    def get_user_statistics(db: Session, user_id: int) -> UserStatistics:
        """사용자별 주문 통계 조회"""
        # 전체 주문 수와 총 지출액
        total_stats = (
            db.query(
                func.count(Order.id).label("total_orders"),
                func.sum(Order.total_amount).label("total_spent")
            )
            .filter(Order.user_id == user_id)
            .first()
        )

        # 선호 카테고리
        favorite_categories = (
            db.query(
                Menu.category,
                func.count(OrderItem.id).label("count")
            )
            .join(OrderItem)
            .join(Order)
            .filter(Order.user_id == user_id)
            .group_by(Menu.category)
            .all()
        )

        # 자주 주문하는 메뉴
        favorite_menus = (
            db.query(
                Menu.id,
                Menu.name,
                func.count(OrderItem.id).label("order_count")
            )
            .join(OrderItem)
            .join(Order)
            .filter(Order.user_id == user_id)
            .group_by(Menu.id)
            .order_by(func.count(OrderItem.id).desc())
            .limit(5)
            .all()
        )

        # 월별 주문 이력
        monthly_orders = (
            db.query(
                func.strftime("%Y-%m", Order.created_at).label("month"),
                func.count(Order.id).label("count")
            )
            .filter(Order.user_id == user_id)
            .group_by(func.strftime("%Y-%m", Order.created_at))
            .all()
        )

        return UserStatistics(
            total_orders=total_stats.total_orders or 0,
            total_spent=total_stats.total_spent or 0,
            favorite_categories={cat: count for cat, count in favorite_categories},
            favorite_menus=[
                FavoriteMenu(id=menu.id, name=menu.name, count=menu.order_count)
                for menu in favorite_menus
            ],
            order_history_by_month={
                month: count for month, count in monthly_orders
            }
        )

    @staticmethod
    def get_time_based_statistics(db: Session, days: int = 30) -> TimeBasedStatistics:
        """시간대별 주문 통계 조회"""
        start_date = datetime.utcnow() - timedelta(days=days)

        # 시간대별 주문 수
        hourly_stats = (
            db.query(
                func.strftime("%H:00", Order.created_at).label("hour"),
                func.count(Order.id).label("count")
            )
            .filter(Order.created_at >= start_date)
            .group_by(func.strftime("%H:00", Order.created_at))
            .all()
        )

        # 일별 주문 수
        daily_stats = (
            db.query(
                func.strftime("%Y-%m-%d", Order.created_at).label("date"),
                func.count(Order.id).label("count")
            )
            .filter(Order.created_at >= start_date)
            .group_by(func.strftime("%Y-%m-%d", Order.created_at))
            .all()
        )

        # 월별 주문 수
        monthly_stats = (
            db.query(
                func.strftime("%Y-%m", Order.created_at).label("month"),
                func.count(Order.id).label("count")
            )
            .filter(Order.created_at >= start_date)
            .group_by(func.strftime("%Y-%m", Order.created_at))
            .all()
        )

        # 피크 시간대 계산
        hourly_orders = {hour: count for hour, count in hourly_stats}
        peak_hours = sorted(
            hourly_orders.items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]

        # 일평균 주문 수 계산
        daily_orders = {date: count for date, count in daily_stats}
        avg_orders = sum(daily_orders.values()) / len(daily_orders) if daily_orders else 0

        return TimeBasedStatistics(
            hourly_orders=hourly_orders,
            daily_orders={date: count for date, count in daily_stats},
            monthly_orders={month: count for month, count in monthly_stats},
            peak_hours=[hour for hour, _ in peak_hours],
            average_orders_per_day=avg_orders
        )

    @staticmethod
    def get_overall_analytics(db: Session) -> OrderAnalytics:
        """전체 주문 분석 데이터 조회"""
        # 전체 매출액과 주문 수
        overall_stats = (
            db.query(
                func.sum(Order.total_amount).label("total_revenue"),
                func.count(Order.id).label("total_orders")
            )
            .first()
        )

        return OrderAnalytics(
            popular_menus=Statistics.get_menu_statistics(db),
            user_statistics=Statistics.get_user_statistics(db, 1),  # 예시 사용자
            time_based_statistics=Statistics.get_time_based_statistics(db),
            total_revenue=overall_stats.total_revenue or 0,
            total_orders=overall_stats.total_orders or 0,
            average_order_value=(
                overall_stats.total_revenue / overall_stats.total_orders
                if overall_stats.total_orders
                else 0
            )
        )

statistics = Statistics() 