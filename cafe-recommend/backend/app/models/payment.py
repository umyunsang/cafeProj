from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base

class PaymentConfig(Base):
    __tablename__ = "payment_configs"

    provider = Column(String, primary_key=True, index=True)
    client_id = Column(String)
    client_secret = Column(String)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) 