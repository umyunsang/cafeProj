from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Query, WebSocket, Request as FastAPIRequest
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session
import sqlite3 # sqlite3 임포트 추가

from app import models # crud는 직접 사용하지 않으므로 제거 가능
from app.models.admin import Admin # Admin 모델 import
from app.schemas.token import TokenPayload # TokenPayload 스키마 import (경로 확인 필요)
from app.core import security
from app.core.config import settings as app_settings # 명시적으로 app_settings로 import
from app.db.session import SessionLocal

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{app_settings.API_V1_STR}/login/access-token" # 이 URL도 관리자용으로 변경 필요할 수 있음
)

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_admin(
    # db: Session = Depends(get_db), # SQLAlchemy 세션 주입 제거
    token: str = Depends(reusable_oauth2)
) -> Admin:
    print(f"DEBUG get_current_admin: Received token: {token}") # 토큰 값 로깅 추가
    try:
        payload = jwt.decode(
            token, app_settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        print(f"DEBUG get_current_admin: Decoded payload: {payload}") # 페이로드 로깅 추가
        token_data = TokenPayload(**payload)
    except (jwt.JWTError, ValidationError) as e:
        print(f"DEBUG get_current_admin: Token validation error: {e}") # 오류 로깅 추가
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials (token error)",
        )
    
    user_id_str = token_data.sub
    try:
        user_id = int(user_id_str)
        print(f"DEBUG get_current_admin: Parsed user_id: {user_id}") # user_id 로깅 추가
    except ValueError as e:
        print(f"DEBUG get_current_admin: Invalid user ID format in token: {user_id_str}, Error: {e}") # user_id 변환 오류 로깅 추가
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user ID format in token",
        )

    # sqlite3 직접 사용
    admin_user_data = None
    db_path_full = app_settings.DATABASE_URL
    
    if db_path_full.startswith("sqlite:///"):
        db_path = db_path_full[len("sqlite:///"):]
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            print(f"DEBUG get_current_admin: querying DB {db_path} for admin ID {user_id}") # 디버깅용 로그 유지 또는 강화
            cursor.execute("SELECT id, email, hashed_password, is_active, is_superuser FROM admins WHERE id = ?", (user_id,))
            admin_user_data = cursor.fetchone()
            conn.close()
            print(f"DEBUG get_current_admin: query result from DB: {admin_user_data}") # DB 조회 결과 로깅 추가
        except Exception as e:
            print(f"DEBUG get_current_admin: DB error during query: {e}") # 디버깅용 로그 유지 또는 강화
            # 오류 발생 시에도 admin_user_data는 None으로 유지됨 (아래에서 처리)
            pass # 예외를 발생시키기보다 아래에서 admin_user_data가 None인 경우를 처리

    if not admin_user_data:
        print(f"DEBUG get_current_admin: Admin user not found in DB for id {user_id}") # 사용자 못 찾았을 때 로그 추가
        raise HTTPException(status_code=404, detail=f"Admin user not found for id {user_id} (direct DB access)")
    
    # Admin 모델 객체로 변환
    admin_user = Admin(
        id=admin_user_data[0],
        email=admin_user_data[1],
        hashed_password=admin_user_data[2],
        is_active=bool(admin_user_data[3]),
        is_superuser=bool(admin_user_data[4])
    )
    return admin_user

def get_current_active_admin(
    current_admin: Admin = Depends(get_current_admin),
) -> Admin:
    if not current_admin.is_active:
        print(f"DEBUG get_current_active_admin: Admin user {current_admin.email} (ID: {current_admin.id}) is inactive.") # 비활성 사용자 로그 추가
        raise HTTPException(status_code=400, detail="Inactive admin user")
    # 슈퍼유저 여부도 여기서 확인 가능 (get_current_admin_ws와 유사하게)
    # if not current_admin.is_superuser:
    #     print(f"DEBUG get_current_active_admin: Admin user {current_admin.email} (ID: {current_admin.id}) is not a superuser.") # 슈퍼유저 아닌 경우 로그 추가
    #     raise HTTPException(status_code=403, detail="User is not a superuser")
    print(f"DEBUG get_current_active_admin: Admin user {current_admin.email} (ID: {current_admin.id}) is active.") # 활성 사용자 로그 추가
    return current_admin

