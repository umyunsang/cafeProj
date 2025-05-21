from . import menus
from . import cart
from . import payment
from . import chat
from . import reviews
from . import admin
from . import user_identity
from . import order

from .chat import router as chat_router
from .menus import router as menus_router
from .cart import router as cart_router
from .payment import router as payment_router
from .reviews import router as reviews_router
from .user_identity import router as user_identity_router
from .admin.auth import router as admin_auth_router
from .admin.notifications import router as admin_notifications_router
from .admin.alerts import router as admin_alerts_router
from .order import router as order_router

__all__ = [
    'chat_router', 'menus_router', 'cart_router', 'payment_router', 'reviews_router',
    'user_identity_router', 'admin_auth_router', 'admin_notifications_router', 'admin_alerts_router',
    'order_router'
] 