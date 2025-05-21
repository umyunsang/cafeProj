#!/usr/bin/env python3

import os
import sys
import asyncio
import httpx # 비동기 HTTP 요청을 위해 httpx 사용
from io import BytesIO
from pathlib import Path
import sqlite3
import json
import time
from datetime import datetime
from PIL import Image
from dotenv import load_dotenv
import socket
from typing import Optional

# 프로젝트 루트 경로 설정 (스크립트 위치: backend/scripts/ 기준으로 backend 폴더가 프로젝트 루트 내에 있다고 가정)
SCRIPT_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
BACKEND_ROOT = SCRIPT_DIR.parent  # backend/
PROJECT_ROOT = BACKEND_ROOT.parent # cafeProj/ (실제 프로젝트 루트)

# backend 폴더를 sys.path에 추가하여 app 모듈 임포트 가능하도록 함
# 이렇게 하면 from app.core.config import settings 같은 임포트가 가능
# 또는 PROJECT_ROOT를 추가하고 from cafe-recommend.backend.app.core.config import settings 처럼 사용해야 할 수도 있음
# 여기서는 backend 폴더를 추가하여 from app... 을 사용
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.menu import Menu as MenuModel # SQLAlchemy 모델
from app.crud.menu import menu as menu_crud # CRUD 함수
from app.schemas.menu import MenuUpdate # MenuUpdate 스키마 임포트

# OpenAI API 키 설정
OPENAI_API_KEY = settings.OPENAI_API_KEY # .env 파일에서 로드된 키 사용

# 서버 정보
# SERVER_HOST = socket.gethostbyname(socket.gethostname())  # 로컬 IP 주소 (127.0.1.1)
SERVER_HOST = "116.124.191.174"  # 공용 IP 주소
SERVER_PORT = 15049  # 백엔드 서버 포트
BASE_URL = f"http://{SERVER_HOST}:{SERVER_PORT}"

# 데이터베이스 경로 (절대 경로)
DB_PATH = os.path.join(BACKEND_ROOT, 'cafe_app.db')
print(f"데이터베이스 경로: {DB_PATH}")

# 이미지 저장 경로 (절대 경로)
STATIC_DIR = os.path.join(BACKEND_ROOT, 'static')
IMAGE_DIR = os.path.join(STATIC_DIR, "menu_images")
print(f"이미지 저장 경로: {IMAGE_DIR}")

# DALL-E API 엔드포인트
DALLE_API_URL = "https://api.openai.com/v1/images/generations"

async def generate_image_with_dalle(menu_name: str, menu_description: str) -> Optional[str]:
    """DALL-E를 사용하여 메뉴 이미지를 생성하고 URL을 반환합니다."""
    if not OPENAI_API_KEY:
        print(f"Error for {menu_name}: OpenAI API 키가 설정되지 않았습니다.")
        return None

    prompt = f"A delicious looking, high-quality, photorealistic image of a cafe menu item: '{menu_name}', described as '{menu_description}'. Suitable for a menu display. Clean background."
    
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "response_format": "url",
        "quality": "standard" # standard or hd
    }

    async with httpx.AsyncClient(timeout=120.0) as client: # 타임아웃 증가 (이미지 생성 오래 걸릴 수 있음)
        try:
            response = await client.post(DALLE_API_URL, json=data, headers=headers)
            response.raise_for_status()
            image_data = response.json()
            if image_data.get("data") and len(image_data["data"]) > 0:
                image_url = image_data["data"][0].get("url")
                if image_url:
                    print(f"AI 이미지 생성 성공 for {menu_name}: {image_url}")
                    return image_url
                else:
                    print(f"Error for {menu_name}: 생성된 이미지 URL을 찾을 수 없습니다. 응답: {image_data}")
                    return None
            else:
                print(f"Error for {menu_name}: AI 이미지 데이터가 없습니다. 응답: {image_data}")
                return None
        except httpx.HTTPStatusError as e:
            print(f"Error for {menu_name}: DALL-E API HTTP 오류: {e.response.status_code} - {e.response.text}")
            return None
        except Exception as e:
            print(f"Error for {menu_name}: DALL-E 이미지 생성 중 예외 발생: {e}")
            return None

async def update_all_menu_images():
    """데이터베이스의 모든 메뉴에 대해 AI로 이미지를 생성하고 업데이트합니다."""
    db = SessionLocal()
    try:
        # 모든 메뉴를 대상으로 함
        menus_to_update = db.query(MenuModel).all()
        
        if not menus_to_update:
            print("업데이트할 메뉴가 데이터베이스에 없습니다.")
            return

        print(f"총 {len(menus_to_update)}개의 모든 메뉴에 대한 이미지 생성을 시도합니다.")

        for menu_item in menus_to_update:
            print(f"메뉴 '{menu_item.name}' (ID: {menu_item.id}) 에 대한 이미지 생성/업데이트 중...")
            # 메뉴 설명이 없으면 메뉴 이름을 설명으로 사용
            description_for_prompt = menu_item.description if menu_item.description else menu_item.name
            generated_image_url = await generate_image_with_dalle(menu_item.name, description_for_prompt)
            
            if generated_image_url:
                # 생성된 외부 URL을 MenuUpdate 스키마를 사용하여 저장합니다.
                update_data_schema = MenuUpdate(image_url=generated_image_url)
                
                # CRUDMenu.update의 시그니처에 맞게 호출 변경
                # admin_id는 스크립트에 의한 자동 업데이트이므로 적절한 값을 사용 (예: 0)
                menu_crud.update(db=db, menu=menu_item, menu_in=update_data_schema, admin_id=0) 
                print(f"메뉴 '{menu_item.name}'의 이미지 URL이 업데이트되었습니다: {generated_image_url}")
            else:
                print(f"메뉴 '{menu_item.name}'의 이미지 생성에 실패했습니다.")
            
            await asyncio.sleep(2) # API 요청 간 지연 시간 약간 늘림 (DALL-E rate limit 고려)

    finally:
        db.close()

if __name__ == "__main__":
    print("AI 기반 메뉴 이미지 일괄 업데이트 스크립트 시작...")
    # 스크립트 실행 시 필요한 환경변수(.env)가 로드되도록 보장해야 함
    # (예: 프로젝트 루트에서 python -m backend.scripts.update_menu_images_with_ai 실행)
    # 또는 이 스크립트 자체에서 dotenv를 사용하여 .env 로드
    from dotenv import load_dotenv
    # PROJECT_ROOT가 이미 Path 객체이므로 바로 사용
    env_path = PROJECT_ROOT / '.env'
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        print(f".env 파일 로드 성공: {env_path}")
        # API 키 재설정 (dotenv로 로드된 후)
        OPENAI_API_KEY = settings.OPENAI_API_KEY # settings가 다시 초기화되거나, 여기서 직접 os.getenv 사용
        if not OPENAI_API_KEY: # settings가 .env 로드 전에 초기화 되었다면, 직접 os.getenv 사용
            OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
        if not OPENAI_API_KEY:
            print("dotenv 로드 후에도 OpenAI API 키를 찾을 수 없습니다.")
        else:
            print("OpenAI API 키가 성공적으로 설정되었습니다.")
    else:
        print(f"경고: .env 파일을 찾을 수 없습니다. ({env_path})")

    if not OPENAI_API_KEY:
        print("OpenAI API 키가 설정되지 않아 스크립트를 실행할 수 없습니다. .env 파일을 확인해주세요.")
    else:
        asyncio.run(update_all_menu_images())
    print("AI 기반 메뉴 이미지 일괄 업데이트 스크립트 종료.") 