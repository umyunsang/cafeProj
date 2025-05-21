from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.sql import func

from app.database import Base

class PaymentSettings(Base):
    """결제 API 설정 정보를 저장하는 모델"""
    __tablename__ = "payment_settings"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, index=True, nullable=False)  # "kakaopay" 또는 "naverpay"
    is_active = Column(Boolean, default=False)
    client_id = Column(String, nullable=True)  # 암호화된 API 키 저장
    client_secret = Column(String, nullable=True)  # 암호화된 API 시크릿 저장
    additional_settings = Column(JSON, default={})  # 추가 설정 (콜백 URL, 환경 설정 등)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) 