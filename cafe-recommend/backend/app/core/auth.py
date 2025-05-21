from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.core.config import settings
from app.core.security import ALGORITHM
from app.database import get_db
from app.models.user import User

# 로거 설정
logger = logging.getLogger("admin_auth")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")

async def get_current_admin(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증에 실패했습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 요청 정보 로깅
    auth_header = request.headers.get("Authorization")
    logger.info(f"요청 헤더: Authorization={auth_header[:10]}..." if auth_header else "Authorization 헤더 없음")
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("토큰에 sub 클레임이 없습니다.")
            raise credentials_exception
        
        logger.info(f"토큰 검증 성공: user_id={user_id}")
    except JWTError as e:
        logger.error(f"JWT 토큰 디코딩 오류: {str(e)}")
        raise credentials_exception
    
    # 개발 환경에서 admin@test.com용 토큰(user_id=1)인 경우 특별 처리
    if settings.ENVIRONMENT == "development" and user_id == "1":
        logger.info(f"개발 환경 - 관리자 토큰 자동 인정: user_id={user_id}")
        
        # 기존 사용자가 없으면 임시 사용자 객체 생성
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.info(f"개발 환경 - 임시 관리자 객체 생성: user_id={user_id}")
            # 임시 사용자 객체 생성 (DB에 저장되지 않음)
            user = User(
                id=1,
                email="admin@test.com",
                is_superuser=True
            )
        return user
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        logger.warning(f"사용자를 찾을 수 없음: user_id={user_id}")
        raise credentials_exception
    
    # 개발 환경에서는 admin@test.com 계정에 항상 관리자 권한 부여
    if settings.ENVIRONMENT == "development" and user.email == "admin@test.com":
        logger.info(f"개발 환경 관리자 권한 자동 부여: {user.email}")
        return user
    
    if not user.is_superuser:
        logger.warning(f"관리자 권한 없음: user_id={user_id}, email={user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다."
        )
    
    logger.info(f"관리자 인증 성공: user_id={user_id}, email={user.email}")
    return user 