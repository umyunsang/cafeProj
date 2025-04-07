from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
import logging

from app.models.cart import Cart, CartItem
from app.schemas.cart import CartCreate, CartItemCreate, CartItemUpdate

# 로깅 설정
logger = logging.getLogger(__name__)

def get_cart(db: Session, session_id: str) -> Optional[Cart]:
    try:
        cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.menu)
        ).filter(Cart.session_id == session_id).first()
        logger.info(f"Retrieved cart for session {session_id}: {cart.id if cart else 'None'}")
        return cart
    except SQLAlchemyError as e:
        logger.error(f"Database error while getting cart for session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="데이터베이스 오류가 발생했습니다")
    except Exception as e:
        logger.error(f"Unexpected error while getting cart for session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="장바구니를 불러오는 중 오류가 발생했습니다")

def create_cart(db: Session, cart: CartCreate) -> Cart:
    try:
        db_cart = Cart(session_id=cart.session_id)
        db.add(db_cart)
        db.commit()
        db.refresh(db_cart)
        logger.info(f"Created new cart for session {cart.session_id}: {db_cart.id}")
        return get_cart(db, cart.session_id)
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while creating cart for session {cart.session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="데이터베이스 오류가 발생했습니다")
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error while creating cart for session {cart.session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="장바구니를 생성하는 중 오류가 발생했습니다")

def get_or_create_cart(db: Session, session_id: str) -> Cart:
    try:
        cart = get_cart(db, session_id)
        if not cart:
            logger.info(f"Cart not found for session {session_id}, creating new cart")
            cart = create_cart(db, CartCreate(session_id=session_id))
        return cart
    except Exception as e:
        logger.error(f"Error in get_or_create_cart for session {session_id}: {str(e)}")
        raise

def add_item_to_cart(
    db: Session, cart_id: int, item: CartItemCreate
) -> Cart:
    try:
        # 기존 아이템이 있는지 확인
        existing_item = db.query(CartItem).filter(
            CartItem.cart_id == cart_id,
            CartItem.menu_id == item.menu_id
        ).first()

        if existing_item:
            # 기존 아이템이 있으면 수량만 증가
            existing_item.quantity += item.quantity
            logger.info(f"Updated quantity of existing item {existing_item.id} in cart {cart_id}")
            db.commit()
        else:
            # 새 아이템 추가
            db_item = CartItem(
                cart_id=cart_id,
                menu_id=item.menu_id,
                quantity=item.quantity,
                special_requests=item.special_requests
            )
            db.add(db_item)
            logger.info(f"Added new item to cart {cart_id}")
            db.commit()
        
        # 업데이트된 장바구니 반환
        cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.menu)
        ).filter(Cart.id == cart_id).first()
        
        return cart
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while adding item to cart {cart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="데이터베이스 오류가 발생했습니다")
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error while adding item to cart {cart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="장바구니에 항목을 추가하는 중 오류가 발생했습니다")

def update_cart_item(
    db: Session, cart_id: int, item_id: int, item: CartItemUpdate
) -> Cart:
    try:
        db_item = db.query(CartItem).filter(
            CartItem.id == item_id,
            CartItem.cart_id == cart_id
        ).first()
        
        if not db_item:
            logger.error(f"Cart item {item_id} not found in cart {cart_id}")
            raise HTTPException(status_code=404, detail="장바구니 항목을 찾을 수 없습니다")
        
        for field, value in item.dict(exclude_unset=True).items():
            setattr(db_item, field, value)
        
        logger.info(f"Updated item {item_id} in cart {cart_id}")
        db.commit()
        
        # 업데이트된 장바구니 반환
        cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.menu)
        ).filter(Cart.id == cart_id).first()
        
        return cart
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while updating item {item_id} in cart {cart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="데이터베이스 오류가 발생했습니다")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error while updating item {item_id} in cart {cart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="장바구니 항목을 수정하는 중 오류가 발생했습니다")

def remove_cart_item(db: Session, cart_id: int, item_id: int) -> Cart:
    try:
        db_item = db.query(CartItem).filter(
            CartItem.id == item_id,
            CartItem.cart_id == cart_id
        ).first()
        
        if not db_item:
            logger.error(f"Cart item {item_id} not found in cart {cart_id}")
            raise HTTPException(status_code=404, detail="장바구니 항목을 찾을 수 없습니다")
        
        db.delete(db_item)
        logger.info(f"Removed item {item_id} from cart {cart_id}")
        db.commit()
        
        # 업데이트된 장바구니 반환
        cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.menu)
        ).filter(Cart.id == cart_id).first()
        
        return cart
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while removing item {item_id} from cart {cart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="데이터베이스 오류가 발생했습니다")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error while removing item {item_id} from cart {cart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="장바구니 항목을 삭제하는 중 오류가 발생했습니다")

def clear_cart(db: Session, cart_id: int) -> Cart:
    try:
        db.query(CartItem).filter(CartItem.cart_id == cart_id).delete()
        logger.info(f"Cleared all items from cart {cart_id}")
        db.commit()
        
        # 비워진 장바구니 반환
        cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.menu)
        ).filter(Cart.id == cart_id).first()
        
        return cart
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while clearing cart {cart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="데이터베이스 오류가 발생했습니다")
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error while clearing cart {cart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="장바구니를 비우는 중 오류가 발생했습니다")

def get_cart_items(db: Session, cart_id: int) -> List[CartItem]:
    try:
        items = db.query(CartItem).options(
            joinedload(CartItem.menu)
        ).filter(CartItem.cart_id == cart_id).all()
        logger.info(f"Retrieved {len(items)} items from cart {cart_id}")
        return items
    except SQLAlchemyError as e:
        logger.error(f"Database error while getting items from cart {cart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="데이터베이스 오류가 발생했습니다")
    except Exception as e:
        logger.error(f"Unexpected error while getting items from cart {cart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="장바구니 항목을 불러오는 중 오류가 발생했습니다") 