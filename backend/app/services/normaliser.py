import re
from urllib.parse import urlparse
import phonenumbers

# Regexes for repeated and sequential patterns
REPEATED_DIGITS = re.compile(r"^(\d)\1+$")

def _safe(raw: str, max_len: int = 60) -> str:
    """Strip HTML tags and truncate raw user input before embedding in error messages."""
    cleaned = re.sub(r"<[^>]+>", "", str(raw))  # strip HTML tags
    cleaned = cleaned[:max_len]                   # truncate
    return cleaned


def is_sequential_or_repeated(num_str: str) -> bool:
    if REPEATED_DIGITS.match(num_str):
        return True
    # Explicit sequential junk patterns (e.g. 1234567890, 0123456789, 12345678)
    if num_str in ("1234567890", "0123456789", "12345678", "1234567", "0123456"):
        return True
    return False

def normalise_phone(raw_value: str) -> str:
    cleaned = re.sub(r"[\s\-\(\)\.]", "", raw_value.strip())
    if not cleaned:
        raise ValueError("Phone number cannot be empty")

    # Check 4-digit national helplines: 1930, 1909, 112, 1091
    if cleaned in ("1930", "1909", "112", "1091") or (cleaned.isdigit() and len(cleaned) == 4):
        return cleaned

    # Check toll-free / bank care numbers starting with 1800 or 1860
    if cleaned.startswith("1800") or cleaned.startswith("1860"):
        if not cleaned.isdigit() or len(cleaned) < 8 or len(cleaned) > 12:
            raise ValueError(f"Invalid toll-free number: {_safe(raw_value)}")
        if is_sequential_or_repeated(cleaned):
            raise ValueError("Junk toll-free number detected")
        return cleaned

    # Remove leading + if present
    has_plus = cleaned.startswith("+")
    digits = cleaned[1:] if has_plus else cleaned

    if not digits.isdigit():
        raise ValueError(f"Invalid characters in phone number: {_safe(raw_value)}")

    # Standardize to 10-digit Indian number
    ten_digit = ""
    if len(digits) == 10:
        ten_digit = digits
    elif len(digits) == 11 and digits.startswith("0"):
        ten_digit = digits[1:]
    elif len(digits) == 12 and digits.startswith("91"):
        ten_digit = digits[2:]
    else:
        # Fallback check using phonenumbers library
        try:
            parsed = phonenumbers.parse(raw_value, "IN")
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except Exception:
            pass
        raise ValueError(f"Invalid phone number length or format: {_safe(raw_value)}")

    if len(ten_digit) != 10:
        raise ValueError(f"Phone number must resolve to 10 digits: {_safe(raw_value)}")

    if is_sequential_or_repeated(ten_digit):
        raise ValueError("Junk phone number detected (repeated or sequential digits)")

    # Mobile numbers or landlines with STD code
    return f"+91{ten_digit}"


def normalise_upi(raw_value: str) -> str:
    cleaned = raw_value.strip().lower()
    if not cleaned or " " in cleaned:
        raise ValueError("UPI ID cannot contain spaces or be empty")

    if "@" not in cleaned:
        raise ValueError("UPI ID must contain '@' handle")

    parts = cleaned.split("@")
    if len(parts) != 2:
        raise ValueError("Invalid UPI ID structure")

    user_part, handle_part = parts[0], parts[1]
    if not user_part or not handle_part:
        raise ValueError("UPI ID cannot have empty username or handle")

    if not re.match(r"^[a-z0-9\.\-_]{2,}$", user_part):
        raise ValueError(f"Invalid characters or too short UPI user: {_safe(user_part)}")

    if not re.match(r"^[a-z0-9]{2,}$", handle_part):
        raise ValueError(f"Invalid UPI bank handle: {_safe(handle_part)}")

    if is_sequential_or_repeated(user_part):
        raise ValueError("Junk UPI ID detected")

    return f"{user_part}@{handle_part}"


def normalise_url(raw_value: str) -> str:
    cleaned = raw_value.strip()
    if not cleaned or " " in cleaned:
        raise ValueError("URL cannot contain spaces or be empty")

    # Add https:// if no scheme is provided
    if not cleaned.startswith("http://") and not cleaned.startswith("https://"):
        cleaned = "https://" + cleaned

    parsed = urlparse(cleaned)
    host = parsed.netloc.lower()

    # Drop port if standard or split host
    if ":" in host:
        host = host.split(":")[0]

    # Drop www.
    if host.startswith("www."):
        host = host[4:]

    if not host or "." not in host or host.endswith("."):
        raise ValueError(f"Invalid domain in URL: {_safe(raw_value)}")

    # Validate host characters
    if not re.match(r"^[a-z0-9\-]+(\.[a-z0-9\-]+)+$", host):
        raise ValueError(f"Invalid domain format: {_safe(host)}")

    path = parsed.path.rstrip("/")
    normalized = f"https://{host}{path}"
    return normalized


def normalise_sender_id(raw_value: str) -> str:
    cleaned = re.sub(r"[\s\-]", "", raw_value.strip().upper())
    if not cleaned:
        raise ValueError("Sender ID cannot be empty")

    if len(cleaned) == 8 and cleaned.isalpha():
        cleaned = cleaned[2:]
    elif len(cleaned) == 6 and cleaned.isalnum():
        pass
    else:
        raise ValueError(f"Invalid SMS sender ID: {_safe(raw_value)} (expected 6 alphanumeric characters)")

    if len(cleaned) != 6:
        raise ValueError(f"Sender ID must be exactly 6 characters: {_safe(raw_value)}")

    return cleaned


def normalise_identifier(identifier_type: str, identifier_value: str) -> str:
    t = identifier_type.strip().lower()
    v = identifier_value.strip()

    if not v:
        raise ValueError("Identifier value cannot be empty")

    if t in ("phone", "mobile", "landline", "helpline", "tollfree"):
        return normalise_phone(v)
    elif t in ("upi", "upi_id", "vpa"):
        return normalise_upi(v)
    elif t in ("url", "link", "website"):
        return normalise_url(v)
    elif t in ("sender_id", "sms_sender", "sender"):
        return normalise_sender_id(v)
    else:
        raise ValueError(f"Unsupported identifier type: {_safe(identifier_type)}")
