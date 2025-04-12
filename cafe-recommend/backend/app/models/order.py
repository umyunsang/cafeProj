from typing import TYPE_CHECKING
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

from app.db.base_class import Base

if TYPE_CHECKING:
    from .menu import Menu  # noqa: F401
    from .user import User  # noqa: F401

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    menu_id = Column(Integer, ForeignKey("menus.id"))
    quantity = Column(Integer)
    unit_price = Column(Float)
    total_price = Column(Float)
    status = Column(String, default="pending")  # pending, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    order = relationship("Order", back_populates="order_items")
    menu = relationship("Menu", back_populates="order_items")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, index=True, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 비회원 주문 허용
    total_amount = Column(Float, default=0.0)
    status = Column(String, default="pending")  # pending, paid, completed, cancelled
    payment_method = Column(String, nullable=True)
    payment_key = Column(String, nullable=True)  # 결제 고유 번호 (tid)
    session_id = Column(String, nullable=True)  # 비회원 주문 추적용
    delivery_address = Column(String, nullable=True)  # 배달 주소
    delivery_request = Column(String, nullable=True)  # 배달 요청사항
    phone_number = Column(String, nullable=True)  # 연락처
    
    # 주문 상세 정보 (JSON 형식으로 저장)
    items = Column(String, nullable=True)  # JSON 형식의 주문 아이템 목록
    
    # 주문 시간 (created_at에 인덱스 추가)
    created_at = Column(DateTime(timezone=True), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 관계 설정
    user = relationship("User", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan") 