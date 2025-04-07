import sqlite3
import os

# 데이터베이스 파일 경로 설정 (애플리케이션 설정에 맞게 수정)
db_path = os.path.join("cafe-recommend", "backend", "app.db")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 컬럼 추가 SQL 실행
    cursor.execute("ALTER TABLE orders ADD COLUMN payment_key VARCHAR;")

    conn.commit()
    print("데이터베이스 'orders' 테이블에 'payment_key' 컬럼이 성공적으로 추가되었습니다.")

except sqlite3.Error as e:
    # 컬럼이 이미 존재하는 경우 오류 무시
    if "duplicate column name" in str(e).lower():
        print("'payment_key' 컬럼이 이미 존재합니다.")
    else:
        print(f"데이터베이스 오류 발생: {e}")
finally:
    if conn:
        conn.close() 