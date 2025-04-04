from sqlalchemy.orm import Session
from app.core.config import settings
from app.crud import user, menu
from app.schemas.user import UserCreate
from app.schemas.menu import MenuCreate
from app.db.base import Base
from app.db.session import engine

def init_db(db: Session) -> None:
    # 데이터베이스 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    # 초기 관리자 계정 생성
    admin = user.get_by_email(db, email=settings.FIRST_SUPERUSER_EMAIL)
    if not admin:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER_EMAIL,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            name="관리자",
            is_admin=True,
            sweetness=0.5,
            sourness=0.3,
            bitterness=0.3
        )
        user.create(db, obj_in=user_in)
    
    # 초기 메뉴 데이터
    initial_menus = [
        {
            "name": "아메리카노",
            "description": "깔끔하고 깊은 맛의 에스프레소와 물의 조화",
            "price": 4500,
            "category": "커피",
            "sweetness": 0.1,
            "sourness": 0.7,
            "bitterness": 0.8
        },
        {
            "name": "카페라떼",
            "description": "부드러운 우유와 에스프레소의 조화",
            "price": 5000,
            "category": "커피",
            "sweetness": 0.3,
            "sourness": 0.5,
            "bitterness": 0.6
        },
        {
            "name": "바닐라라떼",
            "description": "달콤한 바닐라 시럽과 부드러운 라떼의 만남",
            "price": 5500,
            "category": "커피",
            "sweetness": 0.8,
            "sourness": 0.3,
            "bitterness": 0.4
        }
    ]
    
    # 초기 메뉴 추가
    for menu_data in initial_menus:
        menu_obj = menu.get_by_name(db, name=menu_data["name"])
        if not menu_obj:
            menu_in = MenuCreate(**menu_data)
            menu.create(db, menu_in=menu_in)
    
    db.commit() 