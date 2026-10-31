import io
import re
from typing import List, Tuple
from PIL import Image
import pytesseract
from presidio_analyzer import RecognizerRegistry, PatternRecognizer, Pattern
from presidio_anonymizer import AnonymizerEngine

from app.checker.state import CheckState, ExtractedIdentifier, LinkFinding
from app.services.normaliser import normalise_identifier, normalise_url

# Regex patterns for scam identifiers
RE_URL = re.compile(r"https?://[^\s<>\"']+|www\.[^\s<>\"']+", re.IGNORECASE)
RE_UPI = re.compile(r"\b[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9]{2,}\b")
RE_HELPLINE = re.compile(r"\b(1930|1909|112|1091)\b")
RE_TOLLFREE = re.compile(r"\b(1800|1860)[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b")
RE_MOBILE = re.compile(r"(?:\+91[\-\s]?|0)?[6-9]\d{4}[\-\s]?\d{5}\b")
RE_LANDLINE = re.compile(r"(?:\+91[\-\s]?|0)\d{2,4}[\-\s]?\d{6,8}\b")
RE_SMS_SENDER = re.compile(r"\b([A-Z]{2}-?[A-Z0-9]{6})\b")

# Hinglish markers
HINGLISH_WORDS = {
    "karein", "karo", "hai", "hoga", "aaj", "turant", "paise", "bhejo",
    "rupaye", "aapka", "humara", "chahiye", "nikla", "bhejenge", "nahi",
    "raat", "bijli", "khata", "batao", "karna", "mila", "jeet", "crore"
}

# Setup regex-only Presidio recognizers (no spaCy model)
presidio_registry = RecognizerRegistry()
presidio_anonymizer = AnonymizerEngine()

