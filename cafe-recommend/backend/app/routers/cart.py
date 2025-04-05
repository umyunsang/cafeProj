from typing import List
from fastapi import APIRouter, Depends, HTTPException, Cookie, Response
from sqlalchemy.orm import Session, joinedload
import uuid

from app import crud
from app.schemas import cart as cart_schema
from app.api import deps
from app.db.session import get_db

router = APIRouter()

def get_or_create_session_id(session_id: str = Cookie(None)) -> str:
    if not session_id:
        return str(uuid.uuid4())
    return session_id

@router.post("/cart", response_model=cart_schema.Cart)
def create_cart(
    response: Response,
    db: Session = Depends(get_db),
    session_id: str = Cookie(None)
):
    """Create a new cart for the session."""
    session_id = get_or_create_session_id(session_id)
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite='lax')
    return crud.cart.get_or_create_cart(db, session_id)

@router.get("/cart", response_model=cart_schema.Cart)
def get_cart(
    response: Response,
    db: Session = Depends(get_db),
    session_id: str = Cookie(None)
):
    """Get the current session's cart."""
    session_id = get_or_create_session_id(session_id)
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite='lax')
    cart = crud.cart.get_cart(db, session_id)
    if not cart:
        cart = crud.cart.create_cart(db, cart_schema.CartCreate(session_id=session_id))
    return cart

@router.post("/cart/items", response_model=cart_schema.CartItem)
def add_item_to_cart(
    item: cart_schema.CartItemCreate,
    response: Response,
    db: Session = Depends(get_db),
    session_id: str = Cookie(None)
):
    """Add an item to the current session's cart."""
    session_id = get_or_create_session_id(session_id)
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite='lax')
    cart = crud.cart.get_or_create_cart(db, session_id)
    return crud.cart.add_item_to_cart(db, cart.id, item)

@router.put("/cart/items/{item_id}", response_model=cart_schema.CartItem)
def update_cart_item(
    item_id: int,
    item: cart_schema.CartItemUpdate,
    response: Response,
    db: Session = Depends(get_db),
    session_id: str = Cookie(None)
):
    """Update a cart item."""
    session_id = get_or_create_session_id(session_id)
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite='lax')
    return crud.cart.update_cart_item(db, item_id, item)

@router.delete("/cart/items/{item_id}")
def remove_cart_item(
    item_id: int,
    response: Response,
    db: Session = Depends(get_db),
    session_id: str = Cookie(None)
):
    """Remove an item from the cart."""
    session_id = get_or_create_session_id(session_id)
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite='lax')
    crud.cart.remove_cart_item(db, item_id)
    return {"message": "Item removed from cart"}

@router.delete("/cart")
def clear_cart(
    response: Response,
    db: Session = Depends(get_db),
    session_id: str = Cookie(None)
):
    """Clear all items from the cart."""
    session_id = get_or_create_session_id(session_id)
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite='lax')
    cart = crud.cart.get_cart(db, session_id)
    if cart:
        crud.cart.clear_cart(db, cart.id)
    return {"message": "Cart cleared"} 