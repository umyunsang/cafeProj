from datetime import datetime, timedelta
from typing import Any, Union, Optional, Dict, List
from jose import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import base64
import os
import secrets
import hmac
import hashlib
import time
from fastapi import Request, HTTPException, status, Cookie
from pydantic import BaseModel
import logging

from app.core.config import settings

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("security")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"

def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# API 키 암호화를 위한 키 생성 (환경 변수에서 가져오거나 설정에서 가져옴)
def get_encryption_key() -> bytes:
    key = getattr(settings, "ENCRYPTION_KEY", None)
    if not key:
        # 기본 키가 없으면 SECRET_KEY 기반으로 생성
        key_base = settings.SECRET_KEY.encode()
        # 32바이트 키로 변환 (Fernet 요구사항)
        key = base64.urlsafe_b64encode(key_base.ljust(32)[:32])
    return key

# API 키 암호화
def encrypt_api_key(api_key: str) -> str:
    if not api_key:
        return None
        
    key = get_encryption_key()
    f = Fernet(key)
    encrypted_data = f.encrypt(api_key.encode())
    return encrypted_data.decode()

# API 키 복호화
def decrypt_api_key(encrypted_api_key: str) -> str:
    if not encrypted_api_key:
        return None
        
    key = get_encryption_key()
    f = Fernet(key)
    try:
        decrypted_data = f.decrypt(encrypted_api_key.encode())
        return decrypted_data.decode()
    except Exception as e:
        # 복호화 실패 시 로그 기록
        logger.error(f"API 키 복호화 실패: {str(e)}")
        return None 

# CSRF 보호 기능

# CSRF 토큰 생성
def generate_csrf_token() -> str:
    """
    무작위 CSRF 토큰을 생성합니다.
    """
    return secrets.token_hex(32)

# CSRF 토큰 해시
def hash_csrf_token(token: str) -> str:
    """
    CSRF 토큰을 해시하여 저장된 토큰과 비교합니다.
    """
    return hmac.new(
        key=settings.SECRET_KEY.encode(),
        msg=token.encode(),
        digestmod=hashlib.sha256
    ).hexdigest()

class CSRFTokenModel(BaseModel):
    csrf_token: str

# CSRF 토큰 검증 의존성
async def verify_csrf_token(
    request: Request,
    csrf_token: Optional[str] = None,
    csrf_token_cookie: Optional[str] = Cookie(None, alias="X-CSRF-TOKEN")
) -> None:
    """
    요청에서 CSRF 토큰을 검증합니다.
    
    토큰은 다음 위치에서 검색됩니다:
    1. 요청 헤더의 X-CSRF-TOKEN
    2. 요청 쿠키의 X-CSRF-TOKEN
    3. 요청 폼 데이터의 csrf_token
    4. 요청 JSON 본문의 csrf_token
    
    토큰이 없거나 유효하지 않으면 403 Forbidden 오류를 발생시킵니다.
    """
    # POST, PUT, DELETE, PATCH 요청에만 CSRF 검증 적용
    if request.method not in ["POST", "PUT", "DELETE", "PATCH"]:
        return None
        
    # 토큰 찾기 (우선순위: 헤더 > 쿠키 > 폼 > JSON)
    token = None
    
    # 1. 헤더에서 확인
    token = request.headers.get("X-CSRF-TOKEN")
    
    # 2. 파라미터로 전달된 토큰 사용
    if not token and csrf_token:
        token = csrf_token
    
    # 3. 쿠키에서 확인
    if not token and csrf_token_cookie:
        token = csrf_token_cookie
    
    # 4. 폼 데이터에서 확인 (비동기 처리)
    if not token:
        try:
            form_data = await request.form()
            token = form_data.get("csrf_token")
        except:
            pass
    
    # 5. JSON 본문에서 확인 (비동기 처리)
    if not token:
        try:
            json_data = await request.json()
            if isinstance(json_data, dict):
                token = json_data.get("csrf_token")
        except:
            pass
    
    # 토큰이 없으면 오류
    if not token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF 토큰이 필요합니다",
        )
    
    # 쿠키에 있는 해시된 토큰 가져오기
    hashed_token = request.cookies.get("csrf_token_hash")
    if not hashed_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF 보호가 손상되었습니다. 페이지를 새로고침하세요.",
        )
    
    # 토큰 검증
    if not hmac.compare_digest(hash_csrf_token(token), hashed_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF 토큰이 유효하지 않습니다",
        )

