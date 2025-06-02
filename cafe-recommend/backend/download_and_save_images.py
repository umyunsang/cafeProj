#!/usr/bin/env python3
"""
DALL-E 이미지 다운로드 및 로컬 저장 스크립트
만료된 DALL-E URL들을 다운로드해서 영구 저장
"""

import sqlite3
import requests
import os
import sys
from pathlib import Path
import time
from urllib.parse import urlparse
import hashlib

# 프로젝트 루트 디렉토리 추가
project_root = Path(__file__).parent
sys.path.append(str(project_root))

def download_image(url, save_path):
    """URL에서 이미지를 다운로드해서 저장"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        with open(save_path, 'wb') as f:
            f.write(response.content)
        
        print(f"✅ 이미지 저장 성공: {save_path}")
        return True
        
    except Exception as e:
        print(f"❌ 이미지 다운로드 실패 {url}: {e}")
        return False

def generate_filename(menu_id, menu_name):
    """메뉴 ID와 이름으로 파일명 생성"""
    # 한글 이름을 안전한 파일명으로 변환
    safe_name = "".join(c for c in menu_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
    safe_name = safe_name.replace(' ', '_')
    
    # ID와 이름 조합으로 고유 파일명 생성
    filename = f"menu_{menu_id}_{safe_name}.png"
    return filename

def main():
    # 데이터베이스 연결
    db_path = project_root / 'cafe_app.db'
    if not db_path.exists():
        print(f"❌ 데이터베이스 파일을 찾을 수 없습니다: {db_path}")
        return
    
    # 이미지 저장 디렉토리 설정
    images_dir = project_root / 'static' / 'menu_images'
    images_dir.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # DALL-E URL이 있는 메뉴들 조회
        cursor.execute("""
            SELECT id, name, image_url 
            FROM menus 
            WHERE image_url IS NOT NULL 
            AND image_url LIKE '%oaidalleapiprodscus.blob.core.windows.net%'
            ORDER BY id
        """)
        
        results = cursor.fetchall()
        print(f"📥 DALL-E 이미지가 있는 메뉴 {len(results)}개 발견")
        
        if not results:
            print("⚠️  다운로드할 DALL-E 이미지가 없습니다.")
            return
        
        success_count = 0
        total_count = len(results)
        
        for menu_id, menu_name, image_url in results:
            print(f"\n🔄 처리중: {menu_id}. {menu_name}")
            
            # 파일명 생성
            filename = generate_filename(menu_id, menu_name)
            save_path = images_dir / filename
            
            # 이미지 다운로드
            if download_image(image_url, str(save_path)):
                # 데이터베이스 URL 업데이트 (백엔드에서 서빙할 경로)
                new_url = f"/static/menu_images/{filename}"
                
                cursor.execute("""
                    UPDATE menus 
                    SET image_url = ? 
                    WHERE id = ?
                """, (new_url, menu_id))
                
                print(f"✅ DB 업데이트: {new_url}")
                success_count += 1
            else:
                print(f"⚠️  {menu_name} 이미지 다운로드 실패, 기본 이미지로 설정")
                # 실패한 경우 NULL로 설정하여 기본 이미지 사용
                cursor.execute("""
                    UPDATE menus 
                    SET image_url = NULL 
                    WHERE id = ?
                """, (menu_id,))
            
            # API 요청 제한을 위해 잠시 대기
            time.sleep(0.5)
        
        # 변경사항 저장
        conn.commit()
        
        print(f"\n🎉 완료!")
        print(f"📊 성공: {success_count}/{total_count} 이미지")
        print(f"📁 저장 위치: {images_dir}")
        
        # 저장된 파일 목록 출력
        print(f"\n📋 저장된 이미지 파일들:")
        for img_file in sorted(images_dir.glob("menu_*.png")):
            print(f"  - {img_file.name}")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main() 