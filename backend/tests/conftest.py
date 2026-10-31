import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Configure test environment before importing app
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///test_scamradar.db"
os.environ["LICENSE_PUBLIC_KEY"] = "2dea54f6666e54ab09e2676e0f19698c95ba3932aaae5ead68e5aeeeebd79597"
os.environ["ENABLE_ADMIN_RESET"] = "true"

from app.main import app
from app.database import get_db, init_db, engine
from app.models.models import Base
from app.services.license_service import license_service
from app.services.rate_limiter import rate_limiter

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_db():
    # Re-create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    # Seed data
    await init_db()
    rate_limiter.reset()

    # Apply long valid licence for standard tests
    lic_path = os.path.join(os.path.dirname(__file__), "..", "licenses", "license_long.json")
    if os.path.exists(lic_path):
        with open(lic_path, "r") as f:
            lic_data = json.load(f)
        async with AsyncSession(engine) as session:
            await license_service.save_to_db(session, lic_data)

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
