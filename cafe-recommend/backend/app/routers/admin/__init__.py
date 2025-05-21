from .notifications import router as notifications_router
from .alerts import router as alerts_router
from .auth import router as auth_router

__all__ = ['notifications_router', 'alerts_router', 'auth_router'] 