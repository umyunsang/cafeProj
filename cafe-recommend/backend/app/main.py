from fastapi import FastAPI, HTTPException, Response, Request, Cookie, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
import os
from .routers.chat import router as chat_router
from .routers.menus import router as menus_router
from .routers.cart import router as cart_router
from .routers.order import router as order_router
from .routers.user_identity import router as user_identity_router
from .api.admin import auth, dashboard, menu, orders, realtime, settings, inventory
from .api.menu import router as menu_api_router
from .routers.payment import router as payment_router
from .routers import reviews_router
from .routers.admin import notifications_router, alerts_router, auth_router as custom_admin_auth_router
from .core.config import settings as app_settings
from .core.security import generate_csrf_token, hash_csrf_token, verify_csrf_token
from .core.rate_limiter import RateLimitMiddleware
from datetime import datetime
from typing import Optional

# API 태그 메타데이터 정의
tags_metadata = [
    {
        "name": "menus",
        "description": "메뉴 조회 및 관리 관련 API",
    },
    {
        "name": "cart",
        "description": "장바구니 관련 API",
    },
    {
        "name": "order",
        "description": "주문 처리 및 관리 관련 API",
    },
    {
        "name": "payments",
        "description": "결제 처리 및 관리 관련 API",
    },
    {
        "name": "user-identity",
        "description": "사용자 세션 및 식별 관련 API",
    },
    {
        "name": "chat",
        "description": "AI 챗봇 및 메뉴 추천 관련 API",
    },
    {
        "name": "reviews",
        "description": "메뉴 리뷰 및 평점 관련 API",
    },
    {
        "name": "menu-availability",
        "description": "메뉴 가용성 확인 관련 API",
    },
    {
        "name": "admin",
        "description": "관리자 전용 API",
    },
    {
        "name": "admin:menus",
        "description": "관리자용 메뉴 관리 API",
    },
    {
        "name": "admin:orders",
        "description": "관리자용 주문 관리 API",
    },
    {
        "name": "admin:payments",
        "description": "관리자용 결제 관리 API",
    },
    {
        "name": "admin:dashboard",
        "description": "관리자용 대시보드 및 통계 API",
    },
    {
        "name": "admin:auth",
        "description": "관리자 인증 관련 API",
    },
    {
        "name": "admin:realtime",
        "description": "실시간 데이터 스트리밍 및 WebSocket API",
    },
    {
        "name": "admin:settings",
        "description": "관리자용 시스템 설정 API",
    },
    {
        "name": "admin:inventory",
        "description": "관리자용 재고 관리 API",
    },
    {
        "name": "admin:notifications",
        "description": "관리자용 알림 시스템 API",
    },
    {
        "name": "admin:alerts",
        "description": "관리자용 주문 분석 및 알림 API",
    },
    {
        "name": "security",
        "description": "보안 관련 API 및 기능",
    },
]

app = FastAPI(
    title="카페 추천 시스템 API",
    description="""
    # 카페 메뉴 추천 및 주문 시스템을 위한 REST API

    ## 주요 기능
    
    * **메뉴 조회**: 카테고리별 메뉴 조회 및 상세 정보 확인
    * **AI 추천**: 사용자 취향에 맞는 메뉴 추천
    * **주문 관리**: 장바구니, 주문 생성, 주문 이력 조회
    * **결제 처리**: 결제 요청 및 콜백 처리
    * **관리자 기능**: 메뉴, 주문, 결제 관리 및 분석 대시보드
    
    ## 인증 방식
    
    * 일반 사용자: 세션 ID 기반 (쿠키/세션)
    * 관리자: JWT 토큰 인증
    
    ## 레이트 리미팅
    
    API 요청은 IP 주소별로 레이트 리미팅이 적용됩니다.
    기본적으로 다음과 같은 제한이 적용됩니다:
    * 일반 API: 분당 60 요청
    * 챗봇 API: 분당 20 요청
    * 관리자 API: 분당 100 요청
    
    제한을 초과하면 HTTP 429 응답과 함께 재시도 시간이 반환됩니다.
    응답 헤더에는 다음 정보가 포함됩니다:
    * X-RateLimit-Limit: 최대 허용 요청 수
    * X-RateLimit-Remaining: 남은 요청 수
    * X-RateLimit-Reset: 제한 초기화 시간 (Unix 타임스탬프)
    """,
    version="1.0.0",
    docs_url=None,  # 기본 docs 경로 비활성화
    redoc_url=None,  # 기본 redoc 경로 비활성화
    openapi_tags=tags_metadata,
    swagger_ui_parameters={"syntaxHighlight.theme": "obsidian"},
)

