from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Optional

from app.api.deps import get_db
from app.models.menu import MenuItem
from app.models.inventory import MenuIngredient, IngredientStock, Ingredient
from app.schemas.inventory import MenuAvailability

router = APIRouter()

@router.get("/{menu_id}/availability", response_model=MenuAvailability)
def check_menu_availability(
    menu_id: int = Path(..., title="메뉴 ID"),
    db: Session = Depends(get_db)
):
    """메뉴의 재료 재고 상태 기반 가용성을 확인합니다."""
    # 메뉴 존재 여부 확인
    menu = db.query(MenuItem).filter(MenuItem.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없습니다")
    
    # 메뉴에 필요한 재료 조회
    menu_ingredients = db.query(MenuIngredient).filter(
        MenuIngredient.menu_id == menu_id
    ).all()
    
    if not menu_ingredients:
        # 메뉴에 등록된 재료가 없으면 항상 가용
        return MenuAvailability(
            menu_id=menu_id,
            is_available=True,
            unavailable_ingredients=[],
            low_stock_ingredients=[]
        )
    
    unavailable = []
    low_stock = []
    
    for mi in menu_ingredients:
        ingredient = db.query(Ingredient).filter(Ingredient.id == mi.ingredient_id).first()
        stock = db.query(IngredientStock).filter(IngredientStock.ingredient_id == mi.ingredient_id).first()
        
        # 재고가 없거나 필요한 양보다 적은 경우
        if not stock or stock.current_quantity < mi.quantity_required:
            if not mi.is_optional:  # 필수 재료만 가용성에 영향
                unavailable.append(ingredient.name)
        # 재고가 최소 수준보다 낮은 경우
        elif stock.current_quantity < ingredient.min_stock_level:
            low_stock.append(ingredient.name)
    
    # 재고 상태에 따라 메뉴 가용성 결정
    is_available = len(unavailable) == 0
    
    # 메뉴 테이블에 가용성 상태 반영 (선택적)
    if menu.is_available != is_available:
        menu.is_available = is_available
        db.commit()
    
    return MenuAvailability(
        menu_id=menu_id,
        is_available=is_available,
        unavailable_ingredients=unavailable,
        low_stock_ingredients=low_stock
    )

@router.get("/all-availability", response_model=List[MenuAvailability])
def check_all_menu_availability(
    category: Optional[str] = Query(None, title="메뉴 카테고리"),
    db: Session = Depends(get_db)
):
    """모든 메뉴(또는 지정된 카테고리의 메뉴)의 가용성을 확인합니다."""
    # 메뉴 쿼리 빌드
    query = db.query(MenuItem)
    if category:
        query = query.filter(MenuItem.category == category)
    
    menus = query.filter(MenuItem.is_active == True).all()
    result = []
    
    for menu in menus:
        # 각 메뉴의 가용성 확인
        menu_ingredients = db.query(MenuIngredient).filter(
            MenuIngredient.menu_id == menu.id
        ).all()
        
        if not menu_ingredients:
            # 메뉴에 등록된 재료가 없으면 항상 가용
            availability = MenuAvailability(
                menu_id=menu.id,
                is_available=True,
                unavailable_ingredients=[],
                low_stock_ingredients=[]
            )
            result.append(availability)
            continue
        
        unavailable = []
        low_stock = []
        
        for mi in menu_ingredients:
            ingredient = db.query(Ingredient).filter(Ingredient.id == mi.ingredient_id).first()
            stock = db.query(IngredientStock).filter(IngredientStock.ingredient_id == mi.ingredient_id).first()
            
            if not stock or stock.current_quantity < mi.quantity_required:
                if not mi.is_optional:
                    unavailable.append(ingredient.name)
            elif stock.current_quantity < ingredient.min_stock_level:
                low_stock.append(ingredient.name)
        
        is_available = len(unavailable) == 0
        
        # 메뉴 테이블에 가용성 상태 반영
        if menu.is_available != is_available:
            menu.is_available = is_available
            db.commit()
        
        availability = MenuAvailability(
            menu_id=menu.id,
            is_available=is_available,
            unavailable_ingredients=unavailable,
            low_stock_ingredients=low_stock
        )
        result.append(availability)
    
    return result

@router.post("/update-availability", response_model=Dict)
def update_menu_availability(db: Session = Depends(get_db)):
    """모든 메뉴의 가용성을 계산하고 데이터베이스에 업데이트합니다."""
    menus = db.query(MenuItem).filter(MenuItem.is_active == True).all()
    updated_count = 0
    
    for menu in menus:
        menu_ingredients = db.query(MenuIngredient).filter(
            MenuIngredient.menu_id == menu.id
        ).all()
        
        # 재료가 없는 메뉴는 항상 가용으로 설정
        if not menu_ingredients:
            if not menu.is_available:
                menu.is_available = True
                updated_count += 1
            continue
        
        # 메뉴 가용성 확인
        is_unavailable = False
        for mi in menu_ingredients:
            if mi.is_optional:
                continue  # 선택적 재료는 가용성에 영향 없음
                
            stock = db.query(IngredientStock).filter(
                IngredientStock.ingredient_id == mi.ingredient_id
            ).first()
            
            if not stock or stock.current_quantity < mi.quantity_required:
                is_unavailable = True
                break
        
        is_available = not is_unavailable
        if menu.is_available != is_available:
            menu.is_available = is_available
            updated_count += 1
    
    db.commit()
    return {
        "status": "success", 
        "message": f"{updated_count}개 메뉴의 가용성이 업데이트되었습니다"
    } 