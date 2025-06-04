# from typing import Any, Dict, Optional, Union
# from sqlalchemy.orm import Session

# from app.core.security import get_password_hash, verify_password
# from app.crud.base import CRUDBase
# from app.models.user import User
# from app.schemas.user import UserCreate, UserUpdate

# class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
#     def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
#         """이메일로 사용자 조회"""
#         return db.query(User).filter(User.email == email).first()

#     def create(self, db: Session, *, obj_in: UserCreate) -> User:
#         """새 사용자 생성"""
#         is_admin = getattr(obj_in, "is_admin", False)
#         is_superuser = getattr(obj_in, "is_superuser", is_admin)
        
#         db_obj = User(
#             email=obj_in.email,
#             hashed_password=get_password_hash(obj_in.password),
#             name=obj_in.name,
#             preferences=obj_in.preferences,
#             is_superuser=is_superuser,
#             is_active=obj_in.is_active,
#             taste_preference=obj_in.taste_preference
#         )
#         db.add(db_obj)
#         db.commit()
#         db.refresh(db_obj)
#         return db_obj

#     def update(
#         self, db: Session, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
#     ) -> User:
#         """사용자 정보 업데이트"""
#         if isinstance(obj_in, dict):
#             update_data = obj_in
#         else:
#             update_data = obj_in.dict(exclude_unset=True)
#         if "password" in update_data and update_data["password"]:
#             update_data["hashed_password"] = get_password_hash(update_data["password"])
#             del update_data["password"]
        
#         # is_admin 처리 (하위 호환성)
#         if "is_admin" in update_data and "is_superuser" not in update_data:
#             update_data["is_superuser"] = update_data["is_admin"]
        
#         return super().update(db, db_obj=db_obj, obj_in=update_data)

#     def authenticate(self, db: Session, *, email: str, password: str) -> Optional[User]:
#         """사용자 인증"""
#         user = self.get_by_email(db, email=email)
#         if not user:
#             return None
#         if not verify_password(password, user.hashed_password):
#             return None
#         return user

#     def is_active(self, user: User) -> bool:
#         """사용자 활성화 상태 확인"""
#         return user.is_active

#     def is_admin(self, user: User) -> bool:
#         """관리자 권한 확인 (하위 호환성 유지)"""
#         return user.is_superuser

# user = CRUDUser(User)
pass # 파일이 비어있지 않도록 pass 추가 