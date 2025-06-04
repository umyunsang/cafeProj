# from typing import TYPE_CHECKING
# from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
# from sqlalchemy.orm import relationship
# from sqlalchemy.sql import func
# from app.database import Base

# if TYPE_CHECKING:
#     from .menu import MenuItem  # noqa: F401
#     from .user import User  # noqa: F401 # User 모델 참조 제거

# class Review(Base):
#     __tablename__ = "reviews"

#     id = Column(Integer, primary_key=True, index=True)
#     menu_id = Column(Integer, ForeignKey("menus.id"), nullable=False)
#     user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 익명 리뷰 허용 / User 모델이 없으므로 주석처리
#     session_id = Column(String, nullable=True)  # 비회원 리뷰 추적용
    
#     rating = Column(Float, nullable=False)  # 평점 (1-5)
#     content = Column(Text, nullable=True)  # 리뷰 내용
#     photo_url = Column(String, nullable=True)  # 사진 URL (옵션)
    
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
#     # 관계 설정
#     menu = relationship("app.models.menu.MenuItem", back_populates="reviews")
#     # user = relationship("app.models.user.User", back_populates="reviews") # User 모델이 없으므로 주석처리

pass # 파일 내용이 없으므로 pass 추가 