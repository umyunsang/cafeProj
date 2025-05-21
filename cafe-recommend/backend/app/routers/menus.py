from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from ..crud import menu
from ..schemas import menu as menu_schemas
from ..db.session import get_db
from ..core.cache import cached

# 로거 설정
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/menus",
    tags=["menus"]
)

@router.get("/", response_model=List[menu_schemas.Menu])
@cached(prefix="menus_list", timeout=300)  # 5분 캐싱
def get_menus(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20,  # 기본값 조정
    category: Optional[str] = Query(None, description="메뉴 카테고리 필터")
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

@router.get("/{menu_id}", response_model=menu_schemas.Menu)
@cached(prefix="menu_detail", timeout=300)  # 5분 캐싱
def get_menu(
    menu_id: int,
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Fetching menu with id: {menu_id}")
        db_menu = menu.get(db=db, id=menu_id)
        if db_menu is None:
            logger.warning(f"Menu with id {menu_id} not found")
            raise HTTPException(
                status_code=404,
                detail="메뉴를 찾을 수 없습니다"
            )
        return db_menu
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching menu: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"메뉴를 불러오는 중 오류가 발생했습니다: {str(e)}"
        ) 