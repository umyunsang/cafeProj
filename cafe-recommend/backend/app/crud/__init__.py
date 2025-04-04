from typing import Dict, Any

from .menu import menu
from .user import user
from .order import order

# Export all crud objects
__all__ = ["menu", "user", "order"]

# For a new basic set of CRUD operations you could just do:
# from .base import CRUDBase
# from app.models.item import Item
# from app.schemas.item import ItemCreate, ItemUpdate
# item = CRUDBase[Item, ItemCreate, ItemUpdate](Item) 

# CRUD 모듈 초기화
__all__ = ["menu", "user"] 