# 정적 파일 디렉토리 생성 (없는 경우)
os.makedirs(os.path.join(app_settings.STATIC_DIR), exist_ok=True)
os.makedirs(os.path.join(app_settings.STATIC_DIR, "menu_images"), exist_ok=True)
os.makedirs(os.path.join(app_settings.STATIC_DIR, "frontend"), exist_ok=True)

# 정적 파일 제공
app.mount("/static", StaticFiles(directory=app_settings.STATIC_DIR), name="static")

# 프론트엔드 정적 파일 마운팅
frontend_dir = os.path.join(app_settings.STATIC_DIR, "frontend")
if os.path.exists(frontend_dir):
    # Next.js 정적 리소스 마운팅
    nextjs_static_dir = os.path.join(frontend_dir, "_next")
    if os.path.exists(nextjs_static_dir):
        app.mount("/_next", StaticFiles(directory=nextjs_static_dir), name="nextjs_static")
    
    # 프론트엔드 이미지 마운팅
    frontend_images_dir = os.path.join(frontend_dir, "images")
    if os.path.exists(frontend_images_dir):
        app.mount("/images", StaticFiles(directory=frontend_images_dir), name="frontend_images")

# GZIP 압축 미들웨어 추가
app.add_middleware(GZipMiddleware, minimum_size=1000)  # 1KB 이상 응답 압축

# 레이트 리미팅 미들웨어 추가
app.add_middleware(RateLimitMiddleware)

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 라우터 등록
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(menus_router, prefix="/api", tags=["menus"])
app.include_router(cart_router, prefix="/api", tags=["cart"])
app.include_router(order_router, prefix="/api", tags=["order"])
app.include_router(user_identity_router, prefix="/api", tags=["user-identity"])
app.include_router(reviews_router, prefix="/api", tags=["reviews"])
app.include_router(menu_api_router, prefix="/api/menu", tags=["menu-availability"])
app.include_router(payment_router, prefix="/api", tags=["payments"])

# 관리자 API 라우터 등록
app.include_router(auth.router, prefix="/api/admin/auth", tags=["admin", "admin:auth"])
app.include_router(dashboard.router, prefix="/api/admin", tags=["admin", "admin:dashboard"])
app.include_router(menu.router, prefix="/api/admin", tags=["admin", "admin:menus"])
app.include_router(orders.router, prefix="/api/admin", tags=["admin", "admin:orders"])
app.include_router(realtime.router, prefix="/api/admin", tags=["admin", "admin:realtime"])
app.include_router(settings.router, prefix="/api/admin/settings", tags=["admin", "admin:settings"])
app.include_router(inventory.router, prefix="/api/admin/inventory", tags=["admin", "admin:inventory"])

# 관리자 알림 시스템 라우터 등록
app.include_router(notifications_router, prefix="/api/admin/notifications", tags=["admin", "admin:notifications"])
app.include_router(alerts_router, prefix="/api/admin/alerts", tags=["admin", "admin:alerts"])

# 추가 관리자 인증 라우터 등록 (app.api.admin.auth.router와 충돌 가능성 있음, prefix /api/admin/auth로 통일 권장)
# 일단 custom_admin_auth_router의 prefix도 /api/admin/auth로 변경하여 충돌을 명시적으로 만들거나, 
# app.api.admin.auth.router 하나만 사용하도록 정리 필요. 여기서는 custom_admin_auth_router도 변경.
# app.include_router(custom_admin_auth_router, prefix="/api/admin/auth", tags=["admin", "admin:auth"])

# CSRF 토큰 발급 및 갱신 엔드포인트
@app.get("/api/csrf-token", tags=["security"])
async def get_csrf_token(
    response: Response,
    request: Request,
    current_token: Optional[str] = Cookie(None, alias="X-CSRF-TOKEN")
):
    """
    CSRF 토큰을 생성하고 반환합니다.
    이 토큰은 POST, PUT, DELETE 요청에 포함되어야 합니다.
    
    토큰은 다음과 같이 사용할 수 있습니다:
    1. HTTP 헤더: X-CSRF-TOKEN
    2. 폼 데이터: csrf_token
    3. JSON 요청 본문: csrf_token
    
    응답에는 두 개의 쿠키가 설정됩니다:
    - X-CSRF-TOKEN: 클라이언트 측에서 사용할 수 있는 실제 토큰
    - csrf_token_hash: 서버 측 검증을 위한 해시된 토큰값 (HttpOnly)
    """
    # 새 CSRF 토큰 생성
    token = generate_csrf_token()
    
    # 토큰 해시 생성
    hashed_token = hash_csrf_token(token)
    
    # 쿠키에 토큰 설정
    response.set_cookie(
        key="X-CSRF-TOKEN",
        value=token,
        max_age=86400,  # 24시간
        path="/",
        secure=False,  # 개발환경에서는 False, 프로덕션에서는 True로 설정
        httponly=False,  # JavaScript에서 접근 가능하도록 설정
        samesite="lax"
    )
    
    # 해시된 토큰 저장 (HttpOnly)
    response.set_cookie(
        key="csrf_token_hash",
        value=hashed_token,
        max_age=86400,  # 24시간
        path="/",
        secure=False,  # 개발환경에서는 False, 프로덕션에서는 True로 설정
        httponly=True,  # JavaScript에서 접근 불가능하도록 설정
        samesite="lax"
    )
    
    return {"csrf_token": token}

