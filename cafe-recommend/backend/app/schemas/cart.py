from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from .menu import Menu

class CartItemBase(BaseModel):
    menu_id: int
    quantity: int = 1
    special_requests: Optional[str] = None

class CartItemCreate(CartItemBase):
    pass

class CartItemUpdate(BaseModel):
    menu_id: Optional[int] = None
    quantity: Optional[int] = None
    special_requests: Optional[str] = None

class CartItem(CartItemBase):
    id: int
    cart_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    menu: Menu

    class Config:
        from_attributes = True

class CartItemResponse(BaseModel):
    id: int
    menu_id: int
    quantity: int
    special_requests: Optional[str] = None
    menu_name: str
    menu_price: float
    total_price: float

    class Config:
        from_attributes = True

class CartBase(BaseModel):
    session_id: str

class CartCreate(CartBase):
    pass

class Cart(CartBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[CartItem] = []

    class Config:
        from_attributes = True

class CartWithItems(Cart):
    items: List[CartItemResponse] = []

    class Config:
        from_attributes = True

class CartSummaryResponse(BaseModel):
    id: int
    session_id: str
    items_count: int
    total_amount: float

    class Config:
        from_attributes = True 