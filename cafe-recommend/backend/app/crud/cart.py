from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException

from app.models.cart import Cart, CartItem
from app.schemas.cart import CartCreate, CartItemCreate, CartItemUpdate

def get_cart(db: Session, session_id: str) -> Optional[Cart]:
    return db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.menu)
    ).filter(Cart.session_id == session_id).first()

def create_cart(db: Session, cart: CartCreate) -> Cart:
    db_cart = Cart(session_id=cart.session_id)
    db.add(db_cart)
    db.commit()
    db.refresh(db_cart)
    return db_cart

def get_or_create_cart(db: Session, session_id: str) -> Cart:
    cart = get_cart(db, session_id)
    if not cart:
        cart = create_cart(db, CartCreate(session_id=session_id))
    return cart

def add_item_to_cart(
    db: Session, cart_id: int, item: CartItemCreate
) -> CartItem:
    db_item = CartItem(
        cart_id=cart_id,
        menu_id=item.menu_id,
        quantity=item.quantity,
        special_requests=item.special_requests
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # 메뉴 정보와 함께 반환
    return db.query(CartItem).options(
        joinedload(CartItem.menu)
    ).filter(CartItem.id == db_item.id).first()

def update_cart_item(
    db: Session, item_id: int, item: CartItemUpdate
) -> CartItem:
    db_item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    for field, value in item.dict(exclude_unset=True).items():
        setattr(db_item, field, value)
    
    db.commit()
    db.refresh(db_item)
    
    # 메뉴 정보와 함께 반환
    return db.query(CartItem).options(
        joinedload(CartItem.menu)
    ).filter(CartItem.id == db_item.id).first()

def remove_cart_item(db: Session, item_id: int) -> None:
    db_item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    db.delete(db_item)
    db.commit()

def clear_cart(db: Session, cart_id: int) -> None:
    db.query(CartItem).filter(CartItem.cart_id == cart_id).delete()
    db.commit()

def get_cart_items(db: Session, cart_id: int) -> List[CartItem]:
    return db.query(CartItem).options(
        joinedload(CartItem.menu)
    ).filter(CartItem.cart_id == cart_id).all() 