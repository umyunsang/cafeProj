"""
API 엔드포인트에 대한 통합 테스트
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app


def test_root_endpoint(client: TestClient):
    """
    루트 엔드포인트 테스트
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "status" in data
    assert data["status"] == "active"


def test_health_check(client: TestClient):
    """
    헬스 체크 엔드포인트 테스트
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


def test_csrf_token_endpoint(client: TestClient):
    """
    CSRF 토큰 엔드포인트 테스트
    """
    response = client.get("/api/csrf-token")
    assert response.status_code == 200
    data = response.json()
    assert "csrf_token" in data
    
    # 쿠키 확인
    cookies = response.cookies
    assert "X-CSRF-TOKEN" in cookies
    assert "csrf_token_hash" in cookies


def test_csrf_protection(client: TestClient):
    """
    CSRF 보호 기능 테스트
    """
    # 먼저 CSRF 토큰 획득
    token_response = client.get("/api/csrf-token")
    token = token_response.json()["csrf_token"]
    
    # 토큰 없이 POST 요청 (실패해야 함)
    response = client.post("/api/csrf-test")
    assert response.status_code == 403
    
    # 유효한 토큰으로 POST 요청 (성공해야 함)
    response = client.post(
        "/api/csrf-test",
        headers={"X-CSRF-TOKEN": token},
        cookies=token_response.cookies
    )
    assert response.status_code == 200
    
    # 잘못된 토큰으로 POST 요청 (실패해야 함)
    response = client.post(
        "/api/csrf-test",
        headers={"X-CSRF-TOKEN": "invalid-token"},
        cookies=token_response.cookies
    )
    assert response.status_code == 403


@pytest.mark.parametrize(
    "url,expected_status",
    [
        ("/api/menu", 200),
        ("/api/menu/1", 404),  # 존재하지 않는 메뉴 ID
        ("/api/cart", 200),
        ("/api/api/docs", 404),  # 잘못된 경로
    ],
)
def test_api_endpoints_availability(client: TestClient, url: str, expected_status: int):
    """
    다양한 API 엔드포인트 가용성 테스트
    """
    response = client.get(url)
    assert response.status_code == expected_status


def test_rate_limiting(client: TestClient):
    """
    레이트 리미팅 통합 테스트
    """
    # 동일한 엔드포인트에 여러 번 요청
    url = "/api/menu"
    
    # 첫 번째 요청에는 레이트 리밋 헤더가 있어야 함
    response = client.get(url)
    assert response.status_code == 200
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers
    assert "X-RateLimit-Reset" in response.headers
    
    # 남은 요청 수가 감소해야 함
    remaining = int(response.headers["X-RateLimit-Remaining"])
    
    # 두 번째 요청
    response = client.get(url)
    assert response.status_code == 200
    assert int(response.headers["X-RateLimit-Remaining"]) <= remaining 