from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .routers.chat import router as chat_router
from .routers.menus import router as menus_router

app = FastAPI()

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 origin 허용
    allow_credentials=False,  # credentials 비활성화
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

# 라우터 등록
app.include_router(chat_router)
app.include_router(menus_router)

@app.get("/")
async def root():
    return {"message": "카페 추천 시스템 API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"} 