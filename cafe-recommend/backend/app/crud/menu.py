from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload, contains_eager, selectinload
from sqlalchemy import desc, func, and_, or_
from sqlalchemy.sql import text
from fastapi import HTTPException

from app.crud.base import CRUDBase
from app.models.menu import MenuItem
from app.schemas.menu import MenuCreate, MenuUpdate
from app.services.ai_image_service import generate_image_with_dalle

class CRUDMenu(CRUDBase[MenuItem, MenuCreate, MenuUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[MenuItem]:
        """이름으로 메뉴 조회 - 대소문자 구분 없이 검색 최적화"""
        return db.query(MenuItem).filter(func.lower(MenuItem.name) == func.lower(name)).first()

    def get_by_category(self, db: Session, *, category: str, only_available: bool = True) -> List[MenuItem]:
        """카테고리로 메뉴 조회 - 가용성 필터링 추가"""
        query = db.query(MenuItem).filter(MenuItem.category == category)
        
        if only_available:
            query = query.filter(MenuItem.is_available == True)
            
        return query.order_by(MenuItem.name).all()

    def get_by_id(self, db: Session, *, menu_id: int, with_reviews: bool = False) -> Optional[MenuItem]:
        """ID로 메뉴 조회 - 리뷰 데이터 선택적 로딩 최적화"""
        query = db.query(MenuItem)
        
        if with_reviews:
            query = query.options(selectinload(MenuItem.reviews))
            
        return query.filter(MenuItem.id == menu_id).first()

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        only_available: bool = True,
        search_term: Optional[str] = None,
        sort_by: str = "name",
        sort_desc: bool = False
    ) -> List[MenuItem]:
        """메뉴 목록 조회 - 다양한 필터링, 정렬, 검색 옵션 추가"""
        query = db.query(MenuItem)
            
        # 필터링 적용
        if category:
            query = query.filter(MenuItem.category == category)
            
        if only_available:
            query = query.filter(MenuItem.is_available == True)
            
        # 검색어 적용
        if search_term:
            search_pattern = f"%{search_term.lower()}%"
            query = query.filter(
                or_(
                    func.lower(MenuItem.name).like(search_pattern),
                    func.lower(MenuItem.description).like(search_pattern)
                )
            )
            
        # 정렬 적용
        if sort_by == "name":
            order_column = MenuItem.name
        elif sort_by == "price":
            order_column = MenuItem.price
        elif sort_by == "popularity":
            order_column = MenuItem.order_count
        elif sort_by == "rating":
            order_column = MenuItem.avg_rating
        else:
            order_column = MenuItem.name
            
        if sort_desc:
            query = query.order_by(desc(order_column))
        else:
            query = query.order_by(order_column)
            
        # 페이지네이션
        query = query.offset(skip).limit(limit)
        
        return query.all()

    def get_popular(self, db: Session, *, limit: int = 5, category: Optional[str] = None) -> List[MenuItem]:
        """주문 횟수가 많은 순으로 메뉴 조회 - 카테고리 필터링 옵션 추가"""
        query = db.query(MenuItem).filter(MenuItem.is_available == True)
        
        if category:
            query = query.filter(MenuItem.category == category)
            
        return query.order_by(desc(MenuItem.order_count)).limit(limit).all()

    def get_menu_with_stats(self, db: Session, *, menu_id: int) -> Dict[str, Any]:
        """메뉴와 함께 관련 통계 데이터를 조회 - 복잡한 통계쿼리 최적화"""
        menu = self.get_by_id(db, menu_id=menu_id)
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found")
            
        # 집계 쿼리 최적화 예시 (한 번의 복잡한 쿼리로 여러 정보 가져오기)
        stats = db.execute(
            text("""
            SELECT 
                COUNT(r.id) as review_count,
                AVG(r.rating) as avg_rating,
                SUM(oi.quantity) as total_ordered
            FROM 
                menus m
            LEFT JOIN 
                reviews r ON m.id = r.menu_id
            LEFT JOIN 
                order_items oi ON m.id = oi.menu_id
            WHERE 
                m.id = :menu_id
            """),
            {"menu_id": menu_id}
        ).fetchone()
        
        return {
            "menu": menu,
            "stats": {
                "review_count": stats[0] or 0,
                "avg_rating": float(stats[1] or 0),
                "total_ordered": stats[2] or 0
            }
        }

    def get_menu_categories(self, db: Session) -> List[str]:
        """사용 가능한 모든 카테고리 목록 조회 - 중복 제거 쿼리 최적화"""
        return [r[0] for r in db.query(MenuItem.category).distinct().all()]

    def search_menu(
        self, 
        db: Session, 
        *, 
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[MenuItem], int]:
        """메뉴 검색 기능 - 전체 결과 수와 함께 페이지네이션된 결과 반환"""
        search_pattern = f"%{search_term.lower()}%"
        
        # 검색 조건
        search_filter = or_(
            func.lower(MenuItem.name).like(search_pattern),
            func.lower(MenuItem.description).like(search_pattern),
            func.lower(MenuItem.category).like(search_pattern)
        )
        
        # 전체 결과 수 쿼리
        total_count = db.query(func.count(MenuItem.id)).filter(search_filter).scalar()
        
        # 페이지네이션된 결과 쿼리
        results = db.query(MenuItem).filter(search_filter).order_by(MenuItem.name).offset(skip).limit(limit).all()
        
        return results, total_count

    async def create(self, db: Session, *, menu_in: MenuCreate, admin_id: int) -> MenuItem:
        final_image_url = menu_in.image_url
        if not final_image_url:
            print(f"메뉴 '{menu_in.name}'에 대한 이미지 URL이 제공되지 않았습니다. AI로 이미지 생성을 시도합니다.")
            try:
                generated_url = await generate_image_with_dalle(menu_in.name, menu_in.description)
                if generated_url:
                    final_image_url = generated_url
                else:
                    print(f"메뉴 '{menu_in.name}'에 대한 AI 이미지 생성에 실패했습니다. 이미지 없이 메뉴를 생성합니다.")
            except Exception as e:
                print(f"메뉴 '{menu_in.name}'에 대한 AI 이미지 생성 중 오류 발생: {e}. 이미지 없이 메뉴를 생성합니다.")

        menu_data = menu_in.model_dump()
        menu_data['image_url'] = final_image_url
        
        menu = MenuItem(
            **menu_data,
            order_count=0,
            created_by=admin_id,
            updated_by=admin_id
        )
        
        db.add(menu)
        db.commit()
        db.refresh(menu)
        return menu

    def update(self, db: Session, *, menu: MenuItem, menu_in: MenuUpdate, admin_id: int) -> MenuItem:
        update_data = menu_in.model_dump(exclude_unset=True)
        
        # 필드 업데이트
        for field, value in update_data.items():
            setattr(menu, field, value)
            
        menu.updated_by = admin_id
        db.commit()
        db.refresh(menu)
        return menu

    def delete(self, db: Session, *, menu_id: int, admin_id: int) -> MenuItem:
        menu = self.get_by_id(db, menu_id=menu_id)
        if menu:
            db.delete(menu)
            db.commit()
        return menu

    def increment_order_count(self, db: Session, menu_id: int, quantity: int = 1) -> MenuItem:
        """주문 카운트 증가 - 직접 SQL 쿼리로 최적화"""
        # 더 효율적인 방식으로 업데이트 (별도 select 쿼리 없이)
        db.execute(
            text("UPDATE menus SET order_count = order_count + :qty WHERE id = :menu_id"),
            {"qty": quantity, "menu_id": menu_id}
        )
        db.commit()
        
        # 업데이트된 메뉴 반환
        return self.get_by_id(db, menu_id=menu_id)
        
    def update_rating(self, db: Session, menu_id: int) -> MenuItem:
        """메뉴 평점 업데이트 - 집계 쿼리 최적화"""
        menu = self.get_by_id(db, menu_id=menu_id)
        if not menu:
            return None
            
        # 단일 트랜잭션으로 평점 계산 및 업데이트
        result = db.execute(
            text("""
            SELECT 
                COUNT(id) as review_count,
                AVG(rating) as avg_rating
            FROM 
                reviews
            WHERE 
                menu_id = :menu_id
            """),
            {"menu_id": menu_id}
        ).fetchone()
        
        menu.review_count = result[0] or 0
        menu.avg_rating = float(result[1] or 0)
        
        db.commit()
        db.refresh(menu)
        return menu

# CRUD 객체 생성
menu = CRUDMenu(MenuItem) 