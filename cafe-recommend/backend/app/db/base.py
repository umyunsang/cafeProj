# app.db.base.py

# Import the true Base from base_class and re-export it
from app.db.base_class import Base

# TimeStampedBase should inherit from the true Base
from sqlalchemy import Column, DateTime
from sqlalchemy.sql import func

class TimeStampedBase(Base):
    __abstract__ = True
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# 모델 임포트 구문은 여기서 모두 제거
# 모델들은 각자의 파일에서 from app.db.base import Base (또는 from app.db.base_class import Base)를 사용해야 함 