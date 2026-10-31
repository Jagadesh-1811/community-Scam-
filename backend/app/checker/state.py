from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class ExtractedIdentifier(BaseModel):
    type: str  # phone, upi, url, sender_id
    value: str  # normalised value
    display_value: str  # masked unless >= 3 reporters
    verdict: str = "NO_REPORTS"
    report_count: int = 0
    distinct_reporters: int = 0
    is_verified: bool = False
    verified_name: Optional[str] = None

class LinkFinding(BaseModel):
    url: str
    domain: str
    is_shortener: bool = False
    is_lookalike: bool = False
    lookalike_brand: Optional[str] = None
    is_ip_host: bool = False
    is_punycode: bool = False
    is_suspicious_tld: bool = False
    has_https: bool = True
    domain_age_days: Optional[int] = None
    risk_points: int = 0

class HighlightSpan(BaseModel):
    start: int
    end: int
    text: str

class TraceStep(BaseModel):
    step: str
    status: str
    duration_ms: int

class CheckState(BaseModel):
    # Raw input in memory only - NEVER LOGGED, NEVER SAVED
    raw_text: str = ""
    raw_link: Optional[str] = None
    raw_image_bytes: Optional[bytes] = None
    
    # UI and Language
    ui_language: str = "en"
    detected_language: str = "en"  # en, hi, hinglish, te, ta, kn
    
    # Usability & Error
    usable: bool = True
    error_message: Optional[str] = None
    
    # Text after OCR and Presidio PII redaction
    redacted_text: str = ""
    
    # Extracted data
    identifiers: List[ExtractedIdentifier] = Field(default_factory=list)
    links: List[LinkFinding] = Field(default_factory=list)
    
    # Matched rules
    matched_lexicon_entries: List[Dict[str, Any]] = Field(default_factory=list)
    matched_tactics: List[str] = Field(default_factory=list)
    matched_template_ratio: float = 0.0
    matched_template_text: Optional[str] = None
    impersonated_brand: Optional[str] = None
    
    # Scoring & Bands
    signals: Dict[str, int] = Field(default_factory=dict)
    floors: List[str] = Field(default_factory=list)
    score: int = 0
    band: str = "Low"  # Low, Suspicious, High, Critical
    no_reports_not_safe: bool = False
    
    # Classification & Reasoning
    scam_type: str = "other"
    scam_type_scores: Dict[str, int] = Field(default_factory=dict)
    tactics: List[str] = Field(default_factory=list)
    highlights: List[HighlightSpan] = Field(default_factory=list)
    explanation: List[str] = Field(default_factory=list)
    
    # Advice & Helplines
    advice: List[str] = Field(default_factory=list)
    helplines: List[str] = Field(default_factory=list)
    report_data: Dict[str, Any] = Field(default_factory=dict)
    
    # Privacy & Execution Trace (status + timing only, NO content)
    trace: List[TraceStep] = Field(default_factory=list)

    def to_result_dict(self) -> Dict[str, Any]:
        return {
            "score": self.score,
            "band": self.band,
            "scam_type": self.scam_type,
            "signals": self.signals,
            "floors": self.floors,
            "explanation": self.explanation,
            "highlights": [h.model_dump() for h in self.highlights],
            "tactics": self.tactics,
            "identifiers": [
                {
                    "type": ident.type,
                    "display_value": ident.display_value,
                    "verdict": ident.verdict,
                    "report_count": ident.report_count,
                    "distinct_reporters": ident.distinct_reporters
                }
                for ident in self.identifiers
            ],
            "advice": self.advice,
            "helplines": self.helplines,
            "report_data": self.report_data,
            "no_reports_not_safe": self.no_reports_not_safe
        }

