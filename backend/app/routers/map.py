from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.map import MapResponse
from app.services.map_alerts import map_alerts_service

router = APIRouter(tags=["Map"])

@router.get("/map", response_model=MapResponse)
async def get_map_clusters(
    days: int = Query(7, ge=1, le=30, description="Window of days (default 7)"),
    radius_km: float = Query(2.0, gt=0, description="Radius in km"),
    lat: Optional[float] = Query(None, description="Center latitude"),
    lng: Optional[float] = Query(None, description="Center longitude"),
    pincode: Optional[str] = Query(None, description="Optional center pincode"),
    session: AsyncSession = Depends(get_db)
):
    clusters = await map_alerts_service.get_clusters(
        session=session,
        days=days,
        radius_km=radius_km,
        center_lat=lat,
        center_lng=lng,
        filter_pincode=pincode
    )
    return MapResponse(clusters=clusters)

