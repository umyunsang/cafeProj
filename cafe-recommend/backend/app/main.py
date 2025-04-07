from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .routers.chat import router as chat_router
from .routers.menus import router as menus_router
from .routers.cart import router as cart_router
from .routers.order import router as order_router
from .api.admin import auth, dashboard, payment, menu, orders
from .routers import payment

app = FastAPI()

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://116.124.191.174:15022",  # 프론트엔드 도메인
        "http://localhost:15022",         # 로컬 개발 환경
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 라우터 등록
app.include_router(chat_router, prefix="/api")
app.include_router(menus_router, prefix="/api")
app.include_router(cart_router, prefix="/api")
app.include_router(payment.router, prefix="/api", tags=["payment"])
app.include_router(order_router, prefix="/api", tags=["order"])

# 관리자 API 라우터 등록
app.include_router(auth.router, prefix="/api/admin", tags=["admin"])
app.include_router(dashboard.router, prefix="/api/admin", tags=["admin"])
app.include_router(payment.router, prefix="/api/admin", tags=["admin"])
app.include_router(menu.router, prefix="/api/admin", tags=["admin"])
app.include_router(orders.router, prefix="/api/admin", tags=["admin"])

@app.get("/")
async def root():
    return {"message": "카페 추천 시스템 API"}

@app.get("/health")
async def health_check():
    return {"status": "ok"} 