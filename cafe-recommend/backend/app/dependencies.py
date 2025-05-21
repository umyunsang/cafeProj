from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from .database import get_db
from .models.admin import Admin
from .core.config import settings
from .core.rate_limiter import rate_limit

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")

async def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증에 실패했습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    admin = db.query(Admin).filter(Admin.email == email).first()
    if admin is None:
        raise credentials_exception
        
    return admin

# API 엔드포인트에 레이트 리미팅을 적용하는 의존성
async def api_rate_limiter(request: Request):
    """
    API 엔드포인트에 레이트 리미팅을 적용하는 의존성 함수
    
    사용 방법:
    ```
    @app.get("/api/endpoint")
    async def some_endpoint(
        rate_limit_info: dict = Depends(api_rate_limiter)
    ):
        # 엔드포인트 로직
        return {"data": "response"}
    ```
    """
    return await rate_limit(request)

# 특별히 높은 요청량을 허용해야 하는 엔드포인트용 의존성
async def high_volume_rate_limiter(request: Request):
    """
    높은 요청량을 처리해야 하는 엔드포인트용 레이트 리미팅
    기본 설정보다 2배 많은 요청을 허용합니다.
    """
    from .core.rate_limiter import RateLimitSettings, rate_limit_settings
    
    # 기본 설정을 복사하여 한도 수정
    custom_settings = RateLimitSettings(
        **rate_limit_settings.dict(),
        limit=rate_limit_settings.limit * 2  # 기본 한도의 2배
    )
    
    return await rate_limit(request, settings=custom_settings)

# 매우 제한적인 레이트 리미팅 (비용이 많이 드는 작업용)
async def strict_rate_limiter(request: Request):
    """
    비용이 많이 드는 작업을 위한 엄격한 레이트 리미팅
    기본 설정보다 더 낮은 요청량을 허용합니다.
    """
    from .core.rate_limiter import RateLimitSettings, rate_limit_settings
    
    # 기본 설정을 복사하여 한도 수정
    custom_settings = RateLimitSettings(
        **rate_limit_settings.dict(),
        limit=max(10, int(rate_limit_settings.limit * 0.3)),  # 기본 한도의 30% (최소 10)
        window=30.0,  # 30초 창
        adaptive=True  # 적응형 제한 활성화
    )
    
    return await rate_limit(request, settings=custom_settings) 