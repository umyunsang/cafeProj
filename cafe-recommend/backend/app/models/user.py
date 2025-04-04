from sqlalchemy import Boolean, Column, Integer, String, Float, JSON, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
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

    # 관계 설정
    orders = relationship("Order", back_populates="user") 