from app.database import Base, engine
from app.models.admin import Admin

def create_tables():
    Base.metadata.create_all(bind=engine)
    print("데이터베이스 테이블이 생성되었습니다.")

if __name__ == "__main__":
    create_tables() 