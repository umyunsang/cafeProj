from sqlalchemy.orm import Session
from app.core.config import settings
from app.crud import user, menu
from app.schemas.user import UserCreate
from app.schemas.menu import MenuCreate
from app.db.base import Base
from app.db.session import engine
from app.models.payment import PaymentConfig
from app.models.menu import Menu

def init_admin(db: Session) -> None:
    """관리자 계정 초기화"""
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
        admin = user.create(db, obj_in=user_in)
        print("관리자 계정이 생성되었습니다.")
    return admin

def init_menus(db: Session, admin_id: int) -> None:
    """메뉴 데이터 초기화"""
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
    
    for menu_data in initial_menus:
        menu_obj = menu.get_by_name(db, name=menu_data["name"])
        if not menu_obj:
            menu_in = MenuCreate(**menu_data)
            menu.create(db, menu_in=menu_in, admin_id=admin_id)
    print("메뉴 데이터가 초기화되었습니다.")

def init_payment_configs(db: Session) -> None:
    """결제 설정 초기화"""
    # 네이버페이 설정
    naver_pay = db.query(PaymentConfig).filter(PaymentConfig.provider == "naver").first()
    if not naver_pay:
        naver_pay = PaymentConfig(
            provider="naver",
            client_id="test_client_id",
            client_secret="test_client_secret",
            is_active=True
        )
        db.add(naver_pay)
        print("네이버페이 설정이 추가되었습니다.")

    # 카카오페이 설정
    kakao_pay = db.query(PaymentConfig).filter(PaymentConfig.provider == "kakao").first()
    if not kakao_pay:
        kakao_pay = PaymentConfig(
            provider="kakao",
            client_id="test_client_id",
            client_secret="test_client_secret",
            is_active=True
        )
        db.add(kakao_pay)
        print("카카오페이 설정이 추가되었습니다.")

    db.commit()

def init_db(db: Session) -> None:
    """데이터베이스 초기화"""
    # 데이터베이스 테이블 생성
    Base.metadata.create_all(bind=engine)
    print("데이터베이스 테이블이 생성되었습니다.")
    
    # 관리자 계정 생성
    admin = init_admin(db)
    
    # 메뉴 초기화
    init_menus(db, admin.id)
    
    # 결제 설정 초기화
    init_payment_configs(db)
    
    print("데이터베이스 초기화가 완료되었습니다.") 