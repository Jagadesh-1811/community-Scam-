from typing import Optional
from pydantic import BaseModel, Field

class LicensePayload(BaseModel):
    licensee: str = Field(..., min_length=1)
    expires_at: str = Field(..., min_length=1)
    signature: str = Field(..., min_length=1)

class LicenseStatusResponse(BaseModel):
    licensee: Optional[str] = None
    expires_at: Optional[str] = None
    status: str
    time_remaining_seconds: Optional[float] = None

