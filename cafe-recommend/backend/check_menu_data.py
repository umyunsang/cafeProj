#!/usr/bin/env python3

import os
import sqlite3
from pathlib import Path

# 절대 경로 설정
BACKEND_ROOT = Path("/home/student_15030/cafeProj/cafe-recommend/backend")
DB_PATH = BACKEND_ROOT / "cafe_app.db"

def check_menu_data():
    """데이터베이스의 메뉴 데이터를 확인합니다."""
    if not DB_PATH.exists():
        print(f"데이터베이스 파일이 존재하지 않습니다: {DB_PATH}")
        return False
    
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        # 메뉴 테이블 존재 확인
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='menus'")
        if not cursor.fetchone():
            print("메뉴 테이블이 존재하지 않습니다.")
            return False
        
        # 메뉴 데이터 조회
        cursor.execute("SELECT id, name, description, price, category, image_url FROM menus")
        menus = cursor.fetchall()
        
        if not menus:
            print("데이터베이스에 메뉴 데이터가 없습니다.")
            return False
        
        print(f"총 {len(menus)}개의 메뉴가 데이터베이스에 저장되어 있습니다:")
        print("-" * 80)
        
        for menu in menus:
            menu_id, name, description, price, category, image_url = menu
            print(f"ID: {menu_id}")
            print(f"이름: {name}")
            print(f"설명: {description}")
            print(f"가격: {price}원")
            print(f"카테고리: {category}")
            print(f"이미지 URL: {image_url if image_url else '없음'}")
            print("-" * 80)
        
        # 이미지가 없는 메뉴 개수 확인
        cursor.execute("SELECT COUNT(*) FROM menus WHERE image_url IS NULL OR image_url = ''")
        no_image_count = cursor.fetchone()[0]
        print(f"\n이미지가 없는 메뉴: {no_image_count}개")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"데이터베이스 확인 중 오류 발생: {e}")
        return False

if __name__ == "__main__":
    print("메뉴 데이터 확인 중...")
    check_menu_data() 