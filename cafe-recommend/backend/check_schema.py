import sqlite3
import os

# 현재 스크립트 파일의 디렉토리를 기준으로 DB 파일 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'app.db')

print(f"Connecting to database at: {DB_PATH}")

conn = None
try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("\nFetching schema for 'orders' table...")
    # PRAGMA table_info(table_name) 쿼리 실행
    cursor.execute("PRAGMA table_info(orders);")

    # 결과 가져오기 (컬럼 정보 리스트)
    columns = cursor.fetchall()

    if not columns:
        print("'orders' table not found or is empty.")
    else:
        print("\nColumns in 'orders' table:")
        print("-" * 40)
        print(f"{'CID':<5} {'Name':<20} {'Type':<10} {'Not Null':<10} {'Default':<10} {'PK':<5}")
        print("-" * 40)
        for col in columns:
            cid, name, type, notnull, dflt_value, pk = col
            print(f"{cid:<5} {name:<20} {type:<10} {'YES' if notnull else 'NO':<10} {str(dflt_value):<10} {'YES' if pk else 'NO':<5}")
        print("-" * 40)

        # order_number 컬럼 존재 여부 명시적 확인
        order_number_exists = any(col[1] == 'order_number' for col in columns)
        if order_number_exists:
            print("\n[Check] 'order_number' column exists in the 'orders' table.")
        else:
            print("\n[Check] 'order_number' column DOES NOT exist in the 'orders' table.")

except sqlite3.Error as e:
    print(f"SQLite error: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
finally:
    if conn:
        conn.close()
        print("\nDatabase connection closed.") 