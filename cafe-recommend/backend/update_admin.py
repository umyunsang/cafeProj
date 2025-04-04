from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.core.config import settings

# 데이터베이스 연결
engine = create_engine(settings.DATABASE_URI)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # admin@example.com 사용자를 찾아서 관리자 권한 부여
    user = db.query(User).filter(User.email == "admin@example.com").first()
    if user:
        user.is_admin = True
        db.commit()
        print("Successfully updated admin privileges for admin@example.com")
    else:
        print("User admin@example.com not found")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close() 