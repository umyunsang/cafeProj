from typing import TYPE_CHECKING
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base
# from app.models.inventory import MenuIngredient # MenuIngredient 모델이 아직 없으므로 주석 처리

if TYPE_CHECKING:
    from .order import OrderItem  # noqa: F401
    from .cart import CartItem  # noqa: F401
    # from .review import Review  # noqa: F401 # Review 모델이 아직 없으므로 주석 처리

class MenuItem(Base):
    __tablename__ = "menus"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String, index=True, nullable=False)
    
    # 이미지 URL
    image_url = Column(String, nullable=True)
    
    # 주문 통계
    order_count = Column(Integer, default=0)
    
    # 리뷰 통계
    avg_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    
    # 상태
    is_available = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    
    # 타임스탬프
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관리자 정보
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    
    # 관계 설정
    order_items = relationship("app.models.order.OrderItem", back_populates="menu")
    # reviews = relationship("app.models.review.Review", back_populates="menu") # Review 모델이 아직 없으므로 주석 처리
    
    # 재료 관계 설정
    # ingredients = relationship("app.models.inventory.MenuIngredient", back_populates="menu", cascade="all, delete-orphan") # MenuIngredient 모델이 아직 없으므로 주석 처리

    def get_menu_text(self):
        """메뉴 정보를 텍스트로 반환"""
        text = f"{self.name}: {self.description if self.description else ''}. "
        text += f"가격: {self.price}원. "
        text += f"카테고리: {self.category}. "
        return text

# Menu 이름으로도 사용할 수 있도록 별칭 추가
Menu = MenuItem 