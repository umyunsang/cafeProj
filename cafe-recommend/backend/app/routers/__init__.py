from . import menus
from . import cart
from . import payment
from . import chat
# from . import reviews # 리뷰 라우터 임포트 주석 처리
from . import admin
from . import user_identity
from . import order

from .chat import router as chat_router
from .menus import router as menus_router
from .cart import router as cart_router
from .payment import router as payment_router
# from .reviews import router as reviews_router # 리뷰 라우터 객체 임포트 주석 처리
from .user_identity import router as user_identity_router
from .admin.auth import router as admin_auth_router
from .admin.notifications import router as admin_notifications_router
from .admin.alerts import router as admin_alerts_router
from .order import router as order_router

__all__ = [
    'chat_router', 'menus_router', 'cart_router', 'payment_router', # 'reviews_router' 제거
    'user_identity_router', 'admin_auth_router', 'admin_notifications_router', 'admin_alerts_router',
    'order_router'
] 