# 비정상 트래픽 탐지 시스템 
class AnomalyDetectionSystem:
    def __init__(self):
        # 각 IP 주소별 활동 패턴 추적
        self.ip_activity: Dict[str, List[Dict[str, Any]]] = {}
        
        # 의심스러운 IP 목록 및 차단 상태
        self.suspicious_ips: Dict[str, Dict[str, Any]] = {}
        
        # 최근 로그인 시도 실패 횟수
        self.failed_logins: Dict[str, List[float]] = {}
        
        # 요청 패턴 분석용 설정
        self.detection_window = 300  # 5분 (초 단위)
        self.max_failed_logins = 5   # 5분 내 최대 5회 로그인 실패 허용
        self.suspicious_threshold = 0.8  # 의심스러운 패턴 점수 임계값
        self.block_duration = 30     # 차단 지속 시간 (분 단위)
        
    def record_request(self, ip: str, path: str, method: str, user_agent: str) -> None:
        """
        요청 정보를 기록하고 비정상 패턴을 분석합니다.
        """
        now = time.time()
        
        # IP 활동 기록 초기화
        if ip not in self.ip_activity:
            self.ip_activity[ip] = []
            
        # 요청 정보 기록
        self.ip_activity[ip].append({
            "timestamp": now,
            "path": path,
            "method": method,
            "user_agent": user_agent,
        })
        
        # 오래된 기록 정리 (detection_window보다 오래된 기록 제거)
        self.ip_activity[ip] = [r for r in self.ip_activity[ip] if now - r["timestamp"] <= self.detection_window]
        
        # 비정상 패턴 분석
        self.analyze_patterns(ip)
        
    def record_login_failure(self, ip: str) -> bool:
        """
        로그인 실패를 기록하고 허용 한도를 초과했는지 확인합니다.
        
        반환값: 차단 여부 (True: 차단됨, False: 허용됨)
        """
        now = time.time()
        
        # IP 실패 기록 초기화
        if ip not in self.failed_logins:
            self.failed_logins[ip] = []
            
        # 실패 기록
        self.failed_logins[ip].append(now)
        
        # 오래된 기록 정리
        self.failed_logins[ip] = [t for t in self.failed_logins[ip] if now - t <= self.detection_window]
        
        # 한도 초과 여부 확인
        if len(self.failed_logins[ip]) > self.max_failed_logins:
            # IP 차단
            self.block_ip(ip, reason="로그인 실패 한도 초과")
            return True
            
        return False
        
    def analyze_patterns(self, ip: str) -> None:
        """
        IP의 요청 패턴을 분석하여 비정상 행동을 탐지합니다.
        """
        # 분석을 위한 최소 요청 수
        min_requests = 10
        if ip not in self.ip_activity or len(self.ip_activity[ip]) < min_requests:
            return
            
        # 의심점수 계산
        # 1. 짧은 시간 내 많은 요청
        requests = self.ip_activity[ip]
        req_count = len(requests)
        time_span = requests[-1]["timestamp"] - requests[0]["timestamp"]
        if time_span == 0:
            time_span = 0.1  # 0으로 나누는 오류 방지
            
        req_rate = req_count / time_span
        rate_score = min(1.0, req_rate / 5.0)  # 초당 5개 이상 요청 시 최대 점수
        
        # 2. 다양한 엔드포인트 무작위 접근
        unique_paths = set(r["path"] for r in requests)
        path_ratio = len(unique_paths) / req_count
        path_score = path_ratio if path_ratio > 0.7 else 0  # 70% 이상의 요청이 서로 다른 경로일 때
        
        # 3. 일반적이지 않은 HTTP 메서드 사용 비율
        unusual_methods = ["PUT", "DELETE", "OPTIONS", "TRACE", "CONNECT"]
        unusual_method_count = sum(1 for r in requests if r["method"] in unusual_methods)
        method_score = unusual_method_count / req_count if req_count > 0 else 0
        
        # 최종 의심점수 계산 (가중치 적용)
        final_score = (rate_score * 0.5) + (path_score * 0.3) + (method_score * 0.2)
        
        # 임계값 초과 시 의심스러운 IP로 등록
        if final_score >= self.suspicious_threshold:
            self.mark_suspicious(ip, final_score, "비정상적인 요청 패턴 감지")
            
            # 높은 점수는 바로 차단
            if final_score >= 0.95:
                self.block_ip(ip, reason=f"매우 의심스러운 트래픽 (점수: {final_score:.2f})")
        
    def mark_suspicious(self, ip: str, score: float, reason: str) -> None:
        """
        IP를 의심스러운 목록에 추가합니다.
        """
        now = datetime.now()
        
        if ip not in self.suspicious_ips:
            self.suspicious_ips[ip] = {
                "first_detected": now,
                "last_updated": now,
                "score": score,
                "reason": reason,
                "is_blocked": False,
                "detection_count": 1,
            }
        else:
            self.suspicious_ips[ip]["last_updated"] = now
            self.suspicious_ips[ip]["score"] = max(self.suspicious_ips[ip]["score"], score)
            self.suspicious_ips[ip]["detection_count"] += 1
            
        # 로그 기록
        logger.warning(f"의심스러운 IP 감지: {ip} (점수: {score:.2f}, 이유: {reason})")
        
    def block_ip(self, ip: str, reason: str) -> None:
        """
        IP를 차단 목록에 추가합니다.
        """
        now = datetime.now()
        block_until = now + timedelta(minutes=self.block_duration)
        
        if ip not in self.suspicious_ips:
            self.mark_suspicious(ip, 1.0, reason)
            
        self.suspicious_ips[ip]["is_blocked"] = True
        self.suspicious_ips[ip]["block_until"] = block_until
        self.suspicious_ips[ip]["block_reason"] = reason
        
        # 로그 기록
        logger.warning(f"IP 차단: {ip} (이유: {reason}, 차단 해제: {block_until})")
    
    def is_blocked(self, ip: str) -> bool:
        """
        IP가 현재 차단되었는지 확인합니다.
        """
        if ip not in self.suspicious_ips:
            return False
            
        # 차단된 IP이고 차단 기간이 아직 남아있는 경우
        if self.suspicious_ips[ip]["is_blocked"]:
            now = datetime.now()
            if now < self.suspicious_ips[ip]["block_until"]:
                return True
            else:
                # 차단 기간이 지났으면 차단 해제
                self.suspicious_ips[ip]["is_blocked"] = False
                logger.info(f"IP 차단 해제: {ip} (차단 기간 만료)")
                
        return False
        
    def get_blocked_ips(self) -> Dict[str, Dict[str, Any]]:
        """
        현재 차단된 모든 IP의 정보를 반환합니다.
        """
        now = datetime.now()
        result = {}
        
        for ip, info in self.suspicious_ips.items():
            if info["is_blocked"] and now < info["block_until"]:
                result[ip] = {
                    "block_until": info["block_until"],
                    "reason": info["block_reason"],
                    "detection_count": info["detection_count"],
                    "score": info["score"]
                }
                
        return result

