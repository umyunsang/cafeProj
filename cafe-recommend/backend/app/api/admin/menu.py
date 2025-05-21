from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from app.database import get_db
from app.models.menu import Menu
from app.schemas.menu import MenuCreate, MenuUpdate, MenuResponse, MenuAvailabilityUpdate
from app.api.deps import get_current_active_admin
from app.models.admin import Admin
from app.core.config import settings
import logging

# OpenAI 이미지 생성을 위한 라이브러리 추가
# import requests
# import base64
# from io import BytesIO
# from PIL import Image
# import asyncio

# crud.menu 임포트 추가
from app.crud import menu as menu_crud

router = APIRouter()
logger = logging.getLogger(__name__)

# 폴더가 없으면 생성
# os.makedirs(os.path.join(settings.STATIC_DIR, "menu_images"), exist_ok=True)

# 개발 환경에서 테스트 메뉴 데이터 추가 함수
def add_sample_menus(db: Session):
    """개발 환경에서 사용할 샘플 메뉴 데이터를 추가합니다."""
    sample_menus = [
        {
            "name": "아메리카노",
            "description": "깊고 풍부한 맛의 에스프레소에 물을 더해 깔끔한 맛을 느낄 수 있는 메뉴",
            "price": 4500,
            "category": "커피",
            "is_available": True,
            "image_url": "/static/menu_images/americano.jpg"
        },
        {
            "name": "카페 라떼",
            "description": "에스프레소에 부드러운 우유를 더한 클래식한 커피 메뉴",
            "price": 5000,
            "category": "커피",
            "is_available": True,
            "image_url": "/static/menu_images/latte.jpg"
        },
        {
            "name": "바닐라 라떼",
            "description": "바닐라 시럽과 우유가 조화롭게 어우러진 달콤한 커피",
            "price": 5500,
            "category": "커피",
            "is_available": True,
            "image_url": "/static/menu_images/vanilla_latte.jpg"
        },
        {
            "name": "카푸치노",
            "description": "에스프레소에 스팀 밀크와 풍성한 우유 거품을 올린 커피",
            "price": 5000,
            "category": "커피",
            "is_available": True,
            "image_url": "/static/menu_images/cappuccino.jpg"
        },
        {
            "name": "녹차 라떼",
            "description": "향긋한 녹차가루와 부드러운 우유의 만남",
            "price": 5500,
            "category": "논커피",
            "is_available": True,
            "image_url": "/static/menu_images/green_tea_latte.jpg"
        },
        {
            "name": "초콜릿 케이크",
            "description": "진한 초콜릿의 달콤함이 가득한 시그니처 디저트",
            "price": 6500,
            "category": "디저트",
            "is_available": True,
            "image_url": "/static/menu_images/chocolate_cake.jpg"
        },
        {
            "name": "치즈 케이크",
            "description": "부드럽고 진한 맛의 뉴욕 스타일 치즈케이크",
            "price": 6500,
            "category": "디저트",
            "is_available": True,
            "image_url": "/static/menu_images/cheesecake.jpg"
        },
        {
            "name": "크로플",
            "description": "바삭한 크루아상과 와플이 만난 달콤한 디저트",
            "price": 5500,
            "category": "디저트",
            "is_available": True,
            "image_url": "/static/menu_images/croffle.jpg"
        },
        # 새로운 시그니처 메뉴 추가
        {
            "name": "별빛바다 에이드",
            "description": "해 질 녘 푸른 바다를 담은 듯한 오묘한 색상의 레몬그라스 기반 에이드. 식용 반짝이와 허브로 밤하늘의 별과 은하수를 표현하고, 상큼한 라임과 패션후르츠 시럽으로 열대과일의 풍미를 더함.",
            "price": 7500,
            "category": "시그니처 음료",
            "is_available": True,
            "image_url": "/static/menu_images/default-menu.jpg"
        },
    ]
    
    # 데이터베이스에 메뉴가 없는 경우에만 샘플 데이터 추가
    if db.query(Menu).count() == 0:
        logger.info("샘플 메뉴 데이터 추가 시작")
        for menu_data in sample_menus:
            menu = Menu(**menu_data)
            db.add(menu)
        
        try:
            db.commit()
            logger.info(f"샘플 메뉴 {len(sample_menus)}개 추가 완료")
        except Exception as e:
            db.rollback()
            logger.error(f"샘플 메뉴 추가 실패: {str(e)}")
    
    else:
        logger.info(f"메뉴가 이미 존재합니다. 현재 메뉴 수: {db.query(Menu).count()}")

