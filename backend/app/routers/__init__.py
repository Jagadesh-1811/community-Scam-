from app.routers.health import router as health_router
from app.routers.reports import router as reports_router
from app.routers.lookup import router as lookup_router
from app.routers.map import router as map_router
from app.routers.alerts import router as alerts_router
from app.routers.challenges import router as challenges_router
from app.routers.license import router as license_router
from app.routers.admin import router as admin_router

__all__ = [
    "health_router",
    "reports_router",
    "lookup_router",
    "map_router",
    "alerts_router",
    "challenges_router",
    "license_router",
    "admin_router"
]