# 비정상 트래픽 탐지 시스템 인스턴스 생성
anomaly_detection_system = AnomalyDetectionSystem()

# 비정상 트래픽 탐지 미들웨어 의존성
async def detect_suspicious_traffic(request: Request) -> None:
    """
    요청의 비정상 패턴을 감지하고 필요시 차단하는 의존성 함수
    """
    client_ip = request.client.host if request.client else "unknown"
    
    # IP가 차단 목록에 있는지 확인
    if anomaly_detection_system.is_blocked(client_ip):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비정상적인 트래픽이 감지되어 일시적으로 접근이 제한되었습니다.",
        )
    
    # 요청 정보 기록 (비동기 처리하지 않음 - DB 작업 없음)
    user_agent = request.headers.get("user-agent", "")
    anomaly_detection_system.record_request(
        ip=client_ip,
        path=request.url.path,
        method=request.method,
        user_agent=user_agent
    )
    
    # 여기서 차단하지 않고 활동만 기록
    # 실제 차단은 pattern 분석 후 다음 요청에서 발생

# 로그인 실패 기록 함수
def record_login_failure(request: Request) -> bool:
    """
    로그인 실패를 기록하고 차단 여부를 반환합니다.
    
    반환값: 차단 여부 (True: 차단됨, False: 허용됨)
    """
    client_ip = request.client.host if request.client else "unknown"
    return anomaly_detection_system.record_login_failure(client_ip) 