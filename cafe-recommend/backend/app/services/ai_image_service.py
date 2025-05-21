import httpx
from typing import Optional
import os

from app.core.config import settings

OPENAI_API_KEY = settings.OPENAI_API_KEY
DALLE_API_URL = "https://api.openai.com/v1/images/generations"

async def generate_image_with_dalle(menu_name: str, menu_description: Optional[str]) -> Optional[str]:
    """DALL-E를 사용하여 메뉴 이미지를 생성하고 URL을 반환합니다."""
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