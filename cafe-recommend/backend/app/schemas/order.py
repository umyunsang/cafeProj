from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class OrderItemBase(BaseModel):
    menu_id: int
    quantity: int


class OrderItemCreate(OrderItemBase):
    unit_price: Optional[float] = None


class OrderItemUpdate(OrderItemBase):
    menu_id: Optional[int] = None
    quantity: Optional[int] = None
    status: Optional[str] = None


class OrderItemInDB(OrderItemBase):
    id: int
    order_id: int
    unit_price: float
    total_price: float
    status: str = "pending"
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class OrderItem(OrderItemInDB):
    menu_name: Optional[str] = None


class OrderBase(BaseModel):
    payment_method: Optional[str] = None
    session_id: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_request: Optional[str] = None
    phone_number: Optional[str] = None
    total_amount: Optional[float] = None


class OrderCreate(OrderBase):
    items: List[OrderItemCreate]
    user_id: Optional[int] = None


class OrderUpdate(OrderBase):
    status: Optional[str] = None
    payment_key: Optional[str] = None
    is_refunded: Optional[bool] = None
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None
    refund_id: Optional[str] = None
    refunded_at: Optional[datetime] = None


class OrderInDB(OrderBase):
    id: int
    order_number: Optional[str] = None
    user_id: Optional[int] = None
    total_amount: float
    status: str = "pending"
    payment_key: Optional[str] = None
    items: Optional[str] = None  # JSON 문자열
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_refunded: bool = False
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None
    refund_id: Optional[str] = None
    refunded_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class Order(OrderInDB):
    pass


class OrderWithItems(Order):
    order_items: List[OrderItem] = []


# 관리자 API용 응답 모델
class AdminOrderItemResponse(BaseModel):
    id: int
    menu_id: int
    menu_name: str
    quantity: int
    unit_price: float
    total_price: float
    status: str
    created_at: datetime

    class Config:
        orm_mode = True


class AdminOrderResponse(BaseModel):
    id: int
    order_number: str
    user_id: Optional[int] = None
    total_amount: float
    status: str
    payment_method: Optional[str] = None
    created_at: datetime
    items: List[AdminOrderItemResponse]

    class Config:
        orm_mode = True


class OrderItemStatusUpdate(BaseModel):
    status: str


class OrderStatusUpdate(BaseModel):
    status: str 