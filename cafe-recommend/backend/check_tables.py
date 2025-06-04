import sqlite3
import os

# 데이터베이스 파일 경로 설정
# 스크립트가 backend 디렉토리에 있다고 가정하고, cafe_app.db는 같은 위치에 있음
db_file = os.path.join(os.path.dirname(__file__), "cafe_app.db")

if not os.path.exists(db_file):
    print(f"데이터베이스 파일을 찾을 수 없습니다: {db_file}")
else:
    try:
        # 데이터베이스 연결
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()

        # 모든 테이블 이름 조회 쿼리
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        if tables:
            print("데이터베이스 내 테이블 목록:")
            for table in tables:
                print(f"- {table[0]}")
        else:
            print("데이터베이스에 테이블이 없습니다.")

    except sqlite3.Error as e:
        print(f"데이터베이스 오류 발생: {e}")
    finally:
        if conn:
            conn.close() 