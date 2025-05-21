#!/usr/bin/env python3
import os
import sys
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base
from passlib.context import CryptContext

# 프로젝트 루트 경로 설정
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_ROOT)

from app.core.config import settings # .env 로드된 설정 사용

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

Base = declarative_base()

class AdminUser(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# .env 파일에서 데이터베이스 URL 사용
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
if not SQLALCHEMY_DATABASE_URL:
    print("에러: DATABASE_URL이 .env 파일에 설정되지 않았습니다.")
    sys.exit(1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_admin_user():
    db = SessionLocal()
    try:
        # .env 파일에서 초기 관리자 이메일 및 비밀번호 로드 시도
        # 여기서는 FIRST_SUPERUSER 및 FIRST_SUPERUSER_PASSWORD 사용 (init_db.py와 일관성)
        admin_email = settings.FIRST_SUPERUSER # .env 에 FIRST_SUPERUSER=admin@example.com 추가 필요
        admin_password = settings.FIRST_SUPERUSER_PASSWORD # .env 에 FIRST_SUPERUSER_PASSWORD 추가 필요

        if not admin_email or not admin_password:
            print("에러: FIRST_SUPERUSER 또는 FIRST_SUPERUSER_PASSWORD가 .env 파일에 설정되지 않았습니다.")
            print("스크립트를 종료합니다. .env 파일에 해당 변수를 추가해주세요.")
            print("예: FIRST_SUPERUSER=admin@example.com")
            print("예: FIRST_SUPERUSER_PASSWORD=your_secure_password_here")
            return

        existing_admin = db.query(AdminUser).filter(AdminUser.email == admin_email).first()
        if existing_admin:
            print(f"관리자 계정 '{admin_email}'은(는) 이미 존재합니다.")
            # 기존 관리자 비밀번호 업데이트 여부 확인 또는 다른 작업 수행 가능
            # 예: existing_admin.hashed_password = get_password_hash(admin_password)
            #     existing_admin.is_superuser = True
            #     db.commit()
            #     print(f"관리자 계정 '{admin_email}'의 정보를 업데이트했습니다 (비밀번호, 슈퍼유저 권한).")
        else:
            hashed_password = get_password_hash(admin_password)
            admin_user = AdminUser(
                email=admin_email,
                hashed_password=hashed_password,
                is_active=True,
                is_superuser=True  # 초기 생성 시 슈퍼유저로 설정
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print(f"관리자 계정 '{admin_email}'이(가) 성공적으로 생성되었습니다.")
            print(f"비밀번호: {admin_password} (이 비밀번호로 로그인하세요)")

    finally:
        db.close()

if __name__ == "__main__":
    print("관리자 계정 생성 스크립트 실행...")
    # 이 스크립트는 app.core.config.settings를 직접 사용하므로, 
    # settings 모듈이 로드될 때 프로젝트 루트의 .env 파일이 자동으로 처리됨.
    # 단, 스크립트 실행 경로에 따라 python -m 옵션이 필요할 수 있음.
    # (예: 프로젝트 루트에서 python -m backend.scripts.create_admin)
    
    # Base.metadata.create_all(bind=engine) # 테이블이 없다면 생성 (필요시 주석 해제)
    # AdminUser 모델이 사용하는 'admins' 테이블이 DB에 존재해야 함.
    # create_tables.py 스크립트나 alembic 마이그레이션으로 테이블이 미리 생성되어 있다고 가정.

    create_admin_user()
    print("스크립트 실행 완료.") 