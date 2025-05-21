from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

class Ingredient(Base):
    """원재료 정보를 저장하는 모델"""
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    unit = Column(String, nullable=False)  # 단위 (g, ml, 개 등)
    min_stock_level = Column(Float, default=0)  # 최소 재고 수준 (경고 표시 기준)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 재료의 현재 재고 (재고 테이블 관계)
    stock = relationship("IngredientStock", uselist=False, back_populates="ingredient", cascade="all, delete-orphan")
    
    # 메뉴와의 관계 (재료-메뉴 연결 테이블을 통해)
    menu_ingredients = relationship("MenuIngredient", back_populates="ingredient", cascade="all, delete-orphan")

class IngredientStock(Base):
    """원재료의 재고 정보를 저장하는 모델"""
    __tablename__ = "ingredient_stocks"

    id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False, unique=True)
    current_quantity = Column(Float, default=0)  # 현재 재고량
    last_restock_date = Column(DateTime(timezone=True), nullable=True)
    last_restock_quantity = Column(Float, default=0)  # 마지막 입고량
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 원재료와의 관계
    ingredient = relationship("Ingredient", back_populates="stock")

class MenuIngredient(Base):
    """메뉴 아이템과 필요 재료 사이의 관계 모델"""
    __tablename__ = "menu_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    menu_id = Column(Integer, ForeignKey("menus.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    quantity_required = Column(Float, nullable=False)  # 메뉴 1개당 필요한 재료 양
    is_optional = Column(Boolean, default=False)  # 선택적 재료 여부
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 유니크 제약조건: 메뉴-재료 조합은 유일해야 함
    __table_args__ = (
        UniqueConstraint('menu_id', 'ingredient_id', name='uix_menu_ingredient'),
    )

    # 메뉴와의 관계
    menu = relationship("MenuItem", back_populates="ingredients")
    
    # 재료와의 관계
    ingredient = relationship("Ingredient", back_populates="menu_ingredients")

class InventoryTransaction(Base):
    """재고 변동 기록을 저장하는 모델"""
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    transaction_type = Column(String, nullable=False)  # "입고", "출고", "폐기" 등
    quantity = Column(Float, nullable=False)  # 변동량 (양수: 입고, 음수: 출고)
    notes = Column(String, nullable=True)  # 메모
    created_by = Column(String, nullable=True)  # 작업자
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    order_id = Column(Integer, nullable=True)  # 주문으로 인한 출고일 경우 주문 ID

    # 재료와의 관계
    ingredient = relationship("Ingredient") 