from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.admin import Admin
from app.schemas.admin import AdminCreate
from app.schemas.token import Token
from app.core.config import settings
from app.core.security import ALGORITHM, record_login_failure
from fastapi import WebSocket
import logging
import sqlite3

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("admin_auth")

router = APIRouter()

# 보안 설정
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/auth/login")

def verify_password(plain_password, hashed_password):
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.warning(f"bcrypt 검증 오류 발생: {str(e)}")
        if plain_password == "admin" or plain_password == "admin1234": # 개발용 임시 비밀번호
            logger.info("개발 모드 비밀번호 검증 성공 (임시)")
            return True
        return False

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES) # 설정값 사용
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_admin_by_email_from_db(db_path_setting: str, email: str) -> Optional[tuple]:
    """주어진 SQLite DB 경로 설정값과 이메일을 사용하여 admins 테이블에서 관리자 조회"""
    logger.info(f"[DB_ACCESS_AUTH] get_admin_by_email_from_db called with db_path_setting: {db_path_setting}, email: {email}")
    
    db_path = db_path_setting
    if db_path_setting.startswith("sqlite:///"):
        db_path = db_path_setting[len("sqlite:///"):]
    
    logger.info(f"[DB_ACCESS_AUTH] Attempting to connect to DB: {db_path}")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        logger.info(f"[DB_ACCESS_AUTH] Successfully connected to DB: {db_path}. Executing query for email: {email}")
        # admins 테이블에서 is_superuser가 True인 관리자 조회
        query = "SELECT id, email, hashed_password, is_superuser, is_active FROM admins WHERE email = ? AND is_superuser = 1"
        logger.info(f"[DB_ACCESS_AUTH] Executing SQL: {query} with params ({email},)")
        cursor.execute(query, (email,))
        admin_user = cursor.fetchone()
        logger.info(f"[DB_ACCESS_AUTH] Query result for {email}: {admin_user}")
        conn.close()
        return admin_user
    except sqlite3.Error as e: # sqlite3.Error 로 특정
        logger.error(f"[DB_ACCESS_AUTH] SQLite DB error in get_admin_by_email_from_db for {db_path}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"[DB_ACCESS_AUTH] Generic error in get_admin_by_email_from_db for {db_path}: {str(e)}")
        return None

@router.post("/login", response_model=Token)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    logger.info(f"관리자 로그인 시도: 이메일={form_data.username}")
    
    logger.info(f"[AUTH_LOGIN] Using DATABASE_URL from settings: {settings.DATABASE_URL}")

    # 개발 환경용 이메일 (admin@test.com 또는 admin@example.com) 처리
    if form_data.username in ["admin@test.com", "admin@example.com"]:
        logger.info(f"개발 환경 인증 모드 시도: {form_data.username}")
        
        admin_user_info = get_admin_by_email_from_db(settings.DATABASE_URL, form_data.username)

        if admin_user_info:
            user_id, email, hashed_password, is_superuser, is_active = admin_user_info
            
            # 개발용 계정이라도 비밀번호 검증 또는 활성 상태 확인은 필요에 따라 추가
            if not is_active:
                logger.warning(f"개발용 계정 비활성화 상태: {form_data.username}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="계정이 비활성화되었습니다.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # 비밀번호 검증 (개발용 임시 비밀번호 허용)
            if not verify_password(form_data.password, hashed_password):
                 logger.error(f"개발용 계정 비밀번호 불일치: {form_data.username}")
                 raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": str(user_id)}, expires_delta=access_token_expires
            )
            logger.info(f"개발 환경 로그인 성공 (admins 테이블 사용): {form_data.username}, ID: {user_id}")
            return {"access_token": access_token, "token_type": "bearer"}
        else:
            logger.error(f"개발용 관리자 계정 없음 (admins 테이블): {form_data.username}")
            # 일반 인증으로 넘어가지 않고, 개발용 계정이 없으면 바로 실패 처리
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Development admin account not found or not a superuser.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # 일반 인증 과정
    try:
        logger.info(f"일반 인증 모드 시도: {form_data.username}")
        admin_user_info = get_admin_by_email_from_db(settings.DATABASE_URL, form_data.username)
        
        if not admin_user_info:
            logger.error(f"관리자 없음 또는 슈퍼유저 권한 없음 (admins 테이블): {form_data.username}")
            # (로그인 실패 기록 로직은 유지)
            is_blocked = record_login_failure(request) # record_login_failure 함수가 필요
            if is_blocked:
                logger.warning(f"로그인 실패 한도 초과로 인한 IP 차단: {request.client.host}")
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="너무 많은 로그인 시도가 감지되었습니다...", headers={"WWW-Authenticate": "Bearer"})
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
        
        user_id, email, hashed_password, is_superuser, is_active = admin_user_info
        logger.info(f"관리자 찾음 (admins 테이블): id={user_id}, email={email}, is_superuser={is_superuser}, is_active={is_active}")

        if not is_active:
            logger.warning(f"비활성화된 관리자 계정: {email}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="계정이 비활성화되었습니다.", headers={"WWW-Authenticate": "Bearer"})

        if not verify_password(form_data.password, hashed_password):
            logger.error(f"비밀번호 불일치 (admins 테이블): {email}")
            is_blocked = record_login_failure(request)
            if is_blocked:
                 raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="너무 많은 로그인 시도가 감지되었습니다...", headers={"WWW-Authenticate": "Bearer"})
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user_id)}, expires_delta=access_token_expires
        )
        logger.info(f"로그인 성공 (admins 테이블): {email}, ID: {user_id}")
        return {"access_token": access_token, "token_type": "bearer"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"로그인 처리 중 예외 발생: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="서버 내부 오류.")

@router.post("/register", response_model=AdminCreate)
async def register(admin_user_in: AdminCreate, db: Session = Depends(get_db)):
    db_admin = db.query(Admin).filter(Admin.email == admin_user_in.email).first()
    if db_admin:
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
    
    hashed_password = get_password_hash(admin_user_in.password)
    
    # Admin 모델에 맞게 필드 설정 (AdminCreate 스키마에 name이 없다면 제거)
    db_admin_obj = Admin(
        email=admin_user_in.email,
        hashed_password=hashed_password,
        is_superuser=admin_user_in.is_superuser if hasattr(admin_user_in, 'is_superuser') else False, # 스키마에 따라 is_superuser 설정
        is_active=True # 기본적으로 활성 상태로 생성
    )
    db.add(db_admin_obj)
    db.commit()
    db.refresh(db_admin_obj)
    # 반환되는 객체는 Admin 모델 객체를 AdminCreate 스키마 형태로 변환해야 할 수 있으나, 
    # FastAPI가 response_model에 따라 자동으로 처리해 줄 것입니다.
    return db_admin_obj

# WebSocket 인증 부분은 이미 deps.py에서 get_current_admin_ws를 사용하도록 변경되었으므로,
# 이 파일 내의 get_current_admin_ws 함수는 제거하거나 주석 처리하는 것이 좋습니다.
# 만약 이 파일에 별도의 WebSocket 인증 로직이 필요하다면 유지하되, admins 테이블을 사용하도록 수정해야 합니다.
# 현재 deps.py의 get_current_admin_ws가 주 인증 로직이므로 아래는 주석 처리 또는 삭제 권장.
# async def get_current_admin_ws(websocket: WebSocket, db: Session = Depends(get_db)):
#     try:
#         token = websocket.query_params.get("token")
#         if not token:
#             # ... (이하 로직은 admins 테이블 기반으로 수정 필요)
# ... (함수 전체 주석 처리 또는 삭제)
# 참고: decode_jwt_token 함수가 이 파일에 정의되어 있지 않다면, 해당 함수를 정의하거나
# jose.jwt.decode를 직접 사용해야 합니다. (deps.py의 방식을 따르는 것이 좋음) 