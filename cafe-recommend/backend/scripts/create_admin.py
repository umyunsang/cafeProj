import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.admin import Admin
from passlib.context import CryptContext

# 비밀번호 해싱 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# 데이터베이스 연결 설정
SQLALCHEMY_DATABASE_URL = "sqlite:////home/uys_1705817/aiProj/cafe-recommend/backend/app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_admin():
    # 데이터베이스 세션 생성
    db = SessionLocal()
    
    try:
        # 기존 관리자 계정 확인
        admin = db.query(Admin).filter(Admin.email == "admin@test.com").first()
        if admin:
            print("관리자 계정이 이미 존재합니다.")
            return
        
        # 새 관리자 계정 생성
        admin = Admin(
            email="admin@test.com",
            hashed_password=get_password_hash("admin"),
            is_active=True,
            is_superuser=True
        )
        
        db.add(admin)
        db.commit()
        print("관리자 계정이 성공적으로 생성되었습니다.")
        print("이메일: admin@test.com")
        print("비밀번호: admin")
        
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin() 