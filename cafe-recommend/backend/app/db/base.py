from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, DateTime
from sqlalchemy.sql import func

Base = declarative_base()

class TimeStampedBase(Base):
    __abstract__ = True
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Import all models here for Alembic
from app.db.base_class import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.menu import Menu  # noqa: F401
from app.models.order import Order  # noqa: F401
from app.models.cart import Cart, CartItem  # noqa: F401 