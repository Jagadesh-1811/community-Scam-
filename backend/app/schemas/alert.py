from typing import Optional, List
from pydantic import BaseModel

class AlertItem(BaseModel):
    type: str  # SPIKE or NEW_TYPE
    pincode: str
    locality: Optional[str] = None
    city: Optional[str] = None
    message: str
    scam_type: Optional[str] = None
    count_24h: Optional[int] = None
    created_at: str

class AlertResponse(BaseModel):
    alerts: List[AlertItem]