# CSRF 보호 테스트 엔드포인트
@app.post("/api/csrf-test", tags=["security"])
async def test_csrf_protection(
    request: Request,
    _: None = Depends(verify_csrf_token)
):
    """
    CSRF 보호 기능 테스트를 위한 엔드포인트입니다.
    요청에 유효한 CSRF 토큰이 포함되어 있어야 합니다.
    """
    return {"status": "success", "message": "CSRF 보호가 정상적으로 작동합니다"}

# 헬스 체크 엔드포인트
@app.get("/health", tags=["status"])
async def health_check():
    """
    시스템 헬스 체크 엔드포인트. 서버가 정상 작동 중인지 확인합니다.
    """
    return {"status": "ok", "timestamp": from_now()}

# 커스텀 Swagger UI 엔드포인트
@app.get("/api/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """
    향상된 Swagger UI를 제공하는 커스텀 엔드포인트
    """
    return get_swagger_ui_html(
        openapi_url="/api/openapi.json",
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
        swagger_favicon_url="/static/favicon.ico",
        swagger_ui_parameters={
            "docExpansion": "none",  # 기본적으로 태그 접기
            "defaultModelsExpandDepth": 0,  # 모델 접기
            "deepLinking": True,  # URL에 태그 정보 유지
            "persistAuthorization": True,  # 인증 정보 유지
            "displayOperationId": False,  # 작업 ID 숨기기
            "filter": True,  # 필터 활성화
            "syntaxHighlight.theme": "monokai"  # 구문 강조 테마
        }
    )

# 커스텀 ReDoc 엔드포인트
@app.get("/api/redoc", include_in_schema=False)
async def redoc_html():
    """
    ReDoc 문서 UI를 제공하는 커스텀 엔드포인트
    """
    return get_redoc_html(
        openapi_url="/api/openapi.json",
        title=app.title + " - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js",
        redoc_favicon_url="/static/favicon.ico",
    )

# 커스텀 OpenAPI 스키마
@app.get("/api/openapi.json", include_in_schema=False)
async def get_openapi_schema():
    """
    커스텀 설정이 적용된 OpenAPI 스키마를 제공합니다.
    """
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=app.openapi_tags,
    )
    
    # 로고 추가
    openapi_schema["info"]["x-logo"] = {
        "url": "/static/logo.png",
        "altText": "카페 추천 시스템 로고"
    }
    
    # 서버 정보 추가
    openapi_schema["servers"] = [
        {"url": "http://116.124.191.174:15049", "description": "개발 서버"},
        {"url": "http://localhost:15049", "description": "로컬 개발 환경"}
    ]
    
    return openapi_schema

# 현재 시간 반환 유틸리티 함수
def from_now():
    """현재 시간을 ISO 8601 형식으로 반환합니다."""
    from datetime import datetime
    return datetime.now().isoformat()

# SPA 지원을 위한 catch-all 라우트 (모든 API 라우트 이후에 배치)
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    """
    프론트엔드 정적 파일 서빙 및 SPA 지원
    API 경로가 아닌 모든 경로를 프론트엔드로 라우팅
    """
    frontend_dir = os.path.join(app_settings.STATIC_DIR, "frontend")
    
    if not os.path.exists(frontend_dir):
        raise HTTPException(status_code=404, detail="Frontend not found")
    
    # 루트 경로 또는 빈 경로의 경우 index.html 반환
    if not full_path or full_path == "":
        index_path = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
    
    # 요청된 파일 경로
    file_path = os.path.join(frontend_dir, full_path)
    
    # 파일이 존재하는 경우 직접 반환
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # SPA 라우팅: 파일이 없는 경우 index.html 반환 (React Router 지원)
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    # 모든 경우에 실패하면 404
    raise HTTPException(status_code=404, detail="Page not found") 