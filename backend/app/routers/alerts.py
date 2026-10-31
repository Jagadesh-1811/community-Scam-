from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.alert import AlertResponse
from app.services.map_alerts import map_alerts_service

router = APIRouter(tags=["Alerts"])

@router.get("/alerts", response_model=AlertResponse)
async def get_alerts(
    pincode: Optional[str] = Query(None, description="Filter alerts by pincode"),
    session: AsyncSession = Depends(get_db)
):
    alerts = await map_alerts_service.get_alerts_for_pincode(
        session=session,
        pincode=pincode
    )
    return AlertResponse(alerts=alerts)

