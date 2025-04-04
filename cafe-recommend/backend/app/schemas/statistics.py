from typing import List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class FavoriteMenu(BaseModel):
    id: int
    name: str
    count: int

class MenuStatistics(BaseModel):
    menu_id: int
    menu_name: str
    total_orders: int
    total_quantity: int
    total_revenue: float
    average_rating: float = 0.0

class UserStatistics(BaseModel):
    total_orders: int
    total_spent: float
    favorite_categories: Dict[str, int]
    favorite_menus: List[FavoriteMenu]
    order_history_by_month: Dict[str, int]

class TimeBasedStatistics(BaseModel):
    hourly_orders: Dict[str, int]  # "HH:00" format
    daily_orders: Dict[str, int]   # "YYYY-MM-DD" format
    monthly_orders: Dict[str, int] # "YYYY-MM" format
    peak_hours: List[str]
    average_orders_per_day: float

class OrderAnalytics(BaseModel):
    popular_menus: List[MenuStatistics]
    user_statistics: UserStatistics
    time_based_statistics: TimeBasedStatistics
    total_revenue: float
    total_orders: int
    average_order_value: float 