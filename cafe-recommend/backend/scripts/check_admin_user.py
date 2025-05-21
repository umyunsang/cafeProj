#!/usr/bin/env python3
import os
import sys
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 프로젝트 루트 경로 설정
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_ROOT)

from app.core.config import settings # .env 로드된 설정 사용

# .env 파일에서 데이터베이스 URL 사용
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
if not SQLALCHEMY_DATABASE_URL:
    print("에러: DATABASE_URL이 .env 파일에 설정되지 않았습니다.")
    sys.exit(1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Admin 모델 정의 (create_admin.py와 동일한 구조 또는 실제 Admin 모델 임포트)
class Admin(Base):
    __tablename__ = 'admins' # 실제 테이블 이름에 맞게 수정 필요
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

def get_admin_users():
    db = SessionLocal()
    try:
        admins = db.query(Admin).all()
        if not admins:
            print("등록된 관리자 계정이 없습니다.")
            return

        print("등록된 관리자 계정 목록:")
        for admin in admins:
            print(f"  - ID: {admin.id}, Email: {admin.email}, IsActive: {admin.is_active}, IsSuperuser: {admin.is_superuser}, HashedPassword: {admin.hashed_password[:20]}...") # 비밀번호는 일부만 출력
    finally:
        db.close()

if __name__ == "__main__":
    print("관리자 계정 확인 스크립트")
    # 테이블이 존재한다고 가정하고 실행
    get_admin_users() 