from app.db.session import SessionLocal
from app.db.init_db import init_db

def main() -> None:
    db = SessionLocal()
    init_db(db)
    print("초기 데이터가 성공적으로 추가되었습니다.")

if __name__ == "__main__":
    main() 