from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any
import json
import os
from datetime import datetime
import shutil

from app.api.deps import get_db, get_current_active_admin
from app.models.admin import Admin
from app.core.security import encrypt_api_key, decrypt_api_key
from app.models.payment_settings import PaymentSettings
from app.schemas.payment_settings import (
    PaymentSettingsBase,
    PaymentSettingsCreate,
    PaymentSettingsResponse,
    PaymentSettingsBackup
)

router = APIRouter()

@router.get("/payment", response_model=Dict[str, PaymentSettingsResponse])
def get_payment_settings(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """결제 API 설정 정보 조회"""
    settings = {}
    
    # 네이버페이 설정 조회
    naver_settings = db.query(PaymentSettings).filter(
        PaymentSettings.provider == "naverpay"
    ).first()
    
    if naver_settings:
        settings["naverpay"] = PaymentSettingsResponse(
            provider="naverpay",
            is_active=naver_settings.is_active,
            client_id=decrypt_api_key(naver_settings.client_id) if naver_settings.client_id else None,
            client_secret_masked="*" * 8 if naver_settings.client_secret else None,
            additional_settings=naver_settings.additional_settings,
            updated_at=naver_settings.updated_at
        )
    else:
        settings["naverpay"] = PaymentSettingsResponse(
            provider="naverpay",
            is_active=False,
            client_id=None,
            client_secret_masked=None,
            additional_settings={},
            updated_at=None
        )
    
    # 카카오페이 설정 조회
    kakao_settings = db.query(PaymentSettings).filter(
        PaymentSettings.provider == "kakaopay"
    ).first()
    
    if kakao_settings:
        settings["kakaopay"] = PaymentSettingsResponse(
            provider="kakaopay",
            is_active=kakao_settings.is_active,
            client_id=decrypt_api_key(kakao_settings.client_id) if kakao_settings.client_id else None,
            client_secret_masked="*" * 8 if kakao_settings.client_secret else None,
            additional_settings=kakao_settings.additional_settings,
            updated_at=kakao_settings.updated_at
        )
    else:
        settings["kakaopay"] = PaymentSettingsResponse(
            provider="kakaopay",
            is_active=False,
            client_id=None,
            client_secret_masked=None,
            additional_settings={},
            updated_at=None
        )
    
    return settings

@router.post("/payment/{provider}", response_model=PaymentSettingsResponse)
def update_payment_settings(
    provider: str,
    settings_data: PaymentSettingsCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """결제 API 설정 업데이트"""
    if provider not in ["naverpay", "kakaopay"]:
        raise HTTPException(status_code=400, detail="지원하지 않는 결제 제공업체입니다.")
    
    # 기존 설정 조회
    existing_settings = db.query(PaymentSettings).filter(
        PaymentSettings.provider == provider
    ).first()
    
    # 클라이언트 ID와 시크릿 암호화
    encrypted_client_id = encrypt_api_key(settings_data.client_id) if settings_data.client_id else None
    encrypted_client_secret = encrypt_api_key(settings_data.client_secret) if settings_data.client_secret else None
    
    if existing_settings:
        # 기존 설정 업데이트
        existing_settings.is_active = settings_data.is_active
        if encrypted_client_id:
            existing_settings.client_id = encrypted_client_id
        if encrypted_client_secret:
            existing_settings.client_secret = encrypted_client_secret
        existing_settings.additional_settings = settings_data.additional_settings or {}
        existing_settings.updated_at = datetime.utcnow()
        db.add(existing_settings)
    else:
        # 새 설정 생성
        new_settings = PaymentSettings(
            provider=provider,
            is_active=settings_data.is_active,
            client_id=encrypted_client_id,
            client_secret=encrypted_client_secret,
            additional_settings=settings_data.additional_settings or {},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(new_settings)
    
    db.commit()
    
    # 응답 데이터 준비
    response_data = PaymentSettingsResponse(
        provider=provider,
        is_active=settings_data.is_active,
        client_id=settings_data.client_id,
        client_secret_masked="*" * 8 if settings_data.client_secret else None,
        additional_settings=settings_data.additional_settings or {},
        updated_at=datetime.utcnow()
    )
    
    return response_data

@router.post("/payment/{provider}/toggle", response_model=PaymentSettingsResponse)
def toggle_payment_provider(
    provider: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """결제 제공업체 활성화/비활성화 토글"""
    if provider not in ["naverpay", "kakaopay"]:
        raise HTTPException(status_code=400, detail="지원하지 않는 결제 제공업체입니다.")
    
    # 기존 설정 조회
    existing_settings = db.query(PaymentSettings).filter(
        PaymentSettings.provider == provider
    ).first()
    
    if not existing_settings:
        raise HTTPException(status_code=404, detail="설정을 찾을 수 없습니다. 먼저 API 키를 설정해주세요.")
    
    # 상태 토글
    existing_settings.is_active = not existing_settings.is_active
    existing_settings.updated_at = datetime.utcnow()
    
    db.add(existing_settings)
    db.commit()
    
    # 응답 데이터 준비
    response_data = PaymentSettingsResponse(
        provider=provider,
        is_active=existing_settings.is_active,
        client_id=decrypt_api_key(existing_settings.client_id) if existing_settings.client_id else None,
        client_secret_masked="*" * 8 if existing_settings.client_secret else None,
        additional_settings=existing_settings.additional_settings,
        updated_at=existing_settings.updated_at
    )
    
    return response_data

@router.post("/payment/backup", response_model=dict)
def backup_payment_settings(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """결제 API 설정 백업"""
    # 백업 폴더 생성
    backup_dir = "backup/payment_settings"
    os.makedirs(backup_dir, exist_ok=True)
    
    # 백업 파일명 생성
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_file = f"{backup_dir}/payment_settings_{timestamp}.json"
    
    # 모든 결제 설정 조회
    settings = db.query(PaymentSettings).all()
    
    # 백업 데이터 준비
    backup_data = []
    for setting in settings:
        backup_data.append(
            PaymentSettingsBackup(
                id=setting.id,
                provider=setting.provider,
                is_active=setting.is_active,
                client_id=setting.client_id,
                client_secret=setting.client_secret,
                additional_settings=setting.additional_settings,
                created_at=setting.created_at,
                updated_at=setting.updated_at
            ).dict()
        )
    
    # 파일에 백업 데이터 저장
    with open(backup_file, "w") as f:
        json.dump(backup_data, f, default=str)
    
    return {"status": "success", "message": "결제 설정이 성공적으로 백업되었습니다.", "file": backup_file}

@router.post("/payment/restore", response_model=dict)
async def restore_payment_settings(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """결제 API 설정 복원"""
    # 임시 파일 저장
    temp_file = f"temp_{file.filename}"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # 파일에서 백업 데이터 읽기
        with open(temp_file, "r") as f:
            backup_data = json.load(f)
        
        # 기존 설정 모두 삭제
        db.query(PaymentSettings).delete()
        
        # 백업 데이터로 설정 복원
        for setting_data in backup_data:
            setting = PaymentSettings(
                provider=setting_data["provider"],
                is_active=setting_data["is_active"],
                client_id=setting_data["client_id"],
                client_secret=setting_data["client_secret"],
                additional_settings=setting_data["additional_settings"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(setting)
        
        db.commit()
        
        # 임시 파일 삭제
        os.remove(temp_file)
        
        return {"status": "success", "message": "결제 설정이 성공적으로 복원되었습니다."}
    
    except Exception as e:
        # 오류 발생 시 임시 파일 삭제
        if os.path.exists(temp_file):
            os.remove(temp_file)
        
        raise HTTPException(status_code=400, detail=f"설정 복원 중 오류가 발생했습니다: {str(e)}") 