from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class StockAlertNotification(BaseModel):
    id: int
    ingredient_id: int
    ingredient_name: str
    current_quantity: float
    min_stock_level: float
    unit: str
    status: str
    created_at: datetime
    severity: str

class OrderSurgeNotification(BaseModel):
    id: int
    order_count: int
    time_window: int  # 분 단위
    threshold: int
    created_at: datetime
    severity: str

class NotificationStatus(BaseModel):
    notification_id: int
    is_read: bool
    updated_at: datetime

class NotificationResponse(BaseModel):
    items: List[Any]  # StockAlertNotification, OrderSurgeNotification 등을 포함할 수 있음
    total: int
    unread_count: int
