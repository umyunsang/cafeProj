from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
import logging

from ..crud import menu
from ..schemas import menu as menu_schemas
from ..db.session import get_db

# 로거 설정
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/menus",
    tags=["menus"]
)

@router.get("/", response_model=List[menu_schemas.Menu])
def get_menus(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    category: str = None
):
    try:
        logger.info(f"Fetching menus with params: skip={skip}, limit={limit}, category={category}")
        menus = menu.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            category=category
        )
        logger.info(f"Found {len(menus)} menus")
        return menus
    except Exception as e:
        logger.error(f"Error fetching menus: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"메뉴를 불러오는 중 오류가 발생했습니다: {str(e)}"
        ) 