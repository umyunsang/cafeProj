from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.menu import Menu
from app.core.config import settings
from app.services.vector_store import vector_store

# 데이터베이스 연결
engine = create_engine(settings.DATABASE_URI)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # 아메리카노 메뉴 업데이트
    menu = db.query(Menu).filter(Menu.id == 1).first()
    if menu:
        # 맛 프로필과 온도 설명 업데이트
        menu.taste_profile = "깊고 강한 풍미와 약간의 쓴맛이 균형을 이루며, 풍부한 향과 깔끔한 후미가 특징"
        menu.temperature_desc = "뜨겁게 또는 차갑게 선택 가능"
        db.commit()
        print("아메리카노 메뉴 업데이트 성공")
        
        # 벡터 저장소 업데이트
        vector_store.update_menu(menu.id, menu)
        print("벡터 저장소 업데이트 성공")
    else:
        print("메뉴를 찾을 수 없습니다")
        
    # 카페라떼 메뉴 업데이트
    menu = db.query(Menu).filter(Menu.id == 2).first()
    if menu:
        menu.taste_profile = "부드러운 우유와 에스프레소의 조화로 달콤하면서도 균형 잡힌 맛이 특징"
        menu.temperature_desc = "뜨겁게 또는 차갑게 선택 가능"
        db.commit()
        print("카페라떼 메뉴 업데이트 성공")
        
        # 벡터 저장소 업데이트
        vector_store.update_menu(menu.id, menu)
    else:
        print("카페라떼 메뉴를 찾을 수 없습니다")
        
    # 카푸치노 메뉴 업데이트
    menu = db.query(Menu).filter(Menu.id == 3).first()
    if menu:
        menu.taste_profile = "풍부한 거품과 부드러운 우유, 에스프레소의 조화로 고소하고 풍부한 맛"
        menu.temperature_desc = "따뜻하게 제공"
        db.commit()
        print("카푸치노 메뉴 업데이트 성공")
        
        # 벡터 저장소 업데이트
        vector_store.update_menu(menu.id, menu)
    else:
        print("카푸치노 메뉴를 찾을 수 없습니다")

except Exception as e:
    print(f"오류: {e}")
finally:
    db.close() 