import sqlite3
import os

# SQLite 데이터베이스 파일 경로
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cafe_app.db")

def check_table_schema(table_name):
    """테이블 스키마를 확인합니다."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 테이블 존재 여부 확인
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
        if cursor.fetchone():
            # 테이블 스키마 조회
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            print(f"\n=== '{table_name}' 테이블 스키마 ===")
            for col in columns:
                print(f"컬럼: {col[1]}, 타입: {col[2]}, NOT NULL: {col[3]}, 기본값: {col[4]}, PK: {col[5]}")
            
            # 테이블 데이터 확인 (처음 5개만)
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
            rows = cursor.fetchall()
            
            if rows:
                print(f"\n=== '{table_name}' 테이블 데이터 (최대 5개) ===")
                for row in rows:
                    print(row)
            else:
                print(f"\n'{table_name}' 테이블에 데이터가 없습니다.")
        else:
            print(f"\n'{table_name}' 테이블이 존재하지 않습니다.")
    except Exception as e:
        print(f"{table_name} 테이블 조회 오류: {e}")
    finally:
        cursor.close()
        conn.close()

def list_all_tables():
    """모든 테이블 목록을 조회합니다."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 모든 테이블 목록 조회
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print("\n=== 데이터베이스의 모든 테이블 ===")
        for table in tables:
            print(table[0])
        
        return [table[0] for table in tables]
    except Exception as e:
        print(f"테이블 목록 조회 오류: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print(f"데이터베이스 파일 경로: {DB_PATH}")
    
    # 모든 테이블 목록 조회
    tables = list_all_tables()
    
    # 특정 테이블 스키마 확인
    for table in tables:
        if table != 'sqlite_sequence':  # 시스템 테이블은 제외
            check_table_schema(table) 