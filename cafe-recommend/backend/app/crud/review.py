# from typing import List, Optional, Dict, Any
# from sqlalchemy.orm import Session
# from sqlalchemy import func
# from ..models.review import Review
# from ..models.menu import Menu
# from ..models.user import User # User 모델 참조 제거
# from ..schemas.review import ReviewCreate, ReviewUpdate

# def get(db: Session, review_id: int) -> Optional[Review]:
#     """특정 ID의 리뷰 조회"""
#     return db.query(Review).filter(Review.id == review_id).first()

# def get_by_menu(db: Session, menu_id: int, skip: int = 0, limit: int = 100) -> List[Review]:
#     """특정 메뉴의 리뷰 목록 조회"""
#     return db.query(Review).filter(Review.menu_id == menu_id).offset(skip).limit(limit).all()

# def get_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Review]:
#     """특정 사용자의 리뷰 목록 조회"""
#     return db.query(Review).filter(Review.user_id == user_id).offset(skip).limit(limit).all()

# def get_by_session(db: Session, session_id: str, skip: int = 0, limit: int = 100) -> List[Review]:
#     """특정 세션의 리뷰 목록 조회 (비회원용)"""
#     return db.query(Review).filter(Review.session_id == session_id).offset(skip).limit(limit).all()

# def create(db: Session, obj_in: ReviewCreate, user_id: Optional[int] = None, session_id: Optional[str] = None) -> Review:
#     """리뷰 생성"""
#     # 사용자 ID 또는 세션 ID가 없으면 에러
#     if not user_id and not session_id:
#         raise ValueError("리뷰 작성 시 사용자 ID 또는 세션 ID가 필요합니다.")
    
#     # 메뉴 존재 여부 확인
#     menu = db.query(Menu).filter(Menu.id == obj_in.menu_id).first()
#     if not menu:
#         raise ValueError(f"메뉴 ID {obj_in.menu_id}에 해당하는 메뉴가 존재하지 않습니다.")
    
#     # 리뷰 객체 생성
#     review_data = obj_in.dict()
#     db_obj = Review(
#         **review_data,
#         user_id=user_id,
#         session_id=session_id
#     )
    
#     # DB에 저장
#     db.add(db_obj)
#     db.commit()
#     db.refresh(db_obj)
    
#     # 메뉴의 평균 평점과 리뷰 개수 업데이트
#     update_menu_rating(db, obj_in.menu_id)
    
#     return db_obj

# def update(db: Session, db_obj: Review, obj_in: ReviewUpdate) -> Review:
#     """리뷰 업데이트"""
#     # 업데이트할 데이터 확인
#     update_data = obj_in.dict(exclude_unset=True)
    
#     # 리뷰 업데이트
#     for field, value in update_data.items():
#         setattr(db_obj, field, value)
    
#     # DB에 저장
#     db.add(db_obj)
#     db.commit()
#     db.refresh(db_obj)
    
#     # 메뉴의 평균 평점과 리뷰 개수 업데이트
#     update_menu_rating(db, db_obj.menu_id)
    
#     return db_obj

# def delete(db: Session, review_id: int) -> None:
#     """리뷰 삭제"""
#     # 리뷰 조회
#     review = db.query(Review).filter(Review.id == review_id).first()
#     if not review:
#         raise ValueError(f"리뷰 ID {review_id}에 해당하는 리뷰가 존재하지 않습니다.")
    
#     # 메뉴 ID 저장 (삭제 후 평점 업데이트용)
#     menu_id = review.menu_id
    
#     # 리뷰 삭제
#     db.delete(review)
#     db.commit()
    
#     # 메뉴의 평균 평점과 리뷰 개수 업데이트
#     update_menu_rating(db, menu_id)

# def update_menu_rating(db: Session, menu_id: int) -> None:
#     """메뉴의 평균 평점과 리뷰 개수 업데이트"""
#     # 메뉴 확인
#     menu = db.query(Menu).filter(Menu.id == menu_id).first()
#     if not menu:
#         return
    
#     # 평균 평점 계산
#     result = db.query(
#         func.avg(Review.rating).label("avg_rating"),
#         func.count(Review.id).label("review_count")
#     ).filter(Review.menu_id == menu_id).first()
    
#     # 업데이트
#     if result:
#         menu.avg_rating = round(result.avg_rating * 2) / 2 if result.avg_rating else 0.0  # 0.5 단위로 반올림
#         menu.review_count = result.review_count
#         db.add(menu)
#         db.commit()

# def get_rating_distribution(db: Session, menu_id: int) -> Dict[str, int]:
#     """메뉴의 평점 분포 조회"""
#     # 각 평점별 개수 조회
#     distributions = {}
#     for rating in range(1, 6):
#         count = db.query(Review).filter(
#             Review.menu_id == menu_id,
#             Review.rating == rating
#         ).count()
#         distributions[str(rating)] = count
    
#     return distributions
    
# def get_review_with_user_info(db: Session, review: Review) -> Dict[str, Any]:
#     """리뷰와 사용자 정보 포함하여 반환"""
#     result = {
#         "id": review.id,
#         "menu_id": review.menu_id,
#         "user_id": review.user_id,
#         "rating": review.rating,
#         "content": review.content,
#         "photo_url": review.photo_url,
#         "created_at": review.created_at,
#         "updated_at": review.updated_at,
#         "user_name": "익명"
#     }
    
#     # 사용자 정보 포함
#     # if review.user_id:
#     #     user = db.query(User).filter(User.id == review.user_id).first()
#     #     if user:
#     #         result["user_name"] = user.full_name # user.name 또는 user.email 등 User 모델에 따라 적절히 수정
    
#     return result

pass # 파일 내용이 없으므로 pass 추가 