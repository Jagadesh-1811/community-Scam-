from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import init_db, AsyncSessionLocal
from app.services.license_service import license_service
from app.routers import (
    health_router,
    reports_router,
    lookup_router,
    map_router,
    alerts_router,
    challenges_router,
    license_router,
    admin_router
)
from app.checker.router import router as checker_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and seed areas / verified identifiers
    await init_db()
    # Preload license into memory
    async with AsyncSessionLocal() as session:
        await license_service.load_from_db(session)
        # Auto-activate long license if no valid license exists
        is_valid, _, _ = await license_service.check_license_status(session)
        if not is_valid:
            import json
            from pathlib import Path
            lic_file = Path(__file__).resolve().parent.parent / "licenses" / "license_long.json"
            if lic_file.exists():
                try:
                    with open(lic_file, "r") as f:
                        lic_data = json.load(f)
                    await license_service.save_to_db(session, lic_data)
                except Exception:
                    pass
    yield

app = FastAPI(
    title="ScamRadar Backend API",
    description="Community-driven Scam-Checking & Early-Warning Platform for India",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for Next.js frontend and mobile devices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Licence check middleware - runs on every request
@app.middleware("http")
async def license_check_middleware(request: Request, call_next):
    path = request.url.path

    # Unrestricted paths that must always work even when license is expired
    unrestricted_paths = {
        "/",
        "/health",
        "/license",
        "/docs",
        "/openapi.json",
        "/redoc"
    }

    if path not in unrestricted_paths:
        async with AsyncSessionLocal() as session:
            is_valid, status_code, _ = await license_service.check_license_status(session)
            if not is_valid:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"error": "LICENSE_EXPIRED"}
                )

    response = await call_next(request)
    return response

# Custom handler: Convert 422 validation errors to 400 {"error": "..."} per hackathon brief
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_msgs = []
    for err in exc.errors():
        field = ".".join(str(x) for x in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        error_msgs.append(f"{field}: {msg}")
    combined_msg = "; ".join(error_msgs)
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": f"Invalid request format: {combined_msg}"}
    )

# Custom handler: Format all HTTPExceptions as {"error": detail}
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        content = detail
    else:
        content = {"error": str(detail)}
    return JSONResponse(
        status_code=exc.status_code,
        content=content
    )

# Include core routers
app.include_router(health_router)
app.include_router(reports_router)
app.include_router(lookup_router)
app.include_router(map_router)
app.include_router(alerts_router)
app.include_router(challenges_router)
app.include_router(license_router)
app.include_router(admin_router)
app.include_router(checker_router)

@app.get("/")
async def root_status():
    return {
        "service": "ScamRadar India Fraud Defense Engine",
        "status": "operational",
        "version": "1.0.0",
        "docs_url": "/docs",
        "endpoints": ["/health", "/reports", "/lookup", "/map", "/alerts", "/check", "/challenges", "/license"]
    }

