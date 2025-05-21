from app.database import SessionLocal
from app.models.user import User
from passlib.context import CryptContext
import sqlite3
import sys

# 비밀번호 해싱 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def test_verify_admin(email="admin@test.com", password="admin1234"):
    """관리자 계정 인증 테스트"""
    # 1. SQLAlchemy ORM으로 사용자 조회
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"ORM: 이메일 '{email}'을 가진 사용자가 없습니다.")
            return False
        
        print(f"ORM: 사용자 찾음 - ID: {user.id}, 이메일: {email}")
        print(f"ORM: is_active: {user.is_active}, is_superuser: {getattr(user, 'is_superuser', '없음')}")
        
        # 비밀번호 확인
        hashed_password = user.hashed_password
        print(f"ORM: 저장된 해시: {hashed_password[:20]}...")
        
        is_valid = verify_password(password, hashed_password)
        print(f"ORM: 비밀번호 확인 결과: {is_valid}")
        
        return is_valid
    finally:
        db.close()

def test_direct_sql():
    """SQLite로 직접 쿼리하여 사용자 확인"""
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    try:
        # 모든 사용자 조회
        cursor.execute("SELECT id, email, name, hashed_password, is_admin, is_active FROM users LIMIT 5")
        users = cursor.fetchall()
        
        print("\nSQLite: 사용자 목록")
        for user in users:
            print(f"ID: {user[0]}, 이메일: {user[1]}, 이름: {user[2]}")
            print(f"해시: {user[3][:20]}...")
            print(f"is_admin: {user[4]}, is_active: {user[5]}")
            print("-----")
            
        # 관리자 계정 검증 시도
        email = "admin@test.com"
        password = "admin1234"
        
        cursor.execute(
            "SELECT id, email, hashed_password FROM users WHERE email = ?", 
            (email,)
        )
        user = cursor.fetchone()
        
        if not user:
            print(f"SQLite: 이메일 '{email}'을 가진 사용자가 없습니다.")
            return
        
        print(f"\nSQLite: 테스트 인증 - ID: {user[0]}, 이메일: {user[1]}")
        print(f"SQLite: 저장된 해시: {user[2][:20]}...")
        
        # 새로운 해시 생성 시도
        new_hash = get_password_hash(password)
        print(f"SQLite: 새 해시: {new_hash[:20]}...")
        
        # 비밀번호 확인 시도
        is_valid = verify_password(password, user[2])
        print(f"SQLite: 저장된 해시로 검증 결과: {is_valid}")
        
    finally:
        conn.close()

def test_direct_db_access_admin():
    """직접 DB 접근을 통한 관리자 계정 비밀번호 확인 테스트"""
    # SQLite 데이터베이스에 직접 연결
    conn = sqlite3.connect('cafe_app.db')
    cursor = conn.cursor()
    
    try:
        # 관리자 계정 검증 시도
        email = "admin@test.com"
        password = "admin1234"
        
        cursor.execute(
            "SELECT id, email, hashed_password FROM users WHERE email = ?", 
            (email,)
        )
        user = cursor.fetchone()
        
        if not user:
            print(f"SQLite: 이메일 '{email}'을 가진 사용자가 없습니다.")
            return
        
        print(f"\nSQLite: 테스트 인증 - ID: {user[0]}, 이메일: {user[1]}")
        print(f"SQLite: 저장된 해시: {user[2][:20]}...")
        
        # 새로운 해시 생성 시도
        new_hash = get_password_hash(password)
        print(f"SQLite: 새 해시: {new_hash[:20]}...")
        
        # 비밀번호 확인 시도
        is_valid = verify_password(password, user[2])
        print(f"SQLite: 저장된 해시로 검증 결과: {is_valid}")
        
    finally:
        conn.close()

if __name__ == "__main__":
    # 커맨드라인에서 받은 인자로 테스트
    if len(sys.argv) > 2:
        email = sys.argv[1]
        password = sys.argv[2]
        print(f"\n=== {email} / {password} 로 테스트 ===")
        result = test_verify_admin(email, password)
        print(f"인증 결과: {'성공' if result else '실패'}")
        sys.exit(0 if result else 1)
    
    print("\n=== ORM 인증 로직 테스트 ===")
    test_verify_admin()
    
    print("\n=== 직접 SQL 인증 테스트 ===")
    test_direct_sql()
    
    print("\n=== 직접 DB 접근을 통한 관리자 계정 비밀번호 확인 테스트 ===")
    test_direct_db_access_admin()
    
    # 수동으로 새 비밀번호 해시 생성
    print("\n=== 새 비밀번호 해시 생성 ===")
    for test_pwd in ["admin1234", "admin"]:
        hashed = get_password_hash(test_pwd)
        print(f"비밀번호 '{test_pwd}' 해시: {hashed}") 