#!/usr/bin/env python3

import os
import asyncio
import httpx
import sqlite3
from pathlib import Path
import json

# OPENAI API 키 설정 (환경변수에서 가져오기)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# 데이터베이스 경로
SCRIPT_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
BACKEND_ROOT = SCRIPT_DIR.parent
DB_PATH = os.path.join(BACKEND_ROOT, 'cafe_app.db')

# DALL-E API 엔드포인트
DALLE_API_URL = "https://api.openai.com/v1/images/generations"

async def generate_image_with_dalle(menu_name: str, menu_description: str = "") -> str:
    """DALL-E를 사용하여 메뉴 이미지를 생성하고 URL을 반환합니다."""
    if not OPENAI_API_KEY:
        print(f"Error for {menu_name}: OpenAI API 키가 설정되지 않았습니다.")
        return None

    # 한국 카페 메뉴에 맞는 프롬프트 생성
    if not menu_description:
        menu_description = menu_name
    
    prompt = f"A delicious looking, high-quality, photorealistic image of Korean cafe menu item: '{menu_name}', described as '{menu_description}'. Professional food photography style, clean white background, top view or 45-degree angle, suitable for a menu display. Natural lighting, appetizing presentation."
    
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
        "quality": "standard"
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            print(f"🎨 {menu_name} 이미지 생성 중...")
            response = await client.post(DALLE_API_URL, json=data, headers=headers)
            response.raise_for_status()
            image_data = response.json()
            
            if image_data.get("data") and len(image_data["data"]) > 0:
                image_url = image_data["data"][0].get("url")
                if image_url:
                    print(f"✅ {menu_name} 이미지 생성 성공!")
                    print(f"   URL: {image_url}")
                    return image_url
                else:
                    print(f"❌ {menu_name}: 생성된 이미지 URL을 찾을 수 없습니다.")
                    return None
            else:
                print(f"❌ {menu_name}: AI 이미지 데이터가 없습니다.")
                return None
        except httpx.HTTPStatusError as e:
            print(f"❌ {menu_name}: DALL-E API HTTP 오류: {e.response.status_code}")
            print(f"   응답: {e.response.text}")
            return None
        except Exception as e:
            print(f"❌ {menu_name}: 이미지 생성 중 예외 발생: {e}")
            return None

def get_menus_from_db():
    """데이터베이스에서 메뉴 정보를 가져옵니다."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, name, description FROM menus")
        menus = cursor.fetchall()
        
        conn.close()
        return menus
    except Exception as e:
        print(f"❌ 데이터베이스 읽기 오류: {e}")
        return []

def update_menu_image_url(menu_id: int, image_url: str):
    """데이터베이스의 메뉴 이미지 URL을 업데이트합니다."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("UPDATE menus SET image_url = ? WHERE id = ?", (image_url, menu_id))
        conn.commit()
        conn.close()
        print(f"✅ 메뉴 ID {menu_id} 이미지 URL 업데이트 완료")
        return True
    except Exception as e:
        print(f"❌ 데이터베이스 업데이트 오류: {e}")
        return False

async def main():
    """메인 실행 함수"""
    print("🚀 AI 메뉴 이미지 생성 스크립트 시작!")
    print(f"📁 데이터베이스 경로: {DB_PATH}")
    
    # 데이터베이스에서 메뉴 가져오기
    menus = get_menus_from_db()
    
    if not menus:
        print("❌ 데이터베이스에서 메뉴를 찾을 수 없습니다.")
        return
    
    print(f"📋 총 {len(menus)}개의 메뉴 발견")
    
    # 각 메뉴에 대해 이미지 생성
    for menu_id, menu_name, menu_description in menus:
        print(f"\n--- 메뉴 처리: {menu_name} (ID: {menu_id}) ---")
        
        # 이미지 생성
        image_url = await generate_image_with_dalle(menu_name, menu_description or "")
        
        if image_url:
            # 데이터베이스 업데이트
            if update_menu_image_url(menu_id, image_url):
                print(f"✅ {menu_name} 처리 완료!")
            else:
                print(f"❌ {menu_name} 데이터베이스 업데이트 실패")
        else:
            print(f"❌ {menu_name} 이미지 생성 실패")
        
        # API 요청 간 지연 (Rate limit 방지)
        await asyncio.sleep(3)
    
    print("\n🎉 모든 메뉴 이미지 생성 완료!")

if __name__ == "__main__":
    asyncio.run(main()) 