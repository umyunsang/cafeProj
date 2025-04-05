from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.menu import Menu
from app.models.user import User
from app.core.config import settings
from app.core.security import get_password_hash
from datetime import datetime

# 데이터베이스 연결
engine = create_engine(settings.DATABASE_URI)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# 초기 메뉴 데이터
initial_menus = [
    {
        "name": "아메리카노",
        "description": "깊고 강한 풍미의 에스프레소와 뜨거운 물의 조화",
        "price": 4500,
        "category": "커피",
    },
    {
        "name": "카페라떼",
        "description": "부드러운 우유와 에스프레소의 조화",
        "price": 5000,
        "category": "커피",
    },
    {
        "name": "카푸치노",
        "description": "풍부한 우유 거품과 에스프레소의 완벽한 밸런스",
        "price": 5000,
        "category": "커피",
    },
    {
        "name": "바닐라라떼",
        "description": "달콤한 바닐라 시럽이 들어간 부드러운 카페라떼",
        "price": 5500,
        "category": "커피",
    },
    {
        "name": "카라멜마끼아또",
        "description": "카라멜 시럽의 달콤함과 에스프레소의 쌉싸름한 맛의 조화",
        "price": 5500,
        "category": "커피",
    },
    {
        "name": "초콜릿라떼",
        "description": "진한 초콜릿과 우유의 달콤한 만남",
        "price": 5500,
        "category": "논커피",
    },
    {
        "name": "녹차라떼",
        "description": "깊은 녹차의 맛과 부드러운 우유의 조화",
        "price": 5500,
        "category": "논커피",
    },
    {
        "name": "딸기스무디",
        "description": "신선한 딸기의 상큼함이 가득한 시원한 스무디",
        "price": 6000,
        "category": "스무디",
    },
    {
        "name": "망고스무디",
        "description": "달콤한 망고의 맛이 가득한 시원한 스무디",
        "price": 6000,
        "category": "스무디",
    },
    {
        "name": "치즈케이크",
        "description": "부드럽고 진한 치즈의 맛이 일품인 케이크",
        "price": 6500,
        "category": "디저트",
    }
]

try:
    # 관리자 계정 생성
    admin = db.query(User).filter(User.email == "admin@example.com").first()
    if not admin:
        admin = User(
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            is_active=True,
            is_admin=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("관리자 계정이 생성되었습니다.")
    
    # 기존 메뉴 모두 삭제
    db.query(Menu).delete()
    db.commit()
    
    # 새로운 메뉴 추가
    for menu_data in initial_menus:
        menu = Menu(
            name=menu_data["name"],
            description=menu_data["description"],
            price=menu_data["price"],
            category=menu_data["category"],
            order_count=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            created_by=admin.id,
            updated_by=admin.id
        )
        db.add(menu)
    
    db.commit()
    print("초기 메뉴 데이터가 성공적으로 추가되었습니다.")

except Exception as e:
    print(f"오류 발생: {e}")
    db.rollback()

finally:
    db.close() 