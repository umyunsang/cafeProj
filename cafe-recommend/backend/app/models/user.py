from typing import TYPE_CHECKING
from sqlalchemy import Boolean, Column, Integer, String, Float, JSON, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

if TYPE_CHECKING:
    from .order import Order  # noqa: F401
    from .review import Review  # noqa: F401

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    
    # 사용자 선호도 (슬라이더 기반, 백워드 호환성 유지)
    sweetness = Column(Float, default=0.5)  # 단맛 선호도 (0.0 ~ 1.0)
    sourness = Column(Float, default=0.5)   # 신맛 선호도 (0.0 ~ 1.0)
    bitterness = Column(Float, default=0.5) # 쓴맛 선호도 (0.0 ~ 1.0)
    
    # 자연어 맛 선호도 (사용자가 입력한 문장 그대로 저장)
    taste_preference = Column(Text, nullable=True)
    
    # 추가 선호도 정보 (JSON 형식)
    preferences = Column(JSON, default=lambda: {})
    
    # 생성일/수정일
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Last login timestamp
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Preferences
    preferred_language = Column(String, default="ko")
    
    # 관계 설정
    orders = relationship("app.models.order.Order", back_populates="user")
    reviews = relationship("app.models.review.Review", back_populates="user") 