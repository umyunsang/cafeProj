# from typing import Optional
# from pydantic import BaseModel, Field, validator
# from datetime import datetime

# # 리뷰 생성 스키마
# class ReviewCreate(BaseModel):
#     menu_id: int = Field(..., description="리뷰 대상 메뉴 ID")
#     rating: float = Field(..., ge=1, le=5, description="평점 (1-5)")
#     content: Optional[str] = Field(None, description="리뷰 내용")
#     photo_url: Optional[str] = Field(None, description="첨부 사진 URL")
    
#     @validator('rating')
#     def validate_rating(cls, v):
#         # 평점을 1-5 사이로 제한
#         if v < 1 or v > 5:
#             raise ValueError('평점은 1에서 5 사이여야 합니다.')
#         return round(v * 2) / 2  # 0.5 단위로 반올림

# # 리뷰 업데이트 스키마
# class ReviewUpdate(BaseModel):
#     rating: Optional[float] = Field(None, ge=1, le=5, description="평점 (1-5)")
#     content: Optional[str] = Field(None, description="리뷰 내용")
#     photo_url: Optional[str] = Field(None, description="첨부 사진 URL")
    
#     @validator('rating')
#     def validate_rating(cls, v):
#         if v is None:
#             return v
#         # 평점을 1-5 사이로 제한
#         if v < 1 or v > 5:
#             raise ValueError('평점은 1에서 5 사이여야 합니다.')
#         return round(v * 2) / 2  # 0.5 단위로 반올림

# # 리뷰 응답 스키마 (DB에서 가져온 리뷰)
# class Review(BaseModel):
#     id: int
#     menu_id: int
#     user_id: Optional[int] = None
#     rating: float
#     content: Optional[str] = None
#     photo_url: Optional[str] = None
#     created_at: datetime
#     updated_at: Optional[datetime] = None
    
#     # user가 있으면 이름 표시, 없으면 "익명"
#     user_name: Optional[str] = None
    
#     class Config:
#         from_attributes = True

# # 메뉴별 리뷰 통계 스키마
# class ReviewStats(BaseModel):
#     menu_id: int
#     avg_rating: float
#     review_count: int
#     rating_distribution: dict  # 예: {"1": 3, "2": 5, "3": 10, "4": 15, "5": 20}

pass # 파일 내용이 없으므로 pass 추가 