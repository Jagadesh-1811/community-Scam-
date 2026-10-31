from typing import Optional, List
from pydantic import BaseModel

class LookupResponse(BaseModel):
    verdict: str
    report_count: int
    distinct_reporters: int
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    scam_type: Optional[str] = None
    display_value: str
    evidence: List[str] = []
    challenged: bool = False
    verified_name: Optional[str] = None
    category: Optional[str] = None

