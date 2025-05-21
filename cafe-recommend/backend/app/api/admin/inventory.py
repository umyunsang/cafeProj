from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Dict
from datetime import datetime, timedelta

from app.api.deps import get_db, get_current_active_admin
from app.models.admin import Admin
from app.models.inventory import Ingredient, IngredientStock, MenuIngredient, InventoryTransaction
from app.models.menu import MenuItem
from app.schemas.inventory import (
    Ingredient as IngredientSchema,
    IngredientCreate, 
    IngredientUpdate,
    IngredientStock as IngredientStockSchema,
    StockCreate,
    StockUpdate,
    InventoryTransaction as InventoryTransactionSchema,
    InventoryTransactionCreate,
    MenuIngredient as MenuIngredientSchema,
    MenuIngredientCreate,
    MenuIngredientUpdate,
    IngredientWithStatus,
    MenuAvailability,
    StockAlert,
    InventorySummary
)

router = APIRouter()

# 재료 관리 API
@router.get("/ingredients", response_model=List[IngredientSchema])
def get_all_ingredients(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """모든 재료 목록을 조회합니다."""
    query = db.query(Ingredient)
    if active_only:
        query = query.filter(Ingredient.is_active == True)
    
    ingredients = query.offset(skip).limit(limit).all()
    return ingredients

@router.post("/ingredients", response_model=IngredientSchema)
def create_ingredient(
    ingredient: IngredientCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """새 재료를 등록합니다."""
    # 이미 존재하는 재료인지 확인
    existing = db.query(Ingredient).filter(Ingredient.name == ingredient.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"이미 '{ingredient.name}' 재료가 존재합니다")
    
    db_ingredient = Ingredient(
        name=ingredient.name,
        description=ingredient.description,
        unit=ingredient.unit,
        min_stock_level=ingredient.min_stock_level,
        is_active=ingredient.is_active
    )
    db.add(db_ingredient)
    db.commit()
    db.refresh(db_ingredient)
    
    # 재료 생성 시 기본 재고 정보도 함께 생성
    stock = IngredientStock(
        ingredient_id=db_ingredient.id,
        current_quantity=0,
        last_restock_date=None,
        last_restock_quantity=0
    )
    db.add(stock)
    db.commit()
    
    return db_ingredient

@router.get("/ingredients/{ingredient_id}", response_model=IngredientSchema)
def get_ingredient(
    ingredient_id: int = Path(..., title="조회할 재료 ID"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """특정 재료의 상세 정보를 조회합니다."""
    ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="재료를 찾을 수 없습니다")
    return ingredient

@router.put("/ingredients/{ingredient_id}", response_model=IngredientSchema)
def update_ingredient(
    ingredient_id: int = Path(..., title="수정할 재료 ID"),
    ingredient_data: IngredientUpdate = Depends(),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """특정 재료의 정보를 수정합니다."""
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not db_ingredient:
        raise HTTPException(status_code=404, detail="재료를 찾을 수 없습니다")
    
    # 수정 가능한 필드 업데이트
    update_data = ingredient_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_ingredient, key, value)
    
    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient

@router.delete("/ingredients/{ingredient_id}", response_model=Dict)
def delete_ingredient(
    ingredient_id: int = Path(..., title="삭제할 재료 ID"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """특정 재료를 삭제(비활성화)합니다."""
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not db_ingredient:
        raise HTTPException(status_code=404, detail="재료를 찾을 수 없습니다")
    
    # 실제 삭제 대신 비활성화
    db_ingredient.is_active = False
    db.commit()
    
    return {"status": "success", "message": f"{db_ingredient.name} 재료가 비활성화되었습니다"}

# 재고 관리 API
@router.get("/stock", response_model=List[IngredientWithStatus])
def get_all_stock(
    low_stock_only: bool = False,
    out_of_stock_only: bool = False,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """모든 재료의 재고 상태를 조회합니다."""
    # 재료와 재고 정보 조인 쿼리
    ingredients = db.query(Ingredient).filter(Ingredient.is_active == True).all()
    
    result = []
    for ingredient in ingredients:
        stock_info = db.query(IngredientStock).filter(
            IngredientStock.ingredient_id == ingredient.id
        ).first()
        
        current_qty = 0
        is_in_stock = False
        stock_status = "재고 없음"
        
        if stock_info:
            current_qty = stock_info.current_quantity
            is_in_stock = current_qty > 0
            
            if current_qty <= 0:
                stock_status = "재고 없음"
            elif current_qty < ingredient.min_stock_level:
                stock_status = "부족"
            else:
                stock_status = "충분"
        
        # 필터링 조건 적용
        if low_stock_only and stock_status != "부족":
            continue
        if out_of_stock_only and stock_status != "재고 없음":
            continue
        
        # 결과에 추가
        item = IngredientWithStatus(
            **ingredient.__dict__,
            current_quantity=current_qty,
            is_in_stock=is_in_stock,
            stock_status=stock_status
        )
        result.append(item)
    
    return result

@router.put("/stock/{ingredient_id}", response_model=IngredientStockSchema)
def update_stock(
    ingredient_id: int = Path(..., title="재고를 수정할 재료 ID"),
    stock_data: StockUpdate = Depends(),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """특정 재료의 재고 정보를 업데이트합니다."""
    # 재료 존재 여부 확인
    ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="재료를 찾을 수 없습니다")
    
    # 재고 정보 조회 또는 생성
    stock = db.query(IngredientStock).filter(IngredientStock.ingredient_id == ingredient_id).first()
    if not stock:
        stock = IngredientStock(ingredient_id=ingredient_id, current_quantity=0)
        db.add(stock)
    
    # 수정 가능한 필드 업데이트
    update_data = stock_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(stock, key, value)
    
    # 재고 입고 기록
    if "current_quantity" in update_data and "last_restock_quantity" in update_data:
        stock.last_restock_date = datetime.utcnow()
    
    db.commit()
    db.refresh(stock)
    return stock

@router.post("/transactions", response_model=InventoryTransactionSchema)
def create_transaction(
    transaction: InventoryTransactionCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """재고 트랜잭션(입고/출고 등)을 기록합니다."""
    # 재료 존재 여부 확인
    ingredient = db.query(Ingredient).filter(Ingredient.id == transaction.ingredient_id).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="재료를 찾을 수 없습니다")
    
    # 트랜잭션 생성
    db_transaction = InventoryTransaction(**transaction.dict())
    db.add(db_transaction)
    
    # 재고 업데이트
    stock = db.query(IngredientStock).filter(IngredientStock.ingredient_id == transaction.ingredient_id).first()
    if not stock:
        stock = IngredientStock(
            ingredient_id=transaction.ingredient_id,
            current_quantity=0
        )
        db.add(stock)
    
    # 트랜잭션 유형에 따라 재고 수량 조정
    if transaction.transaction_type == "입고":
        stock.current_quantity += transaction.quantity
        stock.last_restock_date = datetime.utcnow()
        stock.last_restock_quantity = transaction.quantity
    elif transaction.transaction_type == "출고":
        if stock.current_quantity < transaction.quantity:
            raise HTTPException(status_code=400, detail="재고가 부족합니다")
        stock.current_quantity -= transaction.quantity
    elif transaction.transaction_type == "폐기":
        if stock.current_quantity < transaction.quantity:
            raise HTTPException(status_code=400, detail="재고가 부족합니다")
        stock.current_quantity -= transaction.quantity
    elif transaction.transaction_type == "조정":
        stock.current_quantity = transaction.quantity
    
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.get("/transactions", response_model=List[InventoryTransactionSchema])
def get_transactions(
    ingredient_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """재고 트랜잭션 내역을 조회합니다."""
    query = db.query(InventoryTransaction)
    
    # 필터 적용
    if ingredient_id:
        query = query.filter(InventoryTransaction.ingredient_id == ingredient_id)
    if transaction_type:
        query = query.filter(InventoryTransaction.transaction_type == transaction_type)
    if start_date:
        query = query.filter(InventoryTransaction.created_at >= start_date)
    if end_date:
        query = query.filter(InventoryTransaction.created_at <= end_date)
    
    # 최신순 정렬
    query = query.order_by(InventoryTransaction.created_at.desc())
    
    transactions = query.offset(skip).limit(limit).all()
    return transactions

# 메뉴-재료 관계 관리 API
@router.post("/menu-ingredients", response_model=MenuIngredientSchema)
def add_ingredient_to_menu(
    menu_ingredient: MenuIngredientCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """메뉴에 필요한 재료를 등록합니다."""
    # 메뉴 존재 여부 확인
    menu = db.query(MenuItem).filter(MenuItem.id == menu_ingredient.menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없습니다")
    
    # 재료 존재 여부 확인
    ingredient = db.query(Ingredient).filter(Ingredient.id == menu_ingredient.ingredient_id).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="재료를 찾을 수 없습니다")
    
    # 중복 확인
    existing = db.query(MenuIngredient).filter(
        MenuIngredient.menu_id == menu_ingredient.menu_id,
        MenuIngredient.ingredient_id == menu_ingredient.ingredient_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"이미 이 메뉴에 '{ingredient.name}' 재료가 등록되어 있습니다")
    
    # 메뉴-재료 관계 생성
    db_menu_ingredient = MenuIngredient(**menu_ingredient.dict())
    db.add(db_menu_ingredient)
    db.commit()
    db.refresh(db_menu_ingredient)
    
    return db_menu_ingredient

@router.get("/menu/{menu_id}/ingredients", response_model=List[MenuIngredientSchema])
def get_menu_ingredients(
    menu_id: int = Path(..., title="메뉴 ID"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """특정 메뉴에 필요한 재료 목록을 조회합니다."""
    menu = db.query(MenuItem).filter(MenuItem.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없습니다")
    
    menu_ingredients = db.query(MenuIngredient).filter(MenuIngredient.menu_id == menu_id).all()
    return menu_ingredients

@router.put("/menu-ingredients/{id}", response_model=MenuIngredientSchema)
def update_menu_ingredient(
    id: int = Path(..., title="메뉴-재료 관계 ID"),
    data: MenuIngredientUpdate = Depends(),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """메뉴에 필요한 재료 정보를 수정합니다."""
    db_menu_ingredient = db.query(MenuIngredient).filter(MenuIngredient.id == id).first()
    if not db_menu_ingredient:
        raise HTTPException(status_code=404, detail="메뉴-재료 관계를 찾을 수 없습니다")
    
    # 수정 가능한 필드 업데이트
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_menu_ingredient, key, value)
    
    db.commit()
    db.refresh(db_menu_ingredient)
    return db_menu_ingredient

@router.delete("/menu-ingredients/{id}", response_model=Dict)
def delete_menu_ingredient(
    id: int = Path(..., title="메뉴-재료 관계 ID"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """메뉴에서 재료를 제거합니다."""
    db_menu_ingredient = db.query(MenuIngredient).filter(MenuIngredient.id == id).first()
    if not db_menu_ingredient:
        raise HTTPException(status_code=404, detail="메뉴-재료 관계를 찾을 수 없습니다")
    
    db.delete(db_menu_ingredient)
    db.commit()
    
    return {"status": "success", "message": "메뉴에서 재료가 제거되었습니다"}

# 재고 분석 및 가용성 체크 API
@router.get("/dashboard", response_model=InventorySummary)
def get_inventory_dashboard(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """재고 대시보드 요약 정보를 제공합니다."""
    # 전체 재료 수
    total_ingredients = db.query(func.count(Ingredient.id)).filter(Ingredient.is_active == True).scalar() or 0
    
    # 재고 경고 목록
    alerts = []
    ingredients = db.query(Ingredient).filter(Ingredient.is_active == True).all()
    
    out_of_stock_count = 0
    low_stock_count = 0
    total_stock_value = 0
    
    for ingredient in ingredients:
        stock = db.query(IngredientStock).filter(IngredientStock.ingredient_id == ingredient.id).first()
        
        if not stock or stock.current_quantity <= 0:
            out_of_stock_count += 1
            alerts.append(StockAlert(
                ingredient_id=ingredient.id,
                ingredient_name=ingredient.name,
                current_quantity=0 if not stock else stock.current_quantity,
                min_stock_level=ingredient.min_stock_level,
                unit=ingredient.unit,
                status="재고 없음"
            ))
        elif stock.current_quantity < ingredient.min_stock_level:
            low_stock_count += 1
            alerts.append(StockAlert(
                ingredient_id=ingredient.id,
                ingredient_name=ingredient.name,
                current_quantity=stock.current_quantity,
                min_stock_level=ingredient.min_stock_level,
                unit=ingredient.unit,
                status="부족"
            ))
        
        # 재고 가치 계산 (임시 계산)
        if stock:
            total_stock_value += stock.current_quantity  # 실제로는 단가 등을 고려해야 함
    
    return InventorySummary(
        total_ingredients=total_ingredients,
        out_of_stock_count=out_of_stock_count,
        low_stock_count=low_stock_count,
        total_stock_value=total_stock_value,
        stock_alerts=alerts
    )

@router.get("/menu/{menu_id}/availability", response_model=MenuAvailability)
def check_menu_availability(
    menu_id: int = Path(..., title="메뉴 ID"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """특정 메뉴의 재고 가용성을 확인합니다."""
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
        
        if not stock or stock.current_quantity < mi.quantity_required:
            if not mi.is_optional:  # 필수 재료만 가용성에 영향
                unavailable.append(ingredient.name)
        elif stock.current_quantity < ingredient.min_stock_level:
            low_stock.append(ingredient.name)
    
    return MenuAvailability(
        menu_id=menu_id,
        is_available=len(unavailable) == 0,
        unavailable_ingredients=unavailable,
        low_stock_ingredients=low_stock
    ) 