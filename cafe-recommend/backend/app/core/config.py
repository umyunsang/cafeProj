import secrets
from typing import Any, Dict, List, Optional, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, AnyHttpUrl, EmailStr
import os
from pathlib import Path

# BACKEND_ROOT는 config.py 파일의 위치를 기준으로 backend 디렉토리의 절대 경로를 계산합니다.
# .env 파일은 프로젝트 루트에 있으므로, 이 경로를 기준으로 .env 파일의 위치를 지정해야 합니다.
BACKEND_ROOT_PATH = Path(__file__).resolve().parent.parent.parent # cafe-recommend/backend/
# PROJECT_ROOT_PATH = BACKEND_ROOT_PATH.parent # cafe-recommend/
PROJECT_ROOT_PATH = BACKEND_ROOT_PATH.parent.parent # cafeProj/ (프로젝트 실제 루트)
ENV_FILE_PATH = PROJECT_ROOT_PATH / ".env"

class Settings(BaseSettings):
    # 서버 설정
    HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 15049 # PORT에서 이름 변경 및 타입 int로 변경
    ENVIRONMENT: str = "development"
    
    # API 기본 설정
    API_V1_STR: str = "/api/v1" # .env에서 관리 가능하지만, 보통 코드 내 고정
    API_PREFIX: str = "/api/v1" # .env에서 관리 가능하지만, 보통 코드 내 고정
    
    # 보안 설정 (필수: .env에서 로드)
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    JWT_ALGORITHM: str = "HS256"
    
    # 쿠키 설정
    SECURE_COOKIES: bool = False 
    
    # 암호화 키 (API 키 암호화용, 선택적: .env에서 로드)
    ENCRYPTION_KEY: Optional[str] = None
    
    # 데이터베이스 설정 (필수: .env에서 로드, 경로 보정 필요시 수행)
    DATABASE_URL: str 

    # CORS 설정 (.env에서 로드, 문자열을 리스트로 변환)
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    # ALLOWED_ORIGINS: str = "http://localhost:15030" # BACKEND_CORS_ORIGINS로 통합 관리
    
    # 로깅 설정
    LOG_LEVEL: str = "INFO"
    LOG_FILE_NAME: str = "backend.log" # 로그 파일 이름만 .env 또는 여기서 정의

    # 프론트엔드 URL (.env에서 로드)
    NEXT_PUBLIC_FRONTEND_URL: AnyHttpUrl # 이름 변경 및 타입 검증

    # FRONTEND_URL property 추가 (결제 API 호환성을 위해)
    @property
    def FRONTEND_URL(self) -> str:
        return str(self.NEXT_PUBLIC_FRONTEND_URL)

    # 파일 업로드 설정 (경로는 BACKEND_ROOT_PATH 기준으로 동적 생성)
    UPLOAD_DIR_NAME: str = "uploads" 
    STATIC_DIR_NAME: str = "static"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    
    # 캐시 설정
    REDIS_URL: Optional[str] = None # 예: "redis://localhost:6379/0"
    CACHE_EXPIRATION_SECONDS: int = 60 * 10
    CACHE_ENABLED: bool = True
    CACHE_TIMEOUT: int = 300
    
    # 카카오페이 설정 (필수: .env에서 로드)
    KAKAO_SECRET_KEY_DEV: str
    KAKAO_PAY_API_URL: AnyHttpUrl
    KAKAO_CID: str
    
    # 네이버페이 설정 (필수: .env에서 로드)
    NAVER_PAY_API_URL: AnyHttpUrl
    NAVER_PAY_PARTNER_ID: str
    NAVER_PAY_CLIENT_ID: str
    NAVER_PAY_CLIENT_SECRET: str
    NAVER_PAY_CHAIN_ID: str
    
    # OpenAI API 설정 (필수: .env에서 로드)
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    
    # 초기 관리자 계정 설정 (.env에서 로드)
    FIRST_SUPERUSER: EmailStr
    FIRST_SUPERUSER_PASSWORD: str
    
    # 기타 설정
    TESTING: bool = False # .env에서 관리
    DEBUG: bool = False   # .env에서 관리
    
    # 동적으로 생성되는 경로들
    @property
    def UPLOAD_DIR(self) -> str:
        return str(BACKEND_ROOT_PATH / self.UPLOAD_DIR_NAME)

    @property
    def STATIC_DIR(self) -> str:
        return str(BACKEND_ROOT_PATH / self.STATIC_DIR_NAME)

    @property
    def LOG_DIR(self) -> str:
        log_path = BACKEND_ROOT_PATH / "logs"
        log_path.mkdir(parents=True, exist_ok=True)
        return str(log_path)

    @property
    def LOG_FILE_PATH(self) -> str:
        return str(Path(self.LOG_DIR) / self.LOG_FILE_NAME)
        
    # 서버 기본 URL (이미지 URL 생성에 사용)
    def get_server_url(self) -> str:
        # ENVIRONMENT에 따라 http/https 및 포트 등을 다르게 설정할 수 있음
        # 지금은 BACKEND_PORT를 사용
        return f"http://{self.HOST}:{self.BACKEND_PORT}"
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            # .env 파일에서 문자열로 읽어온 경우 (e.g., "url1,url2")
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        # .env 파일에서 JSON 배열 형태로 읽어온 경우 (e.g., \'["url1", "url2"]\')는 pydantic이 자동으로 처리
        return v # Pydantic이 JSON 문자열을 list로 변환 시도

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str]) -> str:
        if v and v.startswith("sqlite:///./"):
            # 상대 경로 SQLite URL의 경우, 프로젝트 루트 기준으로 경로 재계산
            # .env 파일의 DATABASE_URL=sqlite:///./cafe-recommend/backend/cafe_app.db
            # PROJECT_ROOT_PATH를 기준으로 상대 경로를 해석
            relative_path = v.replace("sqlite:///./", "")
            return f"sqlite:///{PROJECT_ROOT_PATH / relative_path}"
        if not v:
            # 기본값 설정 또는 에러 발생 (여기서는 .env에 필수로 있도록 함)
            raise ValueError("DATABASE_URL must be set in .env file")
        return v

    # 파일 업로드 및 정적 디렉토리 생성 (프로퍼티 접근 시 생성되도록 변경 가능 또는 초기화 시)
    # 이 field_validator들은 Settings 인스턴스가 생성될 때 실행됩니다.
    @field_validator("UPLOAD_DIR_NAME") # UPLOAD_DIR_NAME으로 변경
    @classmethod
    def create_upload_dir(cls, v: str, values: Any) -> str: # values 사용은 Pydantic v1 방식, v2는 info: FieldValidationInfo
        # Settings 인스턴스에서 UPLOAD_DIR 프로퍼티를 통해 실제 경로를 가져와야 함
        # 여기서는 v (UPLOAD_DIR_NAME) 자체는 경로가 아님.
        # 디렉토리 생성은 @property UPLOAD_DIR 접근 시 또는 애플리케이션 시작 시 별도 로직으로 처리하는 것이 나을 수 있음.
        # 여기서는 일단 이름만 검증하거나, 생성 로직을 프로퍼티로 옮김.
        # settings = Settings() 시점에 이 validator가 실행되므로, 그 때 BACKEND_ROOT_PATH를 사용해 생성 가능
        upload_path = BACKEND_ROOT_PATH / v
        upload_path.mkdir(parents=True, exist_ok=True)
        return v
    
    @field_validator("STATIC_DIR_NAME") # STATIC_DIR_NAME으로 변경
    @classmethod
    def create_static_dir(cls, v: str, values: Any) -> str:
        static_path = BACKEND_ROOT_PATH / v
        static_path.mkdir(parents=True, exist_ok=True)
        
        menu_images_path = static_path / "menu_images"
        menu_images_path.mkdir(parents=True, exist_ok=True)
        return v
    
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH), # .env 파일 경로 명시적 지정
        env_file_encoding='utf-8',
        case_sensitive=True, # .env 변수 이름 대소문자 구분
        extra='ignore' # .env에 정의되지 않은 추가 필드 무시
    )

