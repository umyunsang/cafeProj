from pydantic import BaseModel, Field
from typing import Dict, Optional, Any
from datetime import datetime

class PaymentSettingsBase(BaseModel):
    """결제 API 설정 기본 스키마"""
    provider: str
    is_active: bool = False
    additional_settings: Optional[Dict[str, Any]] = Field(default_factory=dict)

class PaymentSettingsCreate(PaymentSettingsBase):
    """결제 API 설정 생성 스키마"""
    client_id: Optional[str] = None
    client_secret: Optional[str] = None

class PaymentSettingsResponse(PaymentSettingsBase):
    """결제 API 설정 응답 스키마 (클라이언트에게 반환)"""
    client_id: Optional[str] = None
    client_secret_masked: Optional[str] = None  # 마스킹된 시크릿 값만 반환
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class PaymentSettingsBackup(BaseModel):
    """결제 API 설정 백업 스키마 (내부 저장용)"""
    id: int
    provider: str
    is_active: bool
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    additional_settings: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True 