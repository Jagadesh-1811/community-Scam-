import math
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from collections import Counter
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Report, Area
from app.data.areas import AREA_BY_PINCODE
from app.schemas.map import MapCluster
from app.schemas.alert import AlertItem

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula to calculate great-circle distance in kilometers."""
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class MapAlertsService:
    async def get_clusters(
        self,
        session: AsyncSession,
        days: int = 7,
        radius_km: float = 2.0,
        center_lat: Optional[float] = None,
        center_lng: Optional[float] = None,
        filter_pincode: Optional[str] = None
    ) -> List[MapCluster]:
        """
        Returns clusters grouped by area for reports within the last `days` (default 7).
        Reports older than `days` never appear. Ignored reports are excluded.
        """
        now = datetime.utcnow()
        cutoff = now - timedelta(days=days)

        # Query all effective reports in the window
        stmt = select(Report).where(
            and_(
                Report.occurred_at >= cutoff,
                Report.ignored == False
            )
        )
        res = await session.execute(stmt)
        reports: List[Report] = list(res.scalars().all())

        # If center pincode provided, find its coordinates
        if filter_pincode and filter_pincode in AREA_BY_PINCODE:
            center_lat = AREA_BY_PINCODE[filter_pincode]["lat"]
            center_lng = AREA_BY_PINCODE[filter_pincode]["lng"]

        # Group reports by pincode
        reports_by_pin: Dict[str, List[Report]] = {}
        for r in reports:
            reports_by_pin.setdefault(r.pincode, []).append(r)

        clusters: List[MapCluster] = []

        # Iterate over all areas that have reports
        for pincode, pin_reports in reports_by_pin.items():
            area_info = AREA_BY_PINCODE.get(pincode)
            if not area_info:
                # Query DB area if not in static dict
                area_stmt = select(Area).where(Area.pincode == pincode)
                a_res = await session.execute(area_stmt)
                db_area = a_res.scalars().first()
                if db_area:
                    area_info = {
                        "pincode": db_area.pincode,
                        "locality": db_area.locality,
                        "city": db_area.city,
                        "lat": db_area.lat,
                        "lng": db_area.lng
                    }
                else:
                    area_info = {
                        "pincode": pincode,
                        "locality": pin_reports[0].locality or "Unknown Area",
                        "city": pin_reports[0].city or "Unknown City",
                        "lat": 12.9716,
                        "lng": 77.5946
                    }

            # If center_lat and center_lng are specified, check radius filter
            if center_lat is not None and center_lng is not None:
                dist = haversine_km(center_lat, center_lng, area_info["lat"], area_info["lng"])
                if dist > radius_km:
                    continue

            count = len(pin_reports)
            # Consolidation & Severity: count < 5 = MED, 5 to 9 = HIGH (Surge), >= 10 = CRIT (Critical Spreading)
            if count >= 10:
                severity = "CRIT"
            elif count >= 5:
                severity = "HIGH"
            else:
                severity = "MED"

            scam_counts = Counter(r.scam_type for r in pin_reports)
            top_type = scam_counts.most_common(1)[0][0] if scam_counts else None

            clusters.append(
                MapCluster(
                    pincode=pincode,
                    locality=area_info["locality"],
                    city=area_info["city"],
                    lat=area_info["lat"],
                    lng=area_info["lng"],
                    report_count=count,
                    severity=severity,
                    top_scam_type=top_type
                )
            )

        # Sort clusters by report count descending
        clusters.sort(key=lambda c: c.report_count, reverse=True)
        return clusters

    async def get_alerts_for_pincode(
        self,
        session: AsyncSession,
        pincode: Optional[str] = None
    ) -> List[AlertItem]:
        """
        Computes alerts for an area (or all areas if pincode is None):
        - SPIKE: Last 24h reports >= max(5, 2 * daily average of preceding 7 days)
        - NEW_TYPE: Scam type reported in last 24h not seen in the preceding 30 days
        Effective reports only.
        """
        now = datetime.utcnow()
        last_24h_cutoff = now - timedelta(hours=24)
        prev_7d_cutoff = now - timedelta(days=8)
        prev_30d_cutoff = now - timedelta(days=31)

        # Base filter
        filters = [
            Report.occurred_at >= prev_30d_cutoff,
            Report.ignored == False
        ]
        if pincode:
            filters.append(Report.pincode == pincode)

        stmt = select(Report).where(and_(*filters))
        res = await session.execute(stmt)
        reports: List[Report] = list(res.scalars().all())

        # Group by pincode
        reports_by_pin: Dict[str, List[Report]] = {}
        for r in reports:
            reports_by_pin.setdefault(r.pincode, []).append(r)

        alerts: List[AlertItem] = []

        for pin, pin_reps in reports_by_pin.items():
            area_info = AREA_BY_PINCODE.get(pin, {
                "locality": pin_reps[0].locality if pin_reps else "Local Area",
                "city": pin_reps[0].city if pin_reps else "City"
            })

            # Separate into time buckets
            reps_24h = [r for r in pin_reps if r.occurred_at >= last_24h_cutoff]
            reps_prev_7d = [r for r in pin_reps if prev_7d_cutoff <= r.occurred_at < last_24h_cutoff]
            reps_prev_30d = [r for r in pin_reps if prev_30d_cutoff <= r.occurred_at < last_24h_cutoff]

            count_24h = len(reps_24h)
            count_prev_7d = len(reps_prev_7d)
            daily_avg_prev = count_prev_7d / 7.0

            # 1. SPIKE Check: count_24h >= max(5, 2 * daily_avg_prev)
            spike_threshold = max(5, 2 * daily_avg_prev)
            if count_24h >= spike_threshold and count_24h >= 5:
                top_scam = Counter(r.scam_type for r in reps_24h).most_common(1)[0][0] if reps_24h else "general"
                alerts.append(
                    AlertItem(
                        type="SPIKE",
                        pincode=pin,
                        locality=area_info.get("locality"),
                        city=area_info.get("city"),
                        message=f"Spike detected in {area_info.get('locality', pin)}: {count_24h} reports in last 24h (avg: {daily_avg_prev:.1f}/day)",
                        scam_type=top_scam,
                        count_24h=count_24h,
                        created_at=now.isoformat()
                    )
                )

            # 2. NEW_TYPE Check: Scam type in last 24h not seen in preceding 30 days
            types_prev_30d = set(r.scam_type for r in reps_prev_30d)
            types_24h = set(r.scam_type for r in reps_24h)
            new_types = types_24h - types_prev_30d

            for nt in new_types:
                alerts.append(
                    AlertItem(
                        type="NEW_TYPE",
                        pincode=pin,
                        locality=area_info.get("locality"),
                        city=area_info.get("city"),
                        message=f"New scam type '{nt}' reported in {area_info.get('locality', pin)} for the first time in 30 days",
                        scam_type=nt,
                        count_24h=sum(1 for r in reps_24h if r.scam_type == nt),
                        created_at=now.isoformat()
                    )
                )

        return alerts

map_alerts_service = MapAlertsService()