@router.get("/menus", response_model=List[MenuResponse])
async def get_menus(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """관리자용 메뉴 목록 조회 API"""
    
    # 개발 환경에서 메뉴가 없으면 샘플 데이터 추가
    if settings.ENVIRONMENT == "development":
        add_sample_menus(db)
    
    menus = db.query(Menu).all()
    return menus

@router.get("/menus/{menu_id}", response_model=MenuResponse)
async def get_menu(
    menu_id: int,
    current_admin: Admin = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    menu = db.query(Menu).filter(Menu.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없습니다")
    return menu

@router.post("/menus", response_model=MenuResponse)
async def create_menu(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(...),
    category: str = Form(...),
    is_available: bool = Form(True),
    image_url: Optional[str] = Form(None),
    current_admin: Admin = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    # Log received form data
    form_data_log = {
        "name": name,
        "description": description,
        "price": price,
        "category": category,
        "is_available": is_available,
        "image_url": image_url,
    }
    logger.info(f"Received form data for create_menu: {form_data_log}")

    try:
        menu_in = MenuCreate(
            name=name,
            description=description,
            price=price,
            category=category,
            is_available=is_available,
            image_url=image_url
        )
        
        # crud.menu.create 호출 (새로운 AI 생성 로직이 여기에 포함됨)
        db_menu = await menu_crud.create(db=db, menu_in=menu_in, admin_id=current_admin.id)
        
        return db_menu
    except Exception as e:
        logger.error(f"메뉴 생성 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"메뉴 생성에 실패했습니다: {str(e)}")

@router.put("/menus/{menu_id}", response_model=MenuResponse)
async def update_menu(
    menu_id: int,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(...),
    category: str = Form(...),
    is_available: bool = Form(True),
    image_url: Optional[str] = Form(None),
    current_admin: Admin = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    db_menu = db.query(Menu).filter(Menu.id == menu_id).first()
    if not db_menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없습니다")
    
    # 이미지 처리
    if image_url:
        # 기존 이미지 파일 삭제
        if db_menu.image_url:
            old_file_path = os.path.join(settings.STATIC_DIR, db_menu.image_url.replace("/static/", ""))
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
        
        # 이미지 URL 업데이트
        db_menu.image_url = image_url
    elif not db_menu.image_url:
        # 이미지가 없고 기존 이미지도 없는 경우, AI로 이미지 생성
        logger.info(f"메뉴 '{name}' 이미지 없음, AI 이미지 생성 시도 중...")
        image_url = await generate_menu_image_with_ai(name, description or "", category)
        if image_url:
            logger.info(f"AI 이미지 생성 성공: {image_url}")
            db_menu.image_url = image_url
        else:
            logger.warning(f"AI 이미지 생성 실패, 기본 이미지 사용")
            # 이미지 생성 실패 시 기본 이미지 사용
            db_menu.image_url = "/static/menu_images/default-menu.jpg"
    
    # 다른 필드 업데이트
    db_menu.name = name
    db_menu.description = description
    db_menu.price = price
    db_menu.category = category
    db_menu.is_available = is_available
    db_menu.updated_by = current_admin.id
    
    db.commit()
    db.refresh(db_menu)
    return db_menu

@router.delete("/menus/{menu_id}")
async def delete_menu(
    menu_id: int,
    current_admin: Admin = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    db_menu = db.query(Menu).filter(Menu.id == menu_id).first()
    if not db_menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없습니다")
    
    # 이미지 파일 삭제
    if db_menu.image_url:
        file_path = os.path.join(settings.STATIC_DIR, db_menu.image_url.replace("/static/", ""))
        if os.path.exists(file_path):
            os.remove(file_path)
    
    db.delete(db_menu)
    db.commit()
    return {"message": "메뉴가 삭제되었습니다"}

@router.put("/menus/{menu_id}/availability", response_model=MenuResponse)
async def update_menu_availability(
    menu_id: int,
    availability_data: MenuAvailabilityUpdate,
    current_admin: Admin = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    db_menu = db.query(Menu).filter(Menu.id == menu_id).first()
    if not db_menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없습니다")

    try:
        db_menu.is_available = availability_data.is_available
        db_menu.updated_at = datetime.utcnow()
        db_menu.updated_by = current_admin.id
        db.commit()
        db.refresh(db_menu)
        return db_menu
    except Exception as e:
        db.rollback()
        logger.error(f"메뉴 ID {menu_id}의 판매 상태 업데이트 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="메뉴 판매 상태 업데이트 중 오류가 발생했습니다.") 