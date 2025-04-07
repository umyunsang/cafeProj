from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from app.database import get_db
from app.models.cart import Cart, CartItem
from app.schemas.cart import CartCreate, CartItemCreate, CartItemUpdate, Cart as CartSchema
from app.crud.cart import get_cart, create_cart, add_item_to_cart, update_cart_item, remove_cart_item, clear_cart, get_or_create_cart
from app.core.auth import get_current_user
from app.models.user import User

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/cart", response_model=CartSchema)
async def get_user_cart(
    request: Request,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """사용자의 장바구니를 조회합니다."""
    try:
        session_id = x_session_id or "anonymous"
        logger.info(f"Received session ID from header: {session_id}")

        cart = get_or_create_cart(db, session_id)
        logger.info(f"Retrieved cart for session {session_id}: {cart.id if cart else 'None'}")
        
        return cart
    except Exception as e:
        logger.error(f"Error getting cart for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/cart/items", response_model=CartSchema)
async def add_to_cart(
    request: Request,
    item: CartItemCreate,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """장바구니에 항목을 추가합니다."""
    try:
        session_id = x_session_id or "anonymous"
        logger.info(f"Adding item to cart with session ID: {session_id}")
        
        cart = get_or_create_cart(db, session_id)
        logger.info(f"Found cart {cart.id} for session {session_id}")
        
        updated_cart = add_item_to_cart(db, cart.id, item)
        logger.info(f"Successfully added item to cart {cart.id}")
        
        return updated_cart
    except Exception as e:
        logger.error(f"Error adding item to cart for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/cart/items/{item_id}", response_model=CartSchema)
async def update_cart_item_quantity(
    request: Request,
    item_id: int,
    item_update: CartItemUpdate,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """장바구니 항목의 수량을 업데이트합니다."""
    try:
        session_id = x_session_id or "anonymous"
        logger.info(f"Updating cart item {item_id} with session ID: {session_id}")
        
        cart = get_or_create_cart(db, session_id)
        logger.info(f"Found cart {cart.id} for session {session_id}")
        
        updated_cart = update_cart_item(db, cart.id, item_id, item_update)
        logger.info(f"Successfully updated item {item_id} in cart {cart.id}")
        
        return updated_cart
    except Exception as e:
        logger.error(f"Error updating cart item {item_id} for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/cart/items/{item_id}", response_model=CartSchema)
async def remove_from_cart(
    request: Request,
    item_id: int,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """장바구니에서 항목을 제거합니다."""
    try:
        session_id = x_session_id or "anonymous"
        logger.info(f"Removing item {item_id} from cart with session ID: {session_id}")
        
        cart = get_or_create_cart(db, session_id)
        logger.info(f"Found cart {cart.id} for session {session_id}")
        
        updated_cart = remove_cart_item(db, cart.id, item_id)
        logger.info(f"Successfully removed item {item_id} from cart {cart.id}")
        
        return updated_cart
    except Exception as e:
        logger.error(f"Error removing cart item {item_id} for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/cart", response_model=CartSchema)
async def clear_user_cart(
    request: Request,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """장바구니를 비웁니다."""
    try:
        session_id = x_session_id or "anonymous"
        logger.info(f"Clearing cart with session ID: {session_id}")
        
        cart = get_or_create_cart(db, session_id)
        logger.info(f"Found cart {cart.id} for session {session_id}")
        
        cleared_cart = clear_cart(db, cart.id)
        logger.info(f"Successfully cleared cart {cart.id}")
        
        return cleared_cart
    except Exception as e:
        logger.error(f"Error clearing cart for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 