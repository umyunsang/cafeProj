from typing import Dict, Any

from .menu import menu
# from .user import user # User CRUD 사용 안 함
from .order import order
from . import cart

# Export all crud objects
# __all__ = ["menu", "user", "order", "cart"] # 이전 __all__ 주석 처리

# For a new basic set of CRUD operations you could just do:
# from .base import CRUDBase
# from app.models.item import Item
# from app.schemas.item import ItemCreate, ItemUpdate
# item = CRUDBase[Item, ItemCreate, ItemUpdate](Item)

# CRUD 모듈 초기화 (정리된 버전)
__all__ = ["menu", "order", "cart"] # user 제외 