from enum import Enum
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error: str

class IdentifierType(str, Enum):
    phone = "phone"
    upi = "upi"
    url = "url"
    sender_id = "sender_id"

class VerdictEnum(str, Enum):
    KNOWN_SCAM = "KNOWN_SCAM"
    SUSPICIOUS = "SUSPICIOUS"
    NO_REPORTS = "NO_REPORTS"
    VERIFIED_BUSINESS = "VERIFIED_BUSINESS"

class SeverityEnum(str, Enum):
    MED = "MED"
    HIGH = "HIGH"
    CRIT = "CRIT"

