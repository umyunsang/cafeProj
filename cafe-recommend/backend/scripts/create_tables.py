import os
import sys

# 프로젝트 루트 경로 설정 (스크립트 위치: backend/scripts/ 기준으로 backend 폴더가 프로젝트 루트 내에 있다고 가정)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(SCRIPT_DIR)  # backend/
# sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # 이전 방식
sys.path.insert(0, BACKEND_ROOT) # backend 폴더를 sys.path에 추가

from sqlalchemy import create_engine
from app.database import Base # app.db.base 대신 app.database 사용 (Base 정의 위치에 따라)
import app.models # 모든 모델을 로드하기 위함 (테이블 생성 시 필요)
from app.core.config import settings # 설정 로드

# .env 파일에서 데이터베이스 URL 사용
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
if not SQLALCHEMY_DATABASE_URL:
    print("에러: DATABASE_URL이 .env 파일에 설정되지 않았습니다.")
    print("       또는 app.core.config.settings가 .env를 제대로 로드하지 못했습니다.")
    sys.exit(1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
# engine_for_script = create_engine(DATABASE_URL_FOR_SCRIPT, connect_args={"check_same_thread": False})

def create_tables():
    # Base.metadata.create_all(bind=engine_for_script)
    Base.metadata.create_all(bind=engine) # 수정된 engine 사용
    print("데이터베이스 테이블이 생성되었습니다.")
    # print(f"데이터베이스 파일 경로: {DATABASE_URL_FOR_SCRIPT}")
    print(f"데이터베이스 연결 문자열: {SQLALCHEMY_DATABASE_URL}")

if __name__ == "__main__":
    # 스크립트가 올바른 .env 파일을 로드할 수 있도록
    # 프로젝트 루트에서 python -m backend.scripts.create_tables 와 같이 실행하는 것을 권장
    print("데이터베이스 테이블 생성 스크립트 시작...")
    create_tables()
    print("스크립트 완료.") 