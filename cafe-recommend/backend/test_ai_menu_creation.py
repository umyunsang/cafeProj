#!/usr/bin/env python3

import requests
import json
import time

# 서버 설정
BASE_URL = "http://116.124.191.174:15049"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin1234"

def login_admin():
    """관리자 로그인"""
    login_data = {
        'username': ADMIN_EMAIL,
        'password': ADMIN_PASSWORD
    }
    
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        data=login_data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"로그인 성공: {token_data['access_token'][:50]}...")
        return token_data['access_token']
    else:
        print(f"로그인 실패: {response.status_code} - {response.text}")
        return None

def create_menu_with_ai_image(token):
    """AI 이미지 생성이 포함된 새 메뉴 생성"""
    menu_data = {
        'name': '라벤더 허니 라떼',
        'description': '은은한 라벤더 향과 달콤한 꿀이 어우러진 특별한 라떼',
        'price': 6800.0,
        'category': '시그니처',
        'is_available': True,
        # image_url을 의도적으로 제공하지 않음 (AI 생성 유도)
    }
    
    headers = {
        'Authorization': f'Bearer {token}',
    }
    
    print("새 메뉴 생성 중... (AI 이미지 생성 포함)")
    response = requests.post(
        f"{BASE_URL}/api/admin/menus",
        data=menu_data,
        headers=headers
    )
    
    if response.status_code == 200:
        menu = response.json()
        print("메뉴 생성 성공!")
        print(f"메뉴 이름: {menu['name']}")
        print(f"이미지 URL: {menu['image_url']}")
        
        # 이미지 URL이 로컬 경로인지 확인
        if menu['image_url'] and menu['image_url'].startswith('/static/menu_images/'):
            print("✓ AI 이미지가 로컬에 저장되었습니다.")
        else:
            print("✗ 이미지가 로컬에 저장되지 않았습니다.")
            
        return menu
    else:
        print(f"메뉴 생성 실패: {response.status_code} - {response.text}")
        return None

if __name__ == "__main__":
    print("AI 이미지 생성 메뉴 테스트 시작...")
    
    # 관리자 로그인
    token = login_admin()
    if not token:
        print("로그인 실패로 테스트 중단")
        exit(1)
    
    # AI 이미지 생성이 포함된 메뉴 생성
    menu = create_menu_with_ai_image(token)
    if menu:
        print("테스트 완료!")
    else:
        print("테스트 실패!") 