import sqlite3
import os

# SQLite 데이터베이스 파일 경로
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cafe_app.db")

def get_admin_users():
    """사용자 테이블에서 관리자 계정 정보를 직접 SQL로 조회합니다."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 사용자 테이블에서 관리자(is_superuser=1) 계정 조회
        cursor.execute("SELECT id, full_name, email, hashed_password FROM users WHERE is_superuser = 1")
        admin_users = cursor.fetchall()
        
        print("\n=== 사용자 테이블의 관리자 계정 ===")
        if admin_users:
            for admin in admin_users:
                print(f"ID: {admin[0]}, 이름: {admin[1]}, 이메일: {admin[2]}")
                # 프론트엔드 로그인에 표시할 정보
                print(f"관리자 로그인 정보: 이메일 = {admin[2]}, 비밀번호 = (보안상 표시하지 않음)")
        else:
            print("사용자 테이블에 관리자 계정이 없습니다.")
    except Exception as e:
        print(f"사용자 테이블 조회 오류: {e}")
    finally:
        cursor.close()

def get_admin_accounts():
    """관리자 테이블에서 관리자 계정 정보를 직접 SQL로 조회합니다."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 테이블 존재 여부 확인
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'")
        if cursor.fetchone():
            # 관리자 테이블 조회
            cursor.execute("SELECT id, email, hashed_password FROM admins")
            admin_accounts = cursor.fetchall()
            
            print("\n=== 관리자 테이블의 계정 ===")
            if admin_accounts:
                for admin in admin_accounts:
                    print(f"ID: {admin[0]}, 이메일: {admin[1]}")
                    # 프론트엔드 로그인에 표시할 정보
                    print(f"관리자 로그인 정보: 이메일 = {admin[1]}, 비밀번호 = (보안상 표시하지 않음)")
            else:
                print("관리자 테이블에 계정이 없습니다.")
        else:
            print("관리자 테이블이 존재하지 않습니다.")
    except Exception as e:
        print(f"관리자 테이블 조회 오류: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print(f"데이터베이스 파일 경로: {DB_PATH}")
    get_admin_users()
    get_admin_accounts() 