import hmac
import hashlib
import re
from app.config import settings

def hash_with_secret(value: str) -> str:
    """HMAC-SHA256 hash using the server secret key."""
    if not value:
        return ""
    key = settings.HMAC_SECRET_KEY.encode("utf-8")
    msg = value.strip().encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()

def scrub_note_pii(text: str) -> str:
    """
    Scrubs phone numbers, emails, and 12-digit Aadhaar-like numbers from free text.
    Keeps scam details intact while ensuring reporter privacy.
    """
    if not text:
        return ""

    # Replace emails
    text = re.sub(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "[EMAIL REDACTED]", text)

    # Replace 12-digit ID numbers (Aadhaar format: 1234 5678 9012 or 123456789012)
    text = re.sub(r"\b\d{4}\s?\d{4}\s?\d{4}\b", "[ID REDACTED]", text)

    # Replace phone numbers (10 digits with optional +91 or 0)
    text = re.sub(r"(\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}\b", "[PHONE REDACTED]", text)

    return text.strip()

def mask_display_value(identifier_type: str, identifier_value: str, distinct_reporters: int) -> str:
    """
    Hide numbers until 3 different people have reported.
    - Phone: 98XXXXX210
    - UPI: r***@okaxis
    - URL: https://sbi***.in/...
    - Sender: HD****
    """
    if distinct_reporters >= 3:
        return identifier_value

    t = identifier_type.lower()
    val = identifier_value

    if t in ("phone", "mobile", "landline", "helpline", "tollfree"):
        # e.g. +919876543210 -> 98XXXXX210
        raw_digits = re.sub(r"\D", "", val)
        if len(raw_digits) >= 10:
            ten = raw_digits[-10:]
            return f"{ten[:2]}XXXXX{ten[-3:]}"
        elif len(raw_digits) == 4:
            # 4 digit helpline
            return f"{raw_digits[0]}**{raw_digits[-1]}"
        else:
            return f"{val[:2]}***{val[-2:]}" if len(val) > 4 else "****"

    elif t in ("upi", "upi_id", "vpa"):
        # e.g. ravi12@okaxis -> r***@okaxis
        if "@" in val:
            user, domain = val.split("@", 1)
            masked_user = f"{user[0]}***" if len(user) > 0 else "***"
            return f"{masked_user}@{domain}"
        return f"{val[0]}***" if len(val) > 0 else "***"

    elif t in ("url", "link", "website"):
        # e.g. https://example.in/pay -> https://ex***le.in/pay
        prefix = "https://"
        without_scheme = val[len(prefix):] if val.startswith(prefix) else val
        parts = without_scheme.split("/", 1)
        host = parts[0]
        path = "/" + parts[1] if len(parts) > 1 else ""

        host_parts = host.split(".")
        if len(host_parts) >= 2:
            main_domain = host_parts[0]
            masked_main = (f"{main_domain[:3]}***" if len(main_domain) >= 3 else f"{main_domain[0]}***")
            masked_host = ".".join([masked_main] + host_parts[1:])
            return f"{prefix}{masked_host}{path}"
        return f"{prefix}***{path}"

    elif t in ("sender_id", "sms_sender", "sender"):
        # e.g. HDFCBK -> HD****
        if len(val) >= 2:
            return f"{val[:2]}{'*' * (len(val) - 2)}"
        return f"{val[0]}***" if len(val) > 0 else "****"

    return f"{val[:2]}****"

