from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class ReportCreate(BaseModel):
    report_id: Optional[str] = None
    occurred_at: Optional[datetime] = None
    reported_at: Optional[datetime] = None
    reporter_id: str = Field(..., min_length=1)
    ip_prefix: str = Field(..., min_length=1)
    channel: str = Field(..., min_length=1)
    scam_type: str = Field(..., min_length=1)
    identifier_type: str = Field(..., min_length=1)
    identifier_value: str = Field(..., min_length=1)
    pincode: str = Field(..., min_length=1)
    locality: Optional[str] = None
    city: Optional[str] = None
    note: Optional[str] = ""
    has_screenshot: Optional[bool] = False
    amount_lost_inr: Optional[float] = 0.0

class ReportResponse(BaseModel):
    report_id: str
    case_id: str
    merged: bool

