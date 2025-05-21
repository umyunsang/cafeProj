from typing import Dict, Tuple, Set, List, Optional, Callable
from datetime import datetime, timedelta
import time
from fastapi import Request, HTTPException, status
from fastapi import Depends
from pydantic import BaseModel
from app.core.config import settings
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

# 메모리 기반 레이트 리미팅 저장소
class MemoryStore:
    def __init__(self):
        self.requests: Dict[str, List[float]] = {}
        self.blocked_ips: Dict[str, datetime] = {}
        
    def add_request(self, key: str, timestamp: float):
        """요청 기록 추가"""
        if key not in self.requests:
            self.requests[key] = []
        self.requests[key].append(timestamp)
        
    def get_requests(self, key: str, window: float) -> List[float]:
        """일정 시간 창 내의 요청 기록 조회"""
        now = time.time()
        if key not in self.requests:
            return []
            
        # 창 내의 요청만 필터링
        recent_reqs = [t for t in self.requests[key] if now - t <= window]
        
        # 저장소 업데이트 (오래된 요청 제거)
        self.requests[key] = recent_reqs
        
        return recent_reqs
        
    def is_blocked(self, key: str) -> bool:
        """IP가 차단되었는지 확인"""
        if key not in self.blocked_ips:
            return False
            
        # 차단 시간이 지났는지 확인
        if datetime.now() > self.blocked_ips[key]:
            del self.blocked_ips[key]
            return False
            
        return True
        
    def block_ip(self, key: str, duration_minutes: int):
        """IP 차단"""
        self.blocked_ips[key] = datetime.now() + timedelta(minutes=duration_minutes)

# 메모리 저장소 인스턴스 생성
store = MemoryStore()

# 레이트 리미팅 설정 모델
class RateLimitSettings(BaseModel):
    limit: int = 60  # 기본 제한: 분당 60 요청
    window: float = 60.0  # 시간 창: 60초 (1분)
    block_duration: int = 10  # 차단 기간: 10분
    
    # 적응형 제한 설정
    adaptive: bool = False  # 적응형 제한 사용 여부
    adaptive_window: float = 300.0  # 적응형 창: 5분
    adaptive_limit_multiplier: float = 1.5  # 적응형 제한 승수
    
    # 서로 다른 엔드포인트에 대한 다른 제한 설정
    endpoints: Dict[str, Dict] = {
        "default": {"limit": 60, "window": 60.0},
        "/api/chat": {"limit": 20, "window": 60.0},  # AI 챗봇은 더 낮은 제한
        "/api/admin": {"limit": 100, "window": 60.0},  # 관리자 API는 더 높은 제한
    }
    
    # 특정 IP를 항상 허용하는 화이트리스트
    whitelist: Set[str] = {"127.0.0.1", "::1"}

# 기본 레이트 리미팅 설정
rate_limit_settings = RateLimitSettings()

# 요청 레이트 리미팅 의존성
async def rate_limit(request: Request, settings: RateLimitSettings = rate_limit_settings):
    """
    요청을 레이트 리미팅하는 의존성 함수
    
    IP 주소당 일정 시간 동안의 요청 수를 제한합니다.
    제한을 초과하면 HTTP 429 (Too Many Requests) 오류를 발생시킵니다.
    """
    # 클라이언트 IP 가져오기 
    client_ip = request.client.host if request.client else "unknown"
    
    # 화이트리스트 체크
    if client_ip in settings.whitelist:
        return
        
    # 차단된 IP 체크
    if store.is_blocked(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"너무 많은 요청이 발생했습니다. {settings.block_duration}분 동안 차단됩니다.",
            headers={"Retry-After": str(settings.block_duration * 60)}  # 초 단위로 변환
        )
    
    # 현재 경로에 맞는 제한 설정 찾기
    path = request.url.path
    endpoint_settings = None
    
    # 가장 구체적인 경로 매칭 찾기
    for endpoint, config in settings.endpoints.items():
        if path.startswith(endpoint):
            if not endpoint_settings or len(endpoint) > len(endpoint_settings[0]):
                endpoint_settings = (endpoint, config)
    
    # 매칭된 설정이 없으면 기본값 사용
    if not endpoint_settings:
        limit = settings.limit
        window = settings.window
    else:
        limit = endpoint_settings[1]["limit"]
        window = endpoint_settings[1]["window"]
    
    # 지정된 시간 창 동안의 요청 수 계산
    now = time.time()
    store.add_request(client_ip, now)
    request_count = len(store.get_requests(client_ip, window))
    
    # 적응형 제한 사용 시 추가 처리
    if settings.adaptive:
        adaptive_request_count = len(store.get_requests(client_ip, settings.adaptive_window))
        adaptive_limit = int(limit * settings.adaptive_limit_multiplier)
        
        # 더 긴 시간 창에서 높은 요청률을 보이는 경우 차단
        if adaptive_request_count > adaptive_limit:
            store.block_ip(client_ip, settings.block_duration)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"비정상적인 트래픽이 감지되었습니다. {settings.block_duration}분 동안 차단됩니다.",
                headers={"Retry-After": str(settings.block_duration * 60)}  # 초 단위로 변환
            )
    
    # 기본 제한 체크
    if request_count > limit:
        # 제한 초과 시 429 응답
        remaining_time = int(window - (now - store.get_requests(client_ip, window)[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"너무 많은 요청을 보냈습니다. {remaining_time}초 후에 다시 시도하세요.",
            headers={"Retry-After": str(remaining_time)}
        )
        
    # 응답 헤더에 제한 정보 추가를 위한 값 반환
    return {
        "X-RateLimit-Limit": str(limit),
        "X-RateLimit-Remaining": str(max(0, limit - request_count)),
        "X-RateLimit-Reset": str(int(now + window)),
    }

# 레이트 리미팅 미들웨어 클래스
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, settings: RateLimitSettings = rate_limit_settings):
        super().__init__(app)
        self.settings = settings
        
    async def dispatch(self, request: Request, call_next: Callable):
        try:
            # 레이트 리미팅 적용
            rate_limit_info = await rate_limit(request, self.settings)
            
            # 다음 미들웨어 호출
            response = await call_next(request)
            
            # 응답 헤더에 레이트 리미팅 정보 추가
            if rate_limit_info:
                for key, value in rate_limit_info.items():
                    response.headers[key] = value
                    
            return response
            
        except HTTPException as exc:
            # 레이트 리미팅 예외는 그대로 전달
            if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                raise
            
            # 다른 예외는 처리하지 않고 다음 미들웨어로 전달
            return await call_next(request) 