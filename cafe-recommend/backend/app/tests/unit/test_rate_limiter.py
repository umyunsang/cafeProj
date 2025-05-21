"""
레이트 리미터 모듈에 대한 단위 테스트
"""
import pytest
import time
from fastapi import HTTPException
from app.core.rate_limiter import MemoryStore, RateLimitSettings, rate_limit

class TestMemoryStore:
    """MemoryStore 클래스 테스트"""
    
    def test_add_request(self):
        """요청 기록 추가 테스트"""
        store = MemoryStore()
        key = "127.0.0.1"
        timestamp = time.time()
        
        # 요청 추가
        store.add_request(key, timestamp)
        
        # 요청이 추가되었는지 확인
        assert key in store.requests
        assert len(store.requests[key]) == 1
        assert store.requests[key][0] == timestamp
    
    def test_get_requests_empty(self):
        """존재하지 않는 키에 대한 요청 기록 조회 테스트"""
        store = MemoryStore()
        key = "127.0.0.1"
        
        # 존재하지 않는 키에 대한 요청
        requests = store.get_requests(key, 60.0)
        
        # 빈 리스트가 반환되는지 확인
        assert requests == []
    
    def test_get_requests_filtering(self):
        """시간 창에 따른 요청 필터링 테스트"""
        store = MemoryStore()
        key = "127.0.0.1"
        now = time.time()
        
        # 여러 타임스탬프로 요청 추가
        store.add_request(key, now - 120)  # 2분 전 (창 밖)
        store.add_request(key, now - 30)   # 30초 전 (창 안)
        store.add_request(key, now - 10)   # 10초 전 (창 안)
        
        # 1분 창으로 요청 가져오기
        requests = store.get_requests(key, 60.0)
        
        # 창 내의 요청만 반환되는지 확인
        assert len(requests) == 2
        
    def test_is_blocked_not_blocked(self):
        """차단되지 않은 IP 확인 테스트"""
        store = MemoryStore()
        key = "127.0.0.1"
        
        # 차단되지 않은 IP 체크
        assert not store.is_blocked(key)
    
    def test_block_ip(self):
        """IP 차단 테스트"""
        store = MemoryStore()
        key = "127.0.0.1"
        duration = 10  # 10분
        
        # IP 차단
        store.block_ip(key, duration)
        
        # 차단 확인
        assert store.is_blocked(key)
        assert key in store.blocked_ips


class TestRateLimitSettings:
    """RateLimitSettings 클래스 테스트"""
    
    def test_default_settings(self):
        """기본 설정 테스트"""
        settings = RateLimitSettings()
        
        # 기본값 확인
        assert settings.limit == 60
        assert settings.window == 60.0
        assert settings.block_duration == 10
        assert not settings.adaptive
        
    def test_whitelist(self):
        """화이트리스트 테스트"""
        settings = RateLimitSettings()
        
        # 기본 화이트리스트 확인
        assert "127.0.0.1" in settings.whitelist
        assert "::1" in settings.whitelist
        
    def test_endpoint_settings(self):
        """엔드포인트별 설정 테스트"""
        settings = RateLimitSettings()
        
        # 기본 엔드포인트 설정 확인
        assert "/api/chat" in settings.endpoints
        assert settings.endpoints["/api/chat"]["limit"] == 20
        assert settings.endpoints["/api/admin"]["limit"] == 100


@pytest.mark.asyncio
async def test_rate_limit_whitelist(test_request_factory):
    """화이트리스트 IP에 대한 레이트 리밋 테스트"""
    # 화이트리스트 IP로 요청 생성
    request = test_request_factory(client_host="127.0.0.1")
    
    # 레이트 리밋 적용
    result = await rate_limit(request)
    
    # 화이트리스트 IP는 제한 없이 통과해야 함
    assert result is None


@pytest.mark.asyncio
async def test_rate_limit_exceed(test_request_factory):
    """제한 초과 테스트"""
    # 일반 IP로 요청 생성
    request = test_request_factory(client_host="192.168.1.1")
    settings = RateLimitSettings(limit=5, window=60.0)
    
    # 제한 초과시키기
    for _ in range(5):
        result = await rate_limit(request, settings)
        assert result is not None  # 제한 정보 반환
    
    # 제한 초과 시 예외 발생해야 함
    with pytest.raises(HTTPException) as excinfo:
        await rate_limit(request, settings)
    
    # 예외 확인
    assert excinfo.value.status_code == 429


@pytest.mark.asyncio
async def test_rate_limit_different_endpoints(test_request_factory):
    """다른 엔드포인트에 대한 다른 제한 테스트"""
    # 채팅 API 요청 생성
    chat_request = test_request_factory(url="/api/chat")
    
    # 관리자 API 요청 생성
    admin_request = test_request_factory(url="/api/admin")
    
    # 채팅 API 요청에 대한 레이트 리밋 정보
    chat_result = await rate_limit(chat_request)
    
    # 관리자 API 요청에 대한 레이트 리밋 정보
    admin_result = await rate_limit(admin_request)
    
    # 채팅 API는 더 낮은 제한을 가져야 함
    assert int(chat_result["X-RateLimit-Limit"]) == 20
    
    # 관리자 API는 더 높은 제한을 가져야 함
    assert int(admin_result["X-RateLimit-Limit"]) == 100 