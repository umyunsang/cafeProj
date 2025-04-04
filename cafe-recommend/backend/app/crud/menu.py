from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.crud.base import CRUDBase
from app.models.menu import Menu
from app.schemas.menu import MenuCreate, MenuUpdate

class CRUDMenu(CRUDBase[Menu, MenuCreate, MenuUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Menu]:
        """이름으로 메뉴 조회"""
        return db.query(Menu).filter(Menu.name == name).first()

    def get_by_category(self, db: Session, *, category: str) -> List[Menu]:
        """카테고리로 메뉴 조회"""
        return db.query(Menu).filter(Menu.category == category).all()

    def get_by_id(self, db: Session, *, menu_id: int) -> Optional[Menu]:
        return db.query(Menu).filter(Menu.id == menu_id).first()

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None
    ) -> List[Menu]:
        """메뉴 목록 조회 (카테고리 필터링 선택적으로 지원)"""
        query = db.query(Menu)
            
        if category:
            query = query.filter(Menu.category == category)
            
        return query.offset(skip).limit(limit).all()

    def get_popular(self, db: Session, *, limit: int = 5) -> List[Menu]:
        """주문 횟수가 많은 순으로 메뉴 조회"""
        return db.query(Menu).order_by(desc(Menu.order_count)).limit(limit).all()

    def create(self, db: Session, *, menu_in: MenuCreate, admin_id: int) -> Menu:
        menu = Menu(
            name=menu_in.name,
            price=menu_in.price,
            category=menu_in.category,
            description=menu_in.description,
            order_count=0,
            created_by=admin_id,
            updated_by=admin_id
        )
        
        db.add(menu)
        db.commit()
        db.refresh(menu)
        return menu

    def update(self, db: Session, *, menu: Menu, menu_in: MenuUpdate, admin_id: int) -> Menu:
        update_data = menu_in.model_dump(exclude_unset=True)
        
        # 필드 업데이트
        for field, value in update_data.items():
            setattr(menu, field, value)
            
        menu.updated_by = admin_id
        db.commit()
        db.refresh(menu)
        return menu

    def delete(self, db: Session, *, menu_id: int, admin_id: int) -> Menu:
        menu = self.get_by_id(db, menu_id=menu_id)
        if menu:
            db.delete(menu)
            db.commit()
        return menu

    def increment_order_count(self, db: Session, menu_id: int, quantity: int = 1) -> Menu:
        menu = self.get_by_id(db, menu_id=menu_id)
        if menu:
            menu.order_count = (menu.order_count or 0) + quantity
            db.commit()
            db.refresh(menu)
        return menu

# CRUD 객체 생성
menu = CRUDMenu(Menu) 