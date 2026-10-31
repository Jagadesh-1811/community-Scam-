from typing import Optional, List
from pydantic import BaseModel

class MapCluster(BaseModel):
    pincode: str
    locality: str
    city: str
    lat: float
    lng: float
    report_count: int
    severity: str
    top_scam_type: Optional[str] = None

class MapResponse(BaseModel):
    clusters: List[MapCluster]

