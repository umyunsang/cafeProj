#!/usr/bin/env python3

import os
import sys
import sqlite3
from pathlib import Path

# 데이터베이스 경로
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'cafe_app.db'))

def check_menu_images():
    # 데이터베이스 연결
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 메뉴 데이터 조회
    cursor.execute("SELECT id, name, category, image_url FROM menus")
    menus = cursor.fetchall()
    
    print(f"총 {len(menus)}개의 메뉴 정보를 조회했습니다.\n")
    print(f"{'ID':<3} {'이름':<15} {'카테고리':<10} {'이미지 URL'}")
    print("-" * 80)
    
    for menu in menus:
        menu_id = menu['id']
        name = menu['name']
        category = menu['category']
        image_url = menu['image_url'] or '없음'
        
        print(f"{menu_id:<3} {name:<15} {category:<10} {image_url}")
    
    conn.close()

if __name__ == "__main__":
    check_menu_images() 