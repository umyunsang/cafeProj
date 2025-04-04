from typing import List, Optional
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
    updated_at: datetime

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    user_id: int
    status: str = "pending"  # pending, confirmed, completed, cancelled
    total_amount: float

class OrderCreate(BaseModel):
    items: List[OrderItemBase]
    payment_method: Optional[str] = None

class OrderUpdate(BaseModel):
    status: str

class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_amount: float
    status: str
    payment_method: Optional[str]
    items: List[OrderItemBase]
    created_at: datetime
    updated_at: Optional[datetime]

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