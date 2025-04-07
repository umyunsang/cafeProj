from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Cookie, Response, Header
from sqlalchemy.orm import Session, joinedload
import uuid
import logging

from app import crud
from app.schemas import cart as cart_schema
from app.api import deps
from app.db.session import get_db
from app.models.cart import Cart, CartItem

router = APIRouter()
logger = logging.getLogger(__name__)

def get_or_create_session_id(
    response: Response,
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
) -> str:
    """세션 ID를 가져오거나 생성"""
    effective_session_id = x_session_id or session_id
    
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="세션 ID가 필요합니다.")
    
    # 세션 쿠키 설정
    set_session_cookie(response, effective_session_id)
    return effective_session_id

def set_session_cookie(response: Response, session_id: str):
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=True,  # HTTPS에서만 전송
        samesite='strict',  # CSRF 방지
        path="/",  # 모든 경로에서 접근 가능
        max_age=3600 * 24 * 7  # 7일 유효
    )

@router.post("/cart", response_model=cart_schema.Cart)
def create_cart(
    response: Response,
    db: Session = Depends(get_db),
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Create a new cart for the session."""
    session_id = get_or_create_session_id(response, session_id, x_session_id)
    return crud.cart.get_or_create_cart(db, session_id)

@router.get("/cart", response_model=cart_schema.Cart)
def get_cart(
    response: Response,
    db: Session = Depends(get_db),
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Get the current session's cart."""
    try:
        effective_session_id = get_or_create_session_id(response, session_id, x_session_id)
        
        cart = crud.cart.get_cart(db, effective_session_id)
        if not cart:
            cart = crud.cart.create_cart(db, cart_schema.CartCreate(session_id=effective_session_id))
        return cart
    except Exception as e:
        logger.error(f"장바구니 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="장바구니 조회 중 오류가 발생했습니다.")

@router.post("/cart/items", response_model=cart_schema.Cart)
def add_item_to_cart(
    item: cart_schema.CartItemCreate,
    response: Response,
    db: Session = Depends(get_db),
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Add an item to the current session's cart."""
    try:
        effective_session_id = get_or_create_session_id(response, session_id, x_session_id)
        
        cart = crud.cart.get_or_create_cart(db, effective_session_id)
        if not cart:
            raise HTTPException(status_code=404, detail="장바구니를 찾을 수 없습니다.")
        
        # 메뉴 존재 여부 확인
        menu = crud.menu.get_by_id(db=db, menu_id=item.menu_id)
        if not menu:
            raise HTTPException(status_code=404, detail="메뉴를 찾을 수 없습니다.")
        
        # 장바구니에 항목 추가
        cart_item = crud.cart.add_item_to_cart(db, cart.id, item)
        return crud.cart.get_cart(db, effective_session_id)
    except Exception as e:
        logger.error(f"장바구니 항목 추가 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="장바구니 항목 추가 중 오류가 발생했습니다.")

@router.put("/cart/items/{item_id}", response_model=cart_schema.Cart)
def update_cart_item(
    item_id: int,
    item: cart_schema.CartItemUpdate,
    response: Response,
    db: Session = Depends(get_db),
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Update a cart item."""
    try:
        effective_session_id = get_or_create_session_id(response, session_id, x_session_id)
        
        cart = crud.cart.get_cart(db, effective_session_id)
        if not cart:
            raise HTTPException(status_code=404, detail="장바구니를 찾을 수 없습니다.")
        
        # 장바구니 항목 업데이트
        updated_item = crud.cart.update_cart_item(db, cart.id, item_id, item)
        if not updated_item:
            raise HTTPException(status_code=404, detail="장바구니 항목을 찾을 수 없습니다.")
        
        return crud.cart.get_cart(db, effective_session_id)
    except Exception as e:
        logger.error(f"장바구니 항목 수정 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="장바구니 항목 수정 중 오류가 발생했습니다.")

@router.delete("/cart/items/{item_id}", response_model=cart_schema.Cart)
def remove_cart_item(
    item_id: int,
    response: Response,
    db: Session = Depends(get_db),
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Remove an item from the cart."""
    try:
        effective_session_id = get_or_create_session_id(response, session_id, x_session_id)
        
        cart = crud.cart.get_cart(db, effective_session_id)
        if not cart:
            raise HTTPException(status_code=404, detail="장바구니를 찾을 수 없습니다.")
        
        # 장바구니 항목 삭제
        deleted = crud.cart.remove_cart_item(db, cart.id, item_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="장바구니 항목을 찾을 수 없습니다.")
        
        return crud.cart.get_cart(db, effective_session_id)
    except Exception as e:
        logger.error(f"장바구니 항목 삭제 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="장바구니 항목 삭제 중 오류가 발생했습니다.")

@router.delete("/cart", response_model=cart_schema.Cart)
def clear_cart(
    response: Response,
    session_id: Optional[str] = Cookie(None),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """장바구니 비우기"""
    try:
        effective_session_id = get_or_create_session_id(response, session_id, x_session_id)
        logger.info(f"장바구니 비우기 시도 - 세션 ID: {effective_session_id}")
        
        # 장바구니 조회
        cart = crud.cart.get_cart(db, effective_session_id)
        if not cart:
            logger.info(f"장바구니가 없음 - 세션 ID: {effective_session_id}")
            # 빈 장바구니 생성 및 반환
            cart = crud.cart.create_cart(db, cart_schema.CartCreate(session_id=effective_session_id))
            return cart
        
        try:
            # 장바구니 아이템 삭제
            items_count = db.query(CartItem).filter(CartItem.cart_id == cart.id).count()
            logger.info(f"삭제할 장바구니 아이템 수: {items_count}")
            
            # 장바구니 아이템 삭제
            db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
            
            # 장바구니 업데이트
            cart.total_price = 0
            db.commit()
            db.refresh(cart)
            
            logger.info(f"장바구니 비우기 성공 - 세션 ID: {effective_session_id}")
            return cart
            
        except Exception as e:
            db.rollback()
            logger.error(f"장바구니 비우기 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="장바구니를 비우는 중 오류가 발생했습니다."
            )
            
    except Exception as e:
        logger.error(f"장바구니 비우기 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="장바구니를 비우는 중 오류가 발생했습니다."
        ) 