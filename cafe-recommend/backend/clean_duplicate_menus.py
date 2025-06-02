#!/usr/bin/env python3
"""
중복 메뉴 제거 및 만료된 이미지 URL 정리 스크립트
"""

import sqlite3
import sys
from pathlib import Path
from collections import defaultdict

# 프로젝트 루트 디렉토리 추가
project_root = Path(__file__).parent
sys.path.append(str(project_root))

def clean_duplicate_menus():
    """중복된 메뉴 이름 정리"""
    # 데이터베이스 연결
    db_path = project_root / 'cafe_app.db'
    if not db_path.exists():
        print(f"❌ 데이터베이스 파일을 찾을 수 없습니다: {db_path}")
        return
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        print("🔍 데이터베이스 분석 중...")
        
        # 1. 현재 메뉴 상태 확인
        cursor.execute("SELECT COUNT(*) FROM menus")
        total_menus = cursor.fetchone()[0]
        print(f"📊 현재 총 메뉴 수: {total_menus}개")
        
        # 2. 중복 메뉴 찾기
        cursor.execute("""
            SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
            FROM menus 
            GROUP BY name 
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        """)
        
        duplicates = cursor.fetchall()
        
        if duplicates:
            print(f"\n🔍 중복된 메뉴 발견: {len(duplicates)}개 그룹")
            
            removed_count = 0
            for name, count, ids in duplicates:
                id_list = [int(x) for x in ids.split(',')]
                print(f"\n📝 '{name}': {count}개 중복 (ID: {id_list})")
                
                # 가장 낮은 ID를 남기고 나머지 삭제
                keep_id = min(id_list)
                remove_ids = [x for x in id_list if x != keep_id]
                
                print(f"  ✅ 유지: ID {keep_id}")
                print(f"  🗑️  삭제: ID {remove_ids}")
                
                # 중복 메뉴 삭제
                for remove_id in remove_ids:
                    cursor.execute("DELETE FROM menus WHERE id = ?", (remove_id,))
                    removed_count += 1
            
            print(f"\n🗑️  총 {removed_count}개 중복 메뉴 삭제 완료")
        else:
            print("✅ 중복된 메뉴가 없습니다!")
        
        # 3. 만료된 DALL-E URL 정리
        print(f"\n🔍 만료된 이미지 URL 정리 중...")
        
        cursor.execute("""
            SELECT id, name, image_url 
            FROM menus 
            WHERE image_url IS NOT NULL 
            AND image_url LIKE '%oaidalleapiprodscus.blob.core.windows.net%'
        """)
        
        expired_images = cursor.fetchall()
        
        if expired_images:
            print(f"📥 만료된 DALL-E URL {len(expired_images)}개 발견")
            
            for menu_id, menu_name, image_url in expired_images:
                cursor.execute("""
                    UPDATE menus 
                    SET image_url = NULL 
                    WHERE id = ?
                """, (menu_id,))
                print(f"  🧹 {menu_name} (ID: {menu_id}) - URL 제거")
            
            print(f"✅ {len(expired_images)}개 만료된 URL 정리 완료")
        else:
            print("✅ 만료된 URL이 없습니다!")
        
        # 4. 최종 상태 확인
        cursor.execute("SELECT COUNT(*) FROM menus")
        final_count = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT category, COUNT(*) 
            FROM menus 
            GROUP BY category 
            ORDER BY category
        """)
        category_stats = cursor.fetchall()
        
        # 변경사항 저장
        conn.commit()
        
        print(f"\n🎉 정리 완료!")
        print(f"📊 최종 메뉴 수: {final_count}개 (제거: {total_menus - final_count}개)")
        print(f"\n📋 카테고리별 메뉴 수:")
        for category, count in category_stats:
            print(f"  - {category}: {count}개")
        
        # 5. 정리된 메뉴 목록 출력
        print(f"\n📃 정리된 메뉴 목록:")
        cursor.execute("""
            SELECT id, name, category, price, 
                   CASE WHEN image_url IS NULL THEN '기본이미지' ELSE '이미지있음' END as image_status
            FROM menus 
            ORDER BY category, id
        """)
        
        all_menus = cursor.fetchall()
        current_category = None
        
        for menu_id, name, category, price, image_status in all_menus:
            if category != current_category:
                print(f"\n  [{category}]")
                current_category = category
            print(f"    {menu_id:2d}. {name:<20} {price:>6,}원 ({image_status})")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        conn.rollback()
    finally:
        conn.close()

def main():
    print("🧹 카페 메뉴 데이터베이스 정리 시작...")
    clean_duplicate_menus()
    print(f"\n✨ 모든 정리 작업이 완료되었습니다!")

if __name__ == "__main__":
    main() 