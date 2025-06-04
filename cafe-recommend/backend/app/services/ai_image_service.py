import httpx
from typing import Optional
import os
import time
from pathlib import Path

from app.core.config import settings

OPENAI_API_KEY = settings.OPENAI_API_KEY
DALLE_API_URL = "https://api.openai.com/v1/images/generations"

# 이미지 저장 경로 설정
STATIC_DIR = settings.STATIC_DIR
IMAGE_DIR = os.path.join(STATIC_DIR, "menu_images")

# 이미지 디렉토리 생성
os.makedirs(IMAGE_DIR, exist_ok=True)

async def download_and_save_image(image_url: str, filename: str) -> Optional[str]:
    """이미지를 다운로드하여 로컬에 저장하고 로컬 URL을 반환합니다."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(image_url)
            response.raise_for_status()
            
            # 이미지 파일로 저장
            image_path = os.path.join(IMAGE_DIR, filename)
            with open(image_path, 'wb') as f:
                f.write(response.content)
            
            # 로컬 URL 반환
            local_url = f"/static/menu_images/{filename}"
            print(f"이미지 저장 완료: {image_path}")
            return local_url
            
    except Exception as e:
        print(f"이미지 다운로드 실패: {e}")
        return None

async def generate_image_with_dalle(menu_name: str, menu_description: Optional[str]) -> Optional[str]:
    """DALL-E를 사용하여 메뉴 이미지를 생성하고 로컬에 저장한 후 URL을 반환합니다."""
    if not OPENAI_API_KEY:
        print(f"Error for {menu_name}: OpenAI API 키가 설정되지 않았습니다.")
        return None

    description_for_prompt = menu_description if menu_description else menu_name
    prompt = f"A delicious looking, high-quality, photorealistic image of a cafe menu item: '{menu_name}', described as '{description_for_prompt}'. Suitable for a menu display. Clean background."
    
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024", # 스크립트와 동일하게 설정
        "response_format": "url",
        "quality": "standard" # 스크립트와 동일하게 설정
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(DALLE_API_URL, json=data, headers=headers)
            response.raise_for_status()
            image_data = response.json()
            if image_data.get("data") and len(image_data["data"]) > 0:
                generated_image_url = image_data["data"][0].get("url")
                if generated_image_url:
                    print(f"AI 이미지 생성 성공 for {menu_name}: {generated_image_url}")
                    
                    # 파일명 생성 (메뉴 이름을 안전한 파일명으로 변환)
                    safe_name = menu_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
                    filename = f"{safe_name}_{int(time.time())}.png"
                    
                    # 이미지 다운로드 및 저장
                    local_url = await download_and_save_image(generated_image_url, filename)
                    return local_url
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