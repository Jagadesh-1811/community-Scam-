from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import get_db
from app.models.models import Report, IdentifierSummary, Reporter, Challenge
from app.services.rate_limiter import rate_limiter

router = APIRouter(tags=["Admin"])

@router.post("/admin/reset")
async def admin_reset(session: AsyncSession = Depends(get_db)):
    if not settings.ENABLE_ADMIN_RESET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin reset is disabled in this environment"
        )

    # Delete all reports, summaries, reporters, challenges
    await session.execute(delete(Report))
    await session.execute(delete(IdentifierSummary))
    await session.execute(delete(Reporter))
    await session.execute(delete(Challenge))
    await session.commit()

    # Reset rate limiter
    rate_limiter.reset()

    return {"ok": True, "message": "All reports, summaries, and challenges reset to clean state"}

