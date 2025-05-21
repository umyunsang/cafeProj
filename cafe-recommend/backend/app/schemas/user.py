from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime

class UserPreferences(BaseModel):
    tastePreference: Optional[str] = None
    # 기타 선호도 정보는 여기에 추가

class UserBase(BaseModel):
    email: EmailStr
    name: str
    preferences: Dict[str, Any] = {}
    is_active: bool = True
    is_admin: bool = False
    is_superuser: bool = False
    taste_preference: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    password: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    taste_preference: Optional[str] = None

class UserPreferenceUpdate(BaseModel):
    preferences: Optional[Dict[str, Any]] = None
    taste_preference: Optional[str] = None

class UserInDBBase(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str 