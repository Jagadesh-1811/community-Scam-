from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.config import settings
from app.models.models import Base, Area, VerifiedIdentifier
from app.data.areas import SEED_AREAS
from app.data.verified import SEED_VERIFIED_IDENTIFIERS

# Normalize Supabase / Postgres URLs
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Determine connection args for SQLite vs Postgres
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    db_url,
    connect_args=connect_args,
    echo=False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed initial areas and verified identifiers if not present
    async with AsyncSessionLocal() as session:
        # Check areas
        res = await session.execute(select(Area).limit(1))
        if not res.scalars().first():
            for area_data in SEED_AREAS:
                area = Area(**area_data)
                session.add(area)
            await session.commit()

        # Check verified identifiers
        res_v = await session.execute(select(VerifiedIdentifier).limit(1))
        if not res_v.scalars().first():
            for v_data in SEED_VERIFIED_IDENTIFIERS:
                vi = VerifiedIdentifier(**v_data)
                session.add(vi)
            await session.commit()