async def get_current_admin_ws(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
    # db: Session = Depends(get_db) # SQLAlchemy 세션 주입은 사용 안 함
) -> Optional[Admin]:
    if not token:
        print("WS Auth: Token not provided.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token not provided")
        return None

    try:
        payload = jwt.decode(token, app_settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_data = TokenPayload(**payload)
    except (jwt.JWTError, ValidationError) as e:
        print(f"WS Auth: Token validation error - {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Invalid token: {e}")
        return None
    
    user_id_str = token_data.sub
    try:
        user_id = int(user_id_str)
    except ValueError:
        print(f"WS Auth: Invalid user ID format in token: '{user_id_str}'")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid user ID format")
        return None

    admin_user_data = None
    db_path_full = app_settings.DATABASE_URL
    
    if db_path_full.startswith("sqlite:///"):
        db_path = db_path_full[len("sqlite:///"):]
        # print(f"WS Auth: Connecting to DB: {db_path} for User ID: {user_id}") # 상세 로깅 필요시 활성화
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, hashed_password, is_active, is_superuser FROM admins WHERE id = ?", (user_id,))
            admin_user_data = cursor.fetchone()
            conn.close()
        except Exception as e:
            print(f"WS Auth: DB query error: {e}")
            # 오류 발생 시에도 admin_user_data는 None이 됨
    
    if not admin_user_data:
        print(f"WS Auth: Admin user (ID: {user_id}) not found in DB.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Admin user not found")
        return None
    
    # Admin 모델 객체로 변환
    admin_model_instance = Admin(
        id=admin_user_data[0],
        email=admin_user_data[1],
        hashed_password=admin_user_data[2],
        is_active=bool(admin_user_data[3]),
        is_superuser=bool(admin_user_data[4])
    )
    # print(f"WS Auth: Admin user {admin_model_instance.email} (ID: {admin_model_instance.id}) authenticated.") # 상세 로깅 필요시 활성화
    return admin_model_instance

    # 기존 SQLAlchemy 로직은 일단 주석 처리
    # print(f"WebSocket Auth (deps.py): DB Session Info: bind URL = {str(db.bind.url) if db.bind else 'N/A'}")
    # admin_query = db.query(Admin).filter(Admin.id == user_id)
    # try:
    #     from sqlalchemy.dialects import sqlite
    #     compiled_query = str(admin_query.statement.compile(dialect=sqlite.dialect(), compile_kwargs={"literal_binds": True}))
    #     print(f"WebSocket Auth (deps.py): SQLAlchemy Query (approximate): {compiled_query}")
    # except Exception as e:
    #     print(f"WebSocket Auth (deps.py): Error compiling SQLAlchemy query for logging: {e}")
    # admin_user = admin_query.first()
    # if not admin_user:
    #     print(f"WebSocket Auth (deps.py): Admin user not found in DB for id {user_id} (Query: Admin.id == {user_id}) using SQLAlchemy session.")
    #     await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Admin user not found via SQLAlchemy")
    #     return None
    # return admin_user 

async def get_current_admin_sse(
    request: FastAPIRequest, 
    token_from_query: Optional[str] = Query(None, alias="token") # URL 쿼리 파라미터 'token' 추가
) -> Admin:
    token = None
    auth_header = request.headers.get("Authorization")

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        print(f"DEBUG get_current_admin_sse: Token found in Authorization header.")
    elif token_from_query:
        token = token_from_query
        print(f"DEBUG get_current_admin_sse: Token found in query parameter: {token_from_query}")
    
    if not token:
        print("DEBUG get_current_admin_sse: Token not found in Authorization header or query parameter")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated (token not provided)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # print(f"DEBUG get_current_admin_sse: Received token: {token}") # 아래에서 출처와 함께 로깅하므로 중복 제거 또는 수정
    print(f"DEBUG get_current_admin_sse: Processing token from {'query parameter' if token_from_query else 'Authorization header'}: {token}")
    try:
        payload = jwt.decode(
            token, app_settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        print(f"DEBUG get_current_admin_sse: Decoded payload: {payload}")
        token_data = TokenPayload(**payload)
    except (jwt.JWTError, ValidationError) as e:
        print(f"DEBUG get_current_admin_sse: Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials (token error)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id_str = token_data.sub
    try:
        user_id = int(user_id_str)
        print(f"DEBUG get_current_admin_sse: Parsed user_id: {user_id}")
    except ValueError as e:
        print(f"DEBUG get_current_admin_sse: Invalid user ID format in token: {user_id_str}, Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    admin_user_data = None
    db_path_full = app_settings.DATABASE_URL
    
    if db_path_full.startswith("sqlite:///"):
        db_path = db_path_full[len("sqlite:///"):]
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            print(f"DEBUG get_current_admin_sse: querying DB {db_path} for admin ID {user_id}")
            cursor.execute("SELECT id, email, hashed_password, is_active, is_superuser FROM admins WHERE id = ?", (user_id,))
            admin_user_data = cursor.fetchone()
            conn.close()
            print(f"DEBUG get_current_admin_sse: query result from DB: {admin_user_data}")
        except Exception as e:
            print(f"DEBUG get_current_admin_sse: DB error during query: {e}")
            # 오류 발생 시에도 admin_user_data는 None으로 유지됨
            pass

    if not admin_user_data:
        print(f"DEBUG get_current_admin_sse: Admin user not found in DB for id {user_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Admin user not found for id {user_id}")
    
    admin_user = Admin(
        id=admin_user_data[0],
        email=admin_user_data[1],
        hashed_password=admin_user_data[2],
        is_active=bool(admin_user_data[3]),
        is_superuser=bool(admin_user_data[4])
    )

    if not admin_user.is_active:
        print(f"DEBUG get_current_admin_sse: Admin user {admin_user.email} (ID: {admin_user.id}) is inactive.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive admin user")
    
    # 슈퍼유저 여부는 SSE 엔드포인트의 특성에 따라 결정 (realtime.py에서 이미 current_admin.is_superuser 확인 로직이 있을 수 있음)
    # 여기서는 get_current_active_admin 처럼 is_superuser를 강제하지 않음.
    # 필요하다면 아래 주석 해제:
    # if not admin_user.is_superuser:
    #     print(f"DEBUG get_current_admin_sse: Admin user {admin_user.email} (ID: {admin_user.id}) is not a superuser.")
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not a superuser (SSE)")

    print(f"DEBUG get_current_admin_sse: Admin user {admin_user.email} (ID: {admin_user.id}) authenticated and active (SSE).")
    return admin_user 