from fastapi import Request, Response, Depends
from fastapi.security import APIKeyCookie
from typing import Optional, Dict, Any
import uuid
import json
from datetime import datetime, timedelta
from jose import jwt
from app.core.config import settings

# 세션 쿠키 이름
SESSION_COOKIE_NAME = "cafe_session"
SESSION_ID_COOKIE = "cafe_session_id"

# 쿠키 보안 설정
COOKIE_SETTINGS = {
    "httponly": True,
    "secure": settings.SECURE_COOKIES,
    "samesite": "lax",
    "max_age": 30 * 24 * 60 * 60  # 30일
}

# JWT 인코딩 설정
JWT_SECRET = settings.SECRET_KEY
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION = timedelta(days=30)

# 세션 데이터 인터페이스
class SessionData:
    def __init__(self, session_id: str = None, data: Dict[str, Any] = None):
        self.session_id = session_id or str(uuid.uuid4())
        self.data = data or {}
        self.created_at = datetime.now()
        self.last_accessed = datetime.now()

    def __getitem__(self, key: str) -> Any:
        return self.data.get(key)
    
    def __setitem__(self, key: str, value: Any) -> None:
        self.data[key] = value
        self.last_accessed = datetime.now()
    
    def get(self, key: str, default: Any = None) -> Any:
        return self.data.get(key, default)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "data": self.data,
            "created_at": self.created_at.isoformat(),
            "last_accessed": self.last_accessed.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SessionData":
        session = cls(
            session_id=data.get("session_id"),
            data=data.get("data", {})
        )
        if "created_at" in data and isinstance(data["created_at"], str):
            session.created_at = datetime.fromisoformat(data["created_at"])
        if "last_accessed" in data and isinstance(data["last_accessed"], str):
            session.last_accessed = datetime.fromisoformat(data["last_accessed"])
        return session

# 세션 관리자
class SessionManager:
    def __init__(self):
        self.cookie_security = APIKeyCookie(name=SESSION_ID_COOKIE, auto_error=False)
    
    async def get_session_from_cookie(self, request: Request) -> SessionData:
        """요청의 쿠키에서 세션 데이터 추출"""
        session_cookie = request.cookies.get(SESSION_COOKIE_NAME)
        session_id = request.cookies.get(SESSION_ID_COOKIE)
        
        if not session_id:
            # 새 세션 생성
            return SessionData()
        
        try:
            if session_cookie:
                # JWT 디코드
                payload = jwt.decode(session_cookie, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                if isinstance(payload, dict) and "data" in payload:
                    # 세션 데이터 복원
                    session = SessionData.from_dict(payload["data"])
                    if session.session_id == session_id:
                        return session
        except Exception as e:
            print(f"세션 디코딩 오류: {e}")
        
        # 세션 쿠키가 없거나 유효하지 않은 경우 새 세션 생성
        return SessionData()
    
    def save_session(self, response: Response, session: SessionData) -> None:
        """세션 데이터를 쿠키에 저장"""
        try:
            session_dict = session.to_dict()
            
            # JWT 인코딩
            payload = {
                "exp": datetime.utcnow() + JWT_EXPIRATION,
                "data": session_dict
            }
            session_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            # 쿠키 저장
            response.set_cookie(SESSION_COOKIE_NAME, session_jwt, **COOKIE_SETTINGS)
            response.set_cookie(SESSION_ID_COOKIE, session.session_id, **COOKIE_SETTINGS)
        except Exception as e:
            print(f"세션 저장 오류: {e}")
    
    def clear_session(self, response: Response) -> None:
        """세션 쿠키 삭제"""
        response.delete_cookie(SESSION_COOKIE_NAME)
        response.delete_cookie(SESSION_ID_COOKIE)

# 전역 세션 관리자
session_manager = SessionManager()

# FastAPI 의존성 함수
async def get_session(request: Request) -> SessionData:
    """요청에서 세션 데이터 가져오기"""
    return await session_manager.get_session_from_cookie(request)

# 세션 의존성으로 사용자 ID 가져오기
async def get_user_id_from_session(
    session: SessionData = Depends(get_session),
) -> Optional[str]:
    """세션에서 사용자 ID 추출"""
    return session.get("user_id") 