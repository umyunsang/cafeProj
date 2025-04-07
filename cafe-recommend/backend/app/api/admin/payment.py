from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.payment import PaymentConfig
from ...schemas.payment import PaymentConfigCreate, PaymentConfigResponse
from ...dependencies import get_current_admin
from typing import List

router = APIRouter()

@router.get("/payment-configs", response_model=List[PaymentConfigResponse])
async def get_payment_configs(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """결제 설정 목록 조회"""
    configs = db.query(PaymentConfig).all()
    return configs

@router.post("/payment-configs/{provider}")
async def update_payment_config(
    provider: str,
    config: PaymentConfigCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """결제 설정 업데이트"""
    if provider not in ['naver', 'kakao']:
        raise HTTPException(status_code=400, detail="지원하지 않는 결제 수단입니다.")

    db_config = db.query(PaymentConfig).filter(PaymentConfig.provider == provider).first()
    
    if not db_config:
        db_config = PaymentConfig(
            provider=provider,
            client_id=config.client_id,
            client_secret=config.client_secret,
            is_active=config.is_active
        )
        db.add(db_config)
    else:
        db_config.client_id = config.client_id
        db_config.client_secret = config.client_secret
        db_config.is_active = config.is_active

    db.commit()
    db.refresh(db_config)
    
    return {"message": f"{provider} 결제 설정이 업데이트되었습니다."} 