"""
의존성 모듈에 대한 단위 테스트
"""
import pytest
from fastapi import HTTPException
from app.dependencies import (
    api_rate_limiter,
    high_volume_rate_limiter,
    strict_rate_limiter,
)


@pytest.mark.asyncio
async def test_api_rate_limiter(test_request_factory):
    """기본 API 레이트 리미터 테스트"""
    # 일반 요청에 대한 레이트 리미팅 테스트
    request = test_request_factory(url="/api/test")
    
    # 레이트 리미팅 적용 결과
    result = await api_rate_limiter(request)
    
    # 결과는 레이트 리미트 정보를 담은 딕셔너리여야 함
    assert isinstance(result, dict)
    assert "X-RateLimit-Limit" in result
    assert "X-RateLimit-Remaining" in result
    assert "X-RateLimit-Reset" in result
    
    # 기본 제한은 60이어야 함
    assert int(result["X-RateLimit-Limit"]) == 60


@pytest.mark.asyncio
async def test_high_volume_rate_limiter(test_request_factory):
    """높은 요청량 처리용 레이트 리미터 테스트"""
    # 일반 요청에 대한 레이트 리미팅 테스트
    request = test_request_factory(url="/api/high-volume")
    
    # 레이트 리미팅 적용 결과
    result = await high_volume_rate_limiter(request)
    
    # 결과는 레이트 리미트 정보를 담은 딕셔너리여야 함
    assert isinstance(result, dict)
    assert "X-RateLimit-Limit" in result
    
    # 제한은 기본의 2배(120)여야 함
    assert int(result["X-RateLimit-Limit"]) == 120


@pytest.mark.asyncio
async def test_strict_rate_limiter(test_request_factory):
    """엄격한 레이트 리미터 테스트"""
    # 일반 요청에 대한 레이트 리미팅 테스트
    request = test_request_factory(url="/api/strict")
    
    # 레이트 리미팅 적용 결과
    result = await strict_rate_limiter(request)
    
    # 결과는 레이트 리미트 정보를 담은 딕셔너리여야 함
    assert isinstance(result, dict)
    assert "X-RateLimit-Limit" in result
    
    # 기본 한도(60)의 30%인 18 이하여야 함 (최소 10)
    assert int(result["X-RateLimit-Limit"]) <= 18
    assert int(result["X-RateLimit-Limit"]) >= 10


@pytest.mark.asyncio
async def test_rate_limiter_whitelisted_ip(test_request_factory):
    """화이트리스트 IP에 대한 레이트 리미터 테스트"""
    # 화이트리스트 IP(127.0.0.1)로 요청 생성
    request = test_request_factory(client_host="127.0.0.1")
    
    # 각 레이트 리미터에 대해 테스트
    assert await api_rate_limiter(request) is None  # 화이트리스트 IP는 제한 없음
    assert await high_volume_rate_limiter(request) is None
    assert await strict_rate_limiter(request) is None


@pytest.mark.asyncio
async def test_rate_limiter_different_endpoints(test_request_factory):
    """다른 엔드포인트에 대한 레이트 리미터 테스트"""
    # 서로 다른 엔드포인트에 대한 요청 생성
    chat_request = test_request_factory(url="/api/chat")
    admin_request = test_request_factory(url="/api/admin")
    default_request = test_request_factory(url="/api/other")
    
    # 각 요청에 대한 레이트 리미팅 결과
    chat_result = await api_rate_limiter(chat_request)
    admin_result = await api_rate_limiter(admin_request)
    default_result = await api_rate_limiter(default_request)
    
    # 채팅 API는 더 낮은 제한(20)을 가져야 함
    assert int(chat_result["X-RateLimit-Limit"]) == 20
    
    # 관리자 API는 더 높은 제한(100)을 가져야 함
    assert int(admin_result["X-RateLimit-Limit"]) == 100
    
    # 기본 엔드포인트는 기본 제한(60)을 가져야 함
    assert int(default_result["X-RateLimit-Limit"]) == 60 