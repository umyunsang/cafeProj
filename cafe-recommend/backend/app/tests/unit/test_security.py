"""
보안 모듈에 대한 단위 테스트
"""
import pytest
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException
from app.core.security import (
    create_access_token,
    verify_password,
    get_password_hash,
    encrypt_api_key,
    decrypt_api_key,
    generate_csrf_token,
    hash_csrf_token,
    verify_csrf_token,
    AnomalyDetectionSystem
)
from app.core.config import settings


class TestTokenFunctions:
    """토큰 관련 함수 테스트"""
    
    def test_create_access_token(self):
        """액세스 토큰 생성 테스트"""
        # 토큰 생성
        subject = "test@example.com"
        expires_delta = timedelta(minutes=30)
        token = create_access_token(subject=subject, expires_delta=expires_delta)
        
        # 토큰 검증
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == subject
        
        # 만료 시간 검증 (현재 시간 + 30분 이내)
        exp_time = datetime.fromtimestamp(payload["exp"])
        now_plus_30 = datetime.utcnow() + timedelta(minutes=30, seconds=10)  # 약간의 여유 시간 추가
        assert exp_time <= now_plus_30
        
    def test_create_access_token_default_expiry(self):
        """기본 만료 시간으로 액세스 토큰 생성 테스트"""
        # 기본 만료 시간으로 토큰 생성
        subject = "test@example.com"
        token = create_access_token(subject=subject)
        
        # 토큰 검증
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == subject
        
        # 기본 만료 시간 검증
        exp_time = datetime.fromtimestamp(payload["exp"])
        default_exp = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES, seconds=10)
        assert exp_time <= default_exp


class TestPasswordFunctions:
    """비밀번호 관련 함수 테스트"""
    
    def test_password_hash_and_verify(self):
        """비밀번호 해시 및 검증 테스트"""
        # 비밀번호 해시 생성
        password = "securepassword123"
        hashed = get_password_hash(password)
        
        # 원본 비밀번호와 해시값이 다른지 확인
        assert password != hashed
        
        # 비밀번호 검증
        assert verify_password(password, hashed)
        
        # 잘못된 비밀번호는 검증 실패해야 함
        assert not verify_password("wrongpassword", hashed)


class TestAPIKeyEncryption:
    """API 키 암호화 관련 함수 테스트"""
    
    def test_encrypt_decrypt_api_key(self):
        """API 키 암호화 및 복호화 테스트"""
        # API 키 암호화
        api_key = "sk-1234567890abcdef"
        encrypted = encrypt_api_key(api_key)
        
        # 암호화된 값이 원본과 달라야 함
        assert encrypted != api_key
        
        # 복호화
        decrypted = decrypt_api_key(encrypted)
        
        # 복호화된 값이 원본과 일치해야 함
        assert decrypted == api_key
        
    def test_encrypt_decrypt_empty_key(self):
        """빈 API 키 암호화 및 복호화 테스트"""
        # None 입력 시 None 반환
        assert encrypt_api_key(None) is None
        assert decrypt_api_key(None) is None
        
        # 빈 문자열 입력 시 정상 암호화/복호화
        encrypted = encrypt_api_key("")
        assert encrypted != ""
        assert decrypt_api_key(encrypted) == ""


class TestCSRFProtection:
    """CSRF 보호 관련 함수 테스트"""
    
    def test_generate_csrf_token(self):
        """CSRF 토큰 생성 테스트"""
        # 토큰 생성
        token = generate_csrf_token()
        
        # 토큰 길이 및 형식 확인
        assert isinstance(token, str)
        assert len(token) == 64  # 32바이트 hex 문자열 = 64자
        
    def test_hash_csrf_token(self):
        """CSRF 토큰 해싱 테스트"""
        # 토큰 및 해시 생성
        token = generate_csrf_token()
        hashed = hash_csrf_token(token)
        
        # 해시가 원본과 달라야 함
        assert hashed != token
        
        # 해시 형식 확인
        assert isinstance(hashed, str)
        assert len(hashed) == 64  # SHA-256 해시 = 64자
        
        # 동일 토큰은 동일 해시 생성해야 함
        assert hash_csrf_token(token) == hashed
        
        # 다른 토큰은 다른 해시 생성해야 함
        other_token = generate_csrf_token()
        other_hashed = hash_csrf_token(other_token)
        assert other_hashed != hashed


class TestAnomalyDetection:
    """비정상 트래픽 탐지 관련 테스트"""
    
    def test_record_request(self):
        """요청 기록 테스트"""
        system = AnomalyDetectionSystem()
        ip = "192.168.1.1"
        
        # 요청 기록
        system.record_request(ip, "/api/test", "GET", "TestAgent")
        
        # 기록 확인
        assert ip in system.ip_activity
        assert len(system.ip_activity[ip]) == 1
        assert system.ip_activity[ip][0]["path"] == "/api/test"
        assert system.ip_activity[ip][0]["method"] == "GET"
        assert system.ip_activity[ip][0]["user_agent"] == "TestAgent"
    
    def test_record_login_failure(self):
        """로그인 실패 기록 테스트"""
        system = AnomalyDetectionSystem()
        ip = "192.168.1.1"
        
        # 로그인 실패 기록
        for i in range(5):
            is_blocked = system.record_login_failure(ip)
            assert not is_blocked  # 5번째까지는 차단되지 않아야 함
        
        # 한도 초과 시 차단되어야 함
        is_blocked = system.record_login_failure(ip)
        assert is_blocked
        
        # 차단 확인
        assert system.is_blocked(ip)
    
    def test_is_blocked(self):
        """IP 차단 확인 테스트"""
        system = AnomalyDetectionSystem()
        ip = "192.168.1.1"
        
        # 처음에는 차단되지 않은 상태
        assert not system.is_blocked(ip)
        
        # IP 차단
        system.block_ip(ip, "테스트 차단")
        
        # 차단 확인
        assert system.is_blocked(ip)
        
        # 차단된 IP 목록에 포함되어야 함
        blocked_ips = system.get_blocked_ips()
        assert ip in blocked_ips 