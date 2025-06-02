#!/usr/bin/env python3

import os
import sys
from passlib.context import CryptContext
import sqlite3

# 프로젝트 루트를 파이썬 경로에 추가
sys.path.insert(0, '/home/student_15030/cafeProj/cafe-recommend/backend')

from app.core.config import settings

def create_admin_account():
    """관리자 계정 생성"""
    
    # 비밀번호 해시 생성
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash("admin1234")
    
    # 데이터베이스 경로
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    print(f"데이터베이스 경로: {db_path}")
    
    try:
        # 데이터베이스 연결
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # admins 테이블 생성 (없는 경우)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                is_superuser BOOLEAN NOT NULL DEFAULT 1,
                is_active BOOLEAN NOT NULL DEFAULT 1
            )
        """)
        
        # 기존 관리자 확인
        cursor.execute("SELECT email FROM admins WHERE email = ?", ("admin@example.com",))
        existing = cursor.fetchone()
        
        if existing:
            print("관리자 계정이 이미 존재합니다: admin@example.com")
        else:
            # 관리자 계정 생성
            cursor.execute("""
                INSERT INTO admins (email, hashed_password, is_superuser, is_active)
                VALUES (?, ?, ?, ?)
            """, ("admin@example.com", hashed_password, True, True))
            
            conn.commit()
            print("✅ 관리자 계정 생성 완료: admin@example.com / admin1234")
        
        # admin@test.com도 생성
        cursor.execute("SELECT email FROM admins WHERE email = ?", ("admin@test.com",))
        existing = cursor.fetchone()
        
        if not existing:
            cursor.execute("""
                INSERT INTO admins (email, hashed_password, is_superuser, is_active)
                VALUES (?, ?, ?, ?)
            """, ("admin@test.com", hashed_password, True, True))
            
            conn.commit()
            print("✅ 추가 관리자 계정 생성 완료: admin@test.com / admin1234")
        
        # 생성된 관리자 목록 확인
        cursor.execute("SELECT id, email, is_superuser, is_active FROM admins")
        admins = cursor.fetchall()
        
        print("\n📋 관리자 계정 목록:")
        for admin in admins:
            print(f"  ID: {admin[0]}, Email: {admin[1]}, Superuser: {admin[2]}, Active: {admin[3]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🔧 관리자 계정 생성 스크립트 실행...")
    success = create_admin_account()
    if success:
        print("\n✅ 관리자 계정 생성이 완료되었습니다!")
        print("로그인 정보:")
        print("  이메일: admin@example.com 또는 admin@test.com")
        print("  비밀번호: admin1234")
    else:
        print("\n❌ 관리자 계정 생성에 실패했습니다.") 