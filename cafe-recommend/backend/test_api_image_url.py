#!/usr/bin/env python3
import requests
import json

def test_api_image_url():
    """API에서 메뉴 데이터와 이미지 URL 확인"""
    try:
        response = requests.get("http://116.124.191.174:15049/api/menus")
        if response.status_code == 200:
            menus = response.json()
            
            print("=== 모든 메뉴의 이미지 URL 확인 ===")
            for menu in menus:
                print(f"ID: {menu['id']}, 이름: {menu['name']}")
                print(f"이미지 URL: {menu.get('image_url', '없음')}")
                print("-" * 50)
                
                # 라벤더 허니 라떼 특별 확인
                if "라벤더" in menu['name']:
                    print("🎯 라벤더 허니 라떼 발견!")
                    print(f"   전체 데이터: {json.dumps(menu, ensure_ascii=False, indent=2)}")
                    
                    # 이미지 URL 접근 테스트
                    if menu.get('image_url'):
                        image_url = f"http://116.124.191.174:15049{menu['image_url']}"
                        print(f"   이미지 URL 테스트: {image_url}")
                        img_response = requests.head(image_url)
                        print(f"   이미지 응답 코드: {img_response.status_code}")
                        if img_response.status_code == 200:
                            print(f"   이미지 크기: {img_response.headers.get('content-length', '알 수 없음')} bytes")
                            print(f"   이미지 타입: {img_response.headers.get('content-type', '알 수 없음')}")
                    print("=" * 70)
        else:
            print(f"API 요청 실패: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    test_api_image_url() 