#!/usr/bin/env python3

import os
import sys
import sqlite3
import requests
from pathlib import Path

# 데이터베이스 경로
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'cafe_app.db'))

# 백엔드 서버 URL
BACKEND_URL = "http://localhost:15049"

def check_menu_image_urls():
    # 데이터베이스 연결
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 메뉴 데이터 조회
    cursor.execute("SELECT id, name, image_url FROM menus")
    menus = cursor.fetchall()
    
    print(f"총 {len(menus)}개의 메뉴 정보를 조회했습니다.\n")
    print(f"{'ID':<3} {'이름':<15} {'이미지 URL':<50} {'접근 가능':<10}")
    print("-" * 85)
    
    for menu in menus:
        menu_id = menu['id']
        name = menu['name']
        image_url = menu['image_url'] or '없음'
        
        # 이미지 URL 접근 가능 여부 확인
        accessible = False
        if image_url != '없음':
            try:
                # 이미지 URL에 접근 시도
                full_url = f"{BACKEND_URL}{image_url}"
                response = requests.head(full_url, timeout=5)
                accessible = response.status_code == 200
            except Exception as e:
                print(f"이미지 접근 오류: {e}")
        
        status = "✓" if accessible else "✗"
        print(f"{menu_id:<3} {name:<15} {image_url:<50} {status:<10}")
    
    conn.close()

if __name__ == "__main__":
    check_menu_image_urls() 