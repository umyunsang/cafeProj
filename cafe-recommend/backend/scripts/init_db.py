from app.db.base import Base
from app.database import engine
from app.models.payment import PaymentConfig

def init_db():
    # 데이터베이스 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    print("데이터베이스 테이블이 생성되었습니다.")

if __name__ == "__main__":
    init_db() 