settings = Settings()
# 애플리케이션 시작 시 설정값 로드 확인용 print문 (운영 환경에서는 제거 고려)
print(f"[CONFIG_LOAD] Initialized Settings from {ENV_FILE_PATH}:") 
print(f"- ENVIRONMENT: {settings.ENVIRONMENT}")
print(f"- DATABASE_URL: {settings.DATABASE_URL}")
print(f"- STATIC_DIR: {settings.STATIC_DIR}")
print(f"- UPLOAD_DIR: {settings.UPLOAD_DIR}")
print(f"- LOG_FILE_PATH: {settings.LOG_FILE_PATH}")
print(f"- SERVER URL: {settings.get_server_url()}")
print(f"- OpenAI Key Loaded: {'YES' if settings.OPENAI_API_KEY and 'your_openai_api_key' not in settings.OPENAI_API_KEY else 'NO or Placeholder'}")
print(f"- Kakao Key Loaded: {'YES' if settings.KAKAO_SECRET_KEY_DEV and 'your_kakaopay_secret_key' not in settings.KAKAO_SECRET_KEY_DEV else 'NO or Placeholder'}")
print(f"- Naver Client ID Loaded: {'YES' if settings.NAVER_PAY_CLIENT_ID and 'your_naver_pay_client_id' not in settings.NAVER_PAY_CLIENT_ID else 'NO or Placeholder'}") 