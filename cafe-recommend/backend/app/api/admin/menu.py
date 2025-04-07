from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.menu import Menu
from app.schemas.menu import MenuCreate, MenuUpdate, MenuResponse
from app.api.admin.auth import oauth2_scheme

router = APIRouter()

@router.get("/menus", response_model=List[MenuResponse])
async def get_menus(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    menus = db.query(Menu).all()
    return menus

@router.get("/menus/{menu_id}", response_model=MenuResponse)
async def get_menu(
    menu_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    menu = db.query(Menu).filter(Menu.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없습니다")
    return menu

@router.post("/menus", response_model=MenuResponse)
async def create_menu(
    menu: MenuCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        menu_data = menu.dict()
        db_menu = Menu(
            **menu_data,
            created_by=1,  # 임시로 1로 설정
            updated_by=1   # 임시로 1로 설정
        )
        db.add(db_menu)
        db.commit()
        db.refresh(db_menu)
        return db_menu
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/menus/{menu_id}", response_model=MenuResponse)
async def update_menu(
    menu_id: int,
    menu: MenuUpdate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    db_menu = db.query(Menu).filter(Menu.id == menu_id).first()
    if not db_menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없습니다")
    
    for key, value in menu.dict(exclude_unset=True).items():
        setattr(db_menu, key, value)
    
    db.commit()
    db.refresh(db_menu)
    return db_menu

@router.delete("/menus/{menu_id}")
async def delete_menu(
    menu_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    db_menu = db.query(Menu).filter(Menu.id == menu_id).first()
    if not db_menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없습니다")
    
    db.delete(db_menu)
    db.commit()
    return {"message": "메뉴가 삭제되었습니다"} 