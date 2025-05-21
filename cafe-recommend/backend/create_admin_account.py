import sqlite3
from passlib.context import CryptContext
import os

# 비밀번호 해싱 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_admin_account():
    # 현재 경로 출력
    current_dir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(current_dir, 'cafe_app.db')
    print(f"현재 디렉토리: {current_dir}")
    print(f"데이터베이스 경로: {db_path}")
    
    # 데이터베이스 연결
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # admins 테이블 존재 확인
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            # admins 테이블 생성
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email VARCHAR NOT NULL UNIQUE,
                    hashed_password VARCHAR NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    is_superuser BOOLEAN DEFAULT 0
                )
            """)
            print("admins 테이블 생성됨")
        
        # 새 비밀번호 설정
        email = "admin@test.com"
        password = "admin1234"  # 비밀번호 변경
        hashed_password = get_password_hash(password)
        
        # 기존 계정 체크
        cursor.execute("SELECT id FROM admins WHERE email = ?", (email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            # 기존 계정이 있으면 업데이트
            cursor.execute(
                "UPDATE admins SET hashed_password = ?, is_superuser = 1, is_active = 1 WHERE email = ?",
                (hashed_password, email)
            )
            print(f"기존 계정 '{email}' 업데이트 완료")
        else:
            # 새 계정 생성
            cursor.execute(
                "INSERT INTO admins (email, hashed_password, is_superuser, is_active) VALUES (?, ?, 1, 1)",
                (email, hashed_password)
            )
            print(f"새 관리자 계정 '{email}' 생성 완료")
        
        # 변경사항 저장
        conn.commit()
        
        # 관리자 계정 확인
        cursor.execute("SELECT id, email, is_superuser, is_active FROM admins")
        admins = cursor.fetchall()
        
        print("\n등록된 관리자 계정:")
        for admin in admins:
            print(f"ID: {admin[0]}, 이메일: {admin[1]}, is_superuser: {admin[2]}, is_active: {admin[3]}")
        
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_admin_account() 