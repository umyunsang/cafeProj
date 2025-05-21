from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime

# 기본 재료 스키마
class IngredientBase(BaseModel):
    name: str
    description: Optional[str] = None
    unit: str
    min_stock_level: float = 0
    is_active: bool = True

# 재료 생성 스키마
class IngredientCreate(IngredientBase):
    pass

# 재료 업데이트 스키마
class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    min_stock_level: Optional[float] = None
    is_active: Optional[bool] = None

# 재고 정보 스키마
class StockBase(BaseModel):
    current_quantity: float = 0
    last_restock_date: Optional[datetime] = None
    last_restock_quantity: Optional[float] = None

# 재고 생성 스키마
class StockCreate(StockBase):
    ingredient_id: int

# 재고 업데이트 스키마
class StockUpdate(BaseModel):
    current_quantity: Optional[float] = None
    last_restock_date: Optional[datetime] = None
    last_restock_quantity: Optional[float] = None

# 재고 트랜잭션 기본 스키마
class InventoryTransactionBase(BaseModel):
    ingredient_id: int
    transaction_type: str
    quantity: float
    notes: Optional[str] = None
    created_by: Optional[str] = None
    order_id: Optional[int] = None

    @validator('transaction_type')
    def validate_transaction_type(cls, v):
        valid_types = ["입고", "출고", "폐기", "조정"]
        if v not in valid_types:
            raise ValueError(f"트랜잭션 타입은 {', '.join(valid_types)} 중 하나여야 합니다.")
        return v

# 재고 트랜잭션 생성 스키마
class InventoryTransactionCreate(InventoryTransactionBase):
    pass

# 메뉴-재료 연결 기본 스키마
class MenuIngredientBase(BaseModel):
    menu_id: int
    ingredient_id: int
    quantity_required: float
    is_optional: bool = False

# 메뉴-재료 연결 생성 스키마
class MenuIngredientCreate(MenuIngredientBase):
    pass

# 메뉴-재료 연결 업데이트 스키마
class MenuIngredientUpdate(BaseModel):
    quantity_required: Optional[float] = None
    is_optional: Optional[bool] = None

# 응답 모델 (DB 모델 -> 스키마)
class IngredientStock(StockBase):
    id: int
    ingredient_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class Ingredient(IngredientBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    stock: Optional[IngredientStock] = None

    class Config:
        orm_mode = True

class MenuIngredient(MenuIngredientBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class InventoryTransaction(InventoryTransactionBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# 재고 상태 응답 모델 (재고량, 가용여부 포함)
class IngredientWithStatus(Ingredient):
    current_quantity: float = 0
    is_in_stock: bool = False
    stock_status: str = "재고 없음"  # "충분", "부족", "재고 없음"

# 메뉴 가용성 확인 응답 모델
class MenuAvailability(BaseModel):
    menu_id: int
    is_available: bool = True
    unavailable_ingredients: List[str] = []
    low_stock_ingredients: List[str] = []

# 재고 경고 응답 모델
class StockAlert(BaseModel):
    ingredient_id: int
    ingredient_name: str
    current_quantity: float
    min_stock_level: float
    unit: str
    status: str  # "부족", "재고 없음"

# 재고 대시보드 요약 정보
class InventorySummary(BaseModel):
    total_ingredients: int
    out_of_stock_count: int
    low_stock_count: int
    total_stock_value: float  # 전체 재고의 추정 가치
    stock_alerts: List[StockAlert] = [] 