pan_pattern = Pattern(name="pan_pattern", regex=r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", score=0.9)
presidio_registry.add_recognizer(PatternRecognizer(supported_entity="PAN", patterns=[pan_pattern]))

aadhaar_pattern = Pattern(name="aadhaar_pattern", regex=r"\b\d{4}\s?\d{4}\s?\d{4}\b", score=0.9)
presidio_registry.add_recognizer(PatternRecognizer(supported_entity="AADHAAR", patterns=[aadhaar_pattern]))

email_pattern = Pattern(name="email_pattern", regex=r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b", score=0.9)
presidio_registry.add_recognizer(PatternRecognizer(supported_entity="EMAIL", patterns=[email_pattern]))

phone_pattern = Pattern(name="phone_pattern", regex=r"(?:\+91[\-\s]?|0)?[6-9]\d{4}[\-\s]?\d{5}\b", score=0.85)
presidio_registry.add_recognizer(PatternRecognizer(supported_entity="PHONE", patterns=[phone_pattern]))

def detect_language(text: str) -> str:
    """Detects language based on Unicode script ranges and Hinglish keywords."""
    if not text:
        return "en"

    # Unicode ranges
    devanagari = len(re.findall(r"[\u0900-\u097F]", text))
    telugu = len(re.findall(r"[\u0C00-\u0C7F]", text))
    tamil = len(re.findall(r"[\u0B80-\u0BFF]", text))
    kannada = len(re.findall(r"[\u0C80-\u0CFF]", text))

    counts = [("hi", devanagari), ("te", telugu), ("ta", tamil), ("kn", kannada)]
    counts.sort(key=lambda x: x[1], reverse=True)
    if counts[0][1] >= 3:
        return counts[0][0]

    # Check for Hinglish
    words = set(re.findall(r"\b[a-z]{3,}\b", text.lower()))
    if len(words & HINGLISH_WORDS) >= 2:
        return "hinglish"

    return "en"

def redact_pii(text: str, excluded_identifiers: List[str]) -> str:
    """
    Redacts PII using Presidio regex recognizers.
    Excludes the extracted scam identifiers so they remain inspectable.
    """
    if not text:
        return ""

    analyzer_results = []
    for rec in presidio_registry.recognizers:
        rec_results = rec.analyze(text, entities=["PAN", "AADHAAR", "EMAIL", "PHONE"])
        for r in rec_results:
            span_text = text[r.start:r.end]
            # Don't redact if this span is an extracted scam identifier
            if any(ident in span_text or span_text in ident for ident in excluded_identifiers):
                continue
            analyzer_results.append(r)

    anonymized = presidio_anonymizer.anonymize(text, analyzer_results)
    return anonymized.text

async def step_intake(state: CheckState) -> CheckState:
    """
    Step 1: Intake
    - OCR on image (if provided)
    - Extract identifiers before redaction
    - Redact personal data (Presidio regex-only)
    - Detect language
    - Usability check
    """
    combined_text = (state.raw_text or "").strip()

    # 1. OCR on image if provided
    if state.raw_image_bytes:
        try:
            image = Image.open(io.BytesIO(state.raw_image_bytes))
            ocr_text = pytesseract.image_to_string(image, lang="eng+hin+tel+tam+kan")
            if ocr_text.strip():
                combined_text = f"{combined_text}\n{ocr_text.strip()}".strip()
        except Exception:
            # Fallback if tesseract binary is not present on host
            pass

    # If raw link is provided, append it
    if state.raw_link and state.raw_link not in combined_text:
        combined_text = f"{combined_text} {state.raw_link}".strip()

    # Usability check
    if len(combined_text) < 5:
        state.usable = False
        state.error_message = "No readable text detected. Please provide message text or a clear screenshot."
        return state

    state.detected_language = detect_language(combined_text)

    # 2. Extract identifiers BEFORE redaction
    extracted_raw = []
    seen_normalised = set()

    # Extract URLs
    for match in RE_URL.finditer(combined_text):
        raw_val = match.group(0).rstrip(".,;)>]")
        try:
            norm_val = normalise_url(raw_val)
            if norm_val not in seen_normalised:
                seen_normalised.add(norm_val)
                extracted_raw.append(raw_val)
                state.identifiers.append(ExtractedIdentifier(
                    type="url",
                    value=norm_val,
                    display_value=norm_val
                ))
                state.links.append(LinkFinding(url=norm_val, domain=""))
        except Exception:
            pass

    # Extract UPI IDs
    for match in RE_UPI.finditer(combined_text):
        raw_val = match.group(0)
        try:
            norm_val = normalise_identifier("upi", raw_val)
            if norm_val not in seen_normalised:
                seen_normalised.add(norm_val)
                extracted_raw.append(raw_val)
                state.identifiers.append(ExtractedIdentifier(
                    type="upi",
                    value=norm_val,
                    display_value=norm_val
                ))
        except Exception:
            pass

    # Extract Phones / Helplines
    phone_candidates = []
    phone_candidates.extend(RE_HELPLINE.findall(combined_text))
    phone_candidates.extend(RE_TOLLFREE.findall(combined_text))
    phone_candidates.extend(RE_MOBILE.findall(combined_text))
    phone_candidates.extend(RE_LANDLINE.findall(combined_text))

    for raw_val in phone_candidates:
        try:
            norm_val = normalise_identifier("phone", raw_val)
            if norm_val not in seen_normalised:
                seen_normalised.add(norm_val)
                extracted_raw.append(raw_val)
                state.identifiers.append(ExtractedIdentifier(
                    type="phone",
                    value=norm_val,
                    display_value=norm_val
                ))
        except Exception:
            pass

    # Extract SMS Sender IDs
    for match in RE_SMS_SENDER.finditer(combined_text):
        raw_val = match.group(1)
        try:
            norm_val = normalise_identifier("sender_id", raw_val)
            if norm_val not in seen_normalised:
                seen_normalised.add(norm_val)
                extracted_raw.append(raw_val)
                state.identifiers.append(ExtractedIdentifier(
                    type="sender_id",
                    value=norm_val,
                    display_value=norm_val
                ))
        except Exception:
            pass

    # 3. Redact personal data into redacted_text
    state.redacted_text = redact_pii(combined_text, extracted_raw)
    return state

