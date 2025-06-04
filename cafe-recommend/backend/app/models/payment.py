from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class Payment(Base):
    # __tablename__ = "payments"

    provider = Column(String, primary_key=True, index=True)
    client_id = Column(String)
    client_secret = Column(String)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) 