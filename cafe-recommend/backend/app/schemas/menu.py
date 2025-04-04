from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class MenuBase(BaseModel):
    name: str = Field(..., description="메뉴 이름")
    description: Optional[str] = Field(None, description="메뉴 설명")
    price: float = Field(..., gt=0, description="메뉴 가격")
    category: str = Field(..., description="메뉴 카테고리 (예: 커피, 디저트)")
    # image_url: Optional[str] = Field(None, description="메뉴 이미지 URL")  # 추후 이미지 기능 구현 예정

class SimpleMenuCreate(BaseModel):
    """필수 필드만 포함된 간소화된 메뉴 생성 스키마"""
    name: str = Field(..., description="메뉴 이름")
    price: float = Field(..., gt=0, description="메뉴 가격")
    category: str = Field(..., description="메뉴 카테고리 (예: 커피, 디저트)")
    # image_url: Optional[str] = Field(None, description="메뉴 이미지 URL")  # 추후 이미지 기능 구현 예정

class MenuCreate(MenuBase):
    pass

class MenuUpdate(MenuBase):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    # image_url: Optional[str] = None  # 추후 이미지 기능 구현 예정
    is_active: Optional[bool] = None

class MenuInDBBase(MenuBase):
    id: int
    order_count: int = 0
    is_active: bool = True
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    # image_url: Optional[str] = None  # 추후 이미지 기능 구현 예정

    class Config:
        from_attributes = True

class Menu(MenuInDBBase):
    pass

class MenuInDB(MenuInDBBase):
    pass 