from fastapi import APIRouter
from app.api.menu import availability

router = APIRouter()

# 가용성 확인 라우터 포함
router.include_router(
    availability.router,
    prefix="/availability",
    tags=["menu-availability"]
) 