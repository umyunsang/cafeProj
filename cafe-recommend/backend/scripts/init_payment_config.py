from app.database import SessionLocal
from app.models.payment import PaymentConfig

def init_payment_config():
    db = SessionLocal()
    try:
        # 카카오페이 설정 추가
        kakao_config = PaymentConfig(
            provider='kakao',
            client_id='d6f8cf9ed125ce95eaca902cc2af20e7',
            client_secret='',
            is_active=True
        )
        db.add(kakao_config)
        
        # 네이버페이 설정 추가
        naver_config = PaymentConfig(
            provider='naver',
            client_id='',
            client_secret='',
            is_active=False
        )
        db.add(naver_config)
        
        db.commit()
        print("결제 설정이 추가되었습니다.")
        
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_payment_config() 