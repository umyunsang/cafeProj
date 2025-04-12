from typing import Any, Dict, List, Optional, Union
from pydantic import AnyHttpUrl, PostgresDsn, validator
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cafe Recommendation System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS 설정 - 모든 출처 허용
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080",
    ]
    
    # JWT 설정
    SECRET_KEY: str = "your-secret-key-here"  # 실제 운영 환경에서는 환경 변수로 관리
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # 데이터베이스 설정
    SQLALCHEMY_DATABASE_URL: str = "sqlite:////home/uys_1705817/aiProj/cafe-recommend/backend/app.db"
    
    # 초기 관리자 계정
    FIRST_SUPERUSER_EMAIL: str = "admin@test.com"
    FIRST_SUPERUSER_PASSWORD: str = "admin"
    
    # AI 설정
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "SsWG3SGGRjwfXyhbFdivGyPUj8MV9DUz")
    
    # 임베딩 모델 설정
    EMBEDDING_MODEL: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    
    # 벡터 데이터베이스 설정
    VECTOR_DB_PATH: str = "vector_store"
    
    # 기본 모델 설정
    DEFAULT_MODEL: str = "mistral-tiny"
    
    # 시스템 프롬프트 설정
    SYSTEM_PROMPT: str = """
당신은 친절하고 전문적인 카페 메뉴 추천 AI 바리스타입니다.
사용자의 요청을 주의 깊게 듣고, 가장 적합한 메뉴를 추천해주세요.

메뉴 추천 시 다음 사항을 반드시 고려해주세요:
1. 사용자의 구체적인 요청 (예: 달달한 음료, 카페인이 적은 음료 등)
2. 사용자의 선호도 프로필 (단맛, 신맛, 쓴맛에 대한 선호도)
3. 메뉴의 특성 (카페인 함량, 당도, 산미, 바디감)
4. 계절과 시간대에 어울리는 메뉴

응답 시 다음 형식을 지켜주세요:
1. 사용자의 요청을 정확히 파악하고 공감을 표현
2. 요청에 가장 적합한 2-3개의 메뉴를 추천
3. 각 메뉴에 대해 다음 정보를 포함:
   - 메뉴 이름과 가격
   - 메뉴의 주요 특성 (카페인, 당도, 산미, 바디감)
   - 추천 이유
4. 필요한 경우 메뉴 커스터마이징 제안 (예: 시럽 추가, 연하게 추출 등)

항상 친절하고 전문적인 어조를 유지하며, 사용자의 만족도를 최우선으로 고려해주세요.
"""
    
    # 메뉴 추천 프롬프트 템플릿
    MENU_RECOMMENDATION_TEMPLATE: str = """
다음은 현재 카페의 메뉴 정보입니다:
{menu_info}

사용자의 선호도 정보입니다:
{user_preferences}

사용자의 요청입니다:
{user_request}

위 정보를 바탕으로 사용자에게 가장 적합한 메뉴 3개의 ID를 추천해주세요.
각 메뉴에 대해 추천 이유도 함께 설명해주세요.
응답은 다음 형식으로 해주세요:
메뉴ID1
- 추천 이유: ...
메뉴ID2
- 추천 이유: ...
메뉴ID3
- 추천 이유: ...
"""
    
    # OpenAI API 키
    OPENAI_API_KEY: Optional[str] = None
    
    # 네이버페이 설정
    NAVER_PAY_API_URL: str = "https://dev.apis.naver.com/naverpay-partner"
    NAVER_CLIENT_ID: str = ""
    NAVER_CLIENT_SECRET: str = ""

    # 카카오페이 설정
    KAKAO_PAY_API_URL: str = "https://kapi.kakao.com"
    KAKAO_ADMIN_KEY: str = os.getenv("KAKAO_ADMIN_KEY", "d6f8cf9ed125ce95eaca902cc2af20e7")
    KAKAO_CID: str = os.getenv("KAKAO_CID", "TC0ONETIME")

    # 프론트엔드 URL
    FRONTEND_URL: str = "http://116.124.191.174:15022"
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"  # 추가 필드 허용

settings = Settings() 