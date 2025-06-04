from fastapi import APIRouter
# from app.api.menu import availability  # inventory 모델 문제로 임시 비활성화

router = APIRouter()

# 가용성 확인 라우터 포함
# router.include_router(
#     availability.router,
#     prefix="/availability",
#     tags=["menu-availability"]
# )  # inventory 모델 문제로 임시 비활성화 