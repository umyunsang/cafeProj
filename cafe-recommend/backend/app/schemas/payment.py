from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class NaverPayRequest(BaseModel):
    order_id: int

class NaverPayResponse(BaseModel):
    payment_id: str
    order_id: int
    payment_url: str

class OrderItemRequest(BaseModel):
    menu_id: int
    name: str
    quantity: int
    unit_price: float
    total_price: float

class OrderRequest(BaseModel):
    payment_method: str  # 'kakao' 또는 'naver'
    total_amount: int
    items: List[OrderItemRequest]

class PaymentRequest(BaseModel):
    order_id: str
    total_amount: int

class KakaoPayRequest(BaseModel):
    order_id: str
    total_amount: int
    item_name: str
    quantity: int

class KakaoPayResponse(BaseModel):
    tid: str  # 결제 고유 번호
    next_redirect_pc_url: str  # 결제 페이지 URL
    created_at: str  # 결제 준비 요청 시간

class PaymentStatus(BaseModel):
    payment_id: str
    status: str
    amount: float
    payment_type: str  # "naver" or "kakao"

class PaymentConfigBase(BaseModel):
    client_id: str
    client_secret: str
    is_active: bool = False

class PaymentConfigCreate(PaymentConfigBase):
    pass

class PaymentConfigResponse(PaymentConfigBase):
    provider: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# 주문 아이템 응답 스키마
class OrderItemResponse(BaseModel):
    id: int
    menu_id: int
    menu_name: str
    quantity: int
    unit_price: float
    total_price: float

    class Config:
        from_attributes = True

# 주문 응답 스키마
class OrderResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    total_amount: float
    status: str
    payment_method: Optional[str] = None
    payment_key: Optional[str] = None
    session_id: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_request: Optional[str] = None
    phone_number: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True 