from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from .menu import Menu

class OrderItemBase(BaseModel):
    menu_id: int
    quantity: int = Field(gt=0)
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    menu_name: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    order_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    status: Optional[str] = "pending"  # pending, completed

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    user_id: Optional[int] = None
    status: str = "pending"  # pending, confirmed, completed, cancelled
    total_amount: float = 0.0

class OrderCreate(OrderBase):
    items: List[OrderItemCreate]

class OrderUpdate(BaseModel):
    status: str

class OrderResponse(OrderBase):
    id: int
    order_number: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[Dict[str, Any]]
    payment_method: Optional[str] = None
    payment_key: Optional[str] = None
    session_id: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_request: Optional[str] = None
    phone_number: Optional[str] = None

    class Config:
        from_attributes = True

# 관리자용 주문 스키마
class OrderItemStatusUpdate(BaseModel):
    status: str

class AdminOrderItemResponse(BaseModel):
    id: int
    order_id: int
    menu_id: int
    menu_name: str
    quantity: int
    unit_price: float
    total_price: float
    status: Optional[str] = "pending"  # pending, completed
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AdminOrderResponse(BaseModel):
    id: int
    order_number: str
    user_id: Optional[int] = None
    total_amount: float
    status: str
    payment_method: Optional[str] = None
    payment_key: Optional[str] = None
    session_id: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_request: Optional[str] = None
    phone_number: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[AdminOrderItemResponse]

    class Config:
        from_attributes = True

# 장바구니 스키마
class CartItemBase(BaseModel):
    menu_id: int
    quantity: int

class CartItemCreate(CartItemBase):
    pass

class CartItem(CartItemBase):
    unit_price: float
    total_price: float
    menu_name: str

    class Config:
        from_attributes = True

class Cart(BaseModel):
    items: List[CartItem]
    total_amount: float

    class Config:
        from_attributes = True 