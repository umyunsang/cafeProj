#!/usr/bin/env python3
"""
정리된 메뉴에 적절한 이미지 할당 스크립트
기존 frontend/public/static/menu_images의 이미지들을 활용
"""

import sqlite3
import sys
from pathlib import Path
import os

# 프로젝트 루트 디렉토리 설정
project_root = Path(__file__).parent
sys.path.append(str(project_root))

# 이미지 매칭 테이블 (메뉴 이름과 이미지 파일명 매칭)
IMAGE_MAPPING = {
    # 커피류
    "아메리카노": "americano.jpg",
    "카페라떼": "latte.jpg", 
    "카푸치노": "cappuccino.jpg",
    "바닐라라떼": "vanilla_latte.jpg",
    "카라멜 마키아토": "latte.jpg",  # 비슷한 이미지 사용
    "아이스 아메리카노": "americano.jpg",
    
    # 차류  
    "그린티 라떼": "green_tea_latte.jpg",
    "얼그레이 티": "green_tea_latte.jpg",  # 비슷한 이미지 사용
    
    # 디저트류
    "치즈케이크": "cheesecake.jpg", 
    "초콜릿 케이크": "chocolate_cake.jpg",
    "블루베리 머핀": "chocolate_cake.jpg",  # 비슷한 이미지 사용
    "크로와상": "croffle.jpg",  # 비슷한 이미지 사용
}

def assign_images_to_menus():
    """메뉴에 이미지 할당"""
    # 데이터베이스 연결
    db_path = project_root / 'cafe_app.db'
    if not db_path.exists():
        print(f"❌ 데이터베이스 파일을 찾을 수 없습니다: {db_path}")
        return
    
    # 프론트엔드 이미지 디렉토리 확인
    frontend_images_dir = project_root.parent / 'frontend' / 'public' / 'static' / 'menu_images'
    print(f"🔍 이미지 디렉토리 확인: {frontend_images_dir}")
    
    if not frontend_images_dir.exists():
        print(f"❌ 프론트엔드 이미지 디렉토리를 찾을 수 없습니다: {frontend_images_dir}")
        return
    
    # 사용 가능한 이미지 파일 확인
    available_images = []
    for ext in ['*.jpg', '*.jpeg', '*.png', '*.svg']:
        available_images.extend(frontend_images_dir.glob(ext))
    
    print(f"📁 사용 가능한 이미지: {len(available_images)}개")
    for img in sorted(available_images):
        print(f"  - {img.name}")
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # 현재 메뉴 목록 조회
        cursor.execute("""
            SELECT id, name, category, image_url 
            FROM menus 
            ORDER BY category, id
        """)
        
        menus = cursor.fetchall()
        print(f"\n📋 처리할 메뉴: {len(menus)}개")
        
        updated_count = 0
        
        for menu_id, menu_name, category, current_image_url in menus:
            print(f"\n🔄 처리중: {menu_id}. {menu_name} ({category})")
            
            # 이미지 매칭
            matched_image = None
            
            # 1. 정확한 이름 매칭
            if menu_name in IMAGE_MAPPING:
                image_filename = IMAGE_MAPPING[menu_name]
                image_path = frontend_images_dir / image_filename
                
                if image_path.exists():
                    matched_image = f"/static/menu_images/{image_filename}"
                    print(f"  ✅ 정확 매칭: {image_filename}")
                else:
                    print(f"  ⚠️  매핑된 이미지 파일이 없음: {image_filename}")
            
            # 2. 키워드 기반 매칭 (정확한 매칭이 없는 경우)
            if not matched_image:
                menu_lower = menu_name.lower()
                
                # 커피 관련 키워드
                if any(keyword in menu_lower for keyword in ['아메리카노', 'americano']):
                    matched_image = "/static/menu_images/americano.jpg"
                    print(f"  🔍 키워드 매칭: americano.jpg")
                elif any(keyword in menu_lower for keyword in ['라떼', 'latte']):
                    matched_image = "/static/menu_images/latte.jpg"
                    print(f"  🔍 키워드 매칭: latte.jpg")
                elif any(keyword in menu_lower for keyword in ['카푸치노', 'cappuccino']):
                    matched_image = "/static/menu_images/cappuccino.jpg"
                    print(f"  🔍 키워드 매칭: cappuccino.jpg")
                elif any(keyword in menu_lower for keyword in ['케이크', 'cake']):
                    matched_image = "/static/menu_images/chocolate_cake.jpg"
                    print(f"  🔍 키워드 매칭: chocolate_cake.jpg")
                elif any(keyword in menu_lower for keyword in ['치즈', 'cheese']):
                    matched_image = "/static/menu_images/cheesecake.jpg"
                    print(f"  🔍 키워드 매칭: cheesecake.jpg")
                else:
                    # 기본 이미지 사용
                    matched_image = "/static/menu_images/default-menu.jpg"
                    print(f"  📷 기본 이미지 사용: default-menu.jpg")
            
            # 데이터베이스 업데이트 (현재 이미지와 다른 경우에만)
            if current_image_url != matched_image:
                cursor.execute("""
                    UPDATE menus 
                    SET image_url = ? 
                    WHERE id = ?
                """, (matched_image, menu_id))
                
                print(f"  💾 DB 업데이트: {matched_image}")
                updated_count += 1
            else:
                print(f"  ⏭️  이미 동일한 이미지가 설정됨")
        
        # 변경사항 저장
        conn.commit()
        
        print(f"\n🎉 이미지 할당 완료!")
        print(f"📊 업데이트된 메뉴: {updated_count}개")
        
        # 최종 결과 확인
        print(f"\n📋 최종 메뉴별 이미지 현황:")
        cursor.execute("""
            SELECT id, name, category, image_url 
            FROM menus 
            ORDER BY category, id
        """)
        
        final_menus = cursor.fetchall()
        current_category = None
        
        for menu_id, name, category, image_url in final_menus:
            if category != current_category:
                print(f"\n  [{category}]")
                current_category = category
            
            image_name = image_url.split('/')[-1] if image_url else '없음'
            print(f"    {menu_id:2d}. {name:<20} -> {image_name}")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        conn.rollback()
    finally:
        conn.close()

def main():
    print("🖼️  메뉴 이미지 할당 시작...")
    assign_images_to_menus()
    print(f"\n✨ 이미지 할당이 완료되었습니다!")

if __name__ == "__main__":
    main() 