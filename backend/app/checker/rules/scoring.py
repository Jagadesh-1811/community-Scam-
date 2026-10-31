from typing import Dict, List, Tuple
from app.checker.state import CheckState

UNUSUAL_PAYMENT_PATTERNS = [
    "gift card", "crypto", "bitcoin", "usdt",
    "scan qr to receive", "scan qr code to receive",
    "scan to receive", "upi collect request",
    "paytm gift card", "amazon gift card"
]

def calculate_message_score(state: CheckState) -> Tuple[int, str, Dict[str, int], List[str], bool]:
    """
    Computes deterministic message risk score (0-100), band, signals, and hard floors.
    Signals:
      - community: up to 30
      - risky_link: up to 20
      - pressure_language: up to 20
      - known_template: up to 15
      - impersonation: up to 10
      - unusual_payment: up to 5
    """
    signals: Dict[str, int] = {}
    floors: List[str] = []

    # 1. Community Signal (Max 30)
    # any identifier KNOWN_SCAM = 30, SUSPICIOUS = 15 (take max).
    # VERIFIED_BUSINESS gives 0 and does not reduce other signals.
    comm_points = 0
    has_known_scam = False
    has_community_data = False

    for ident in state.identifiers:
        if ident.verdict == "KNOWN_SCAM":
            comm_points = max(comm_points, 30)
            has_known_scam = True
            has_community_data = True
        elif ident.verdict == "SUSPICIOUS":
            comm_points = max(comm_points, 15)
            has_community_data = True
        elif ident.verdict == "VERIFIED_BUSINESS":
            has_community_data = True

    signals["community"] = comm_points

    # 2. Risky Link Signal (Max 20)
    link_points = 0
    has_unverified_link = False
    for lk in state.links:
        link_points = max(link_points, lk.risk_points)
        if not lk.has_https or lk.is_lookalike or lk.is_shortener or lk.is_ip_host or lk.is_suspicious_tld:
            has_unverified_link = True
        elif lk.url:
            has_unverified_link = True

    signals["risky_link"] = min(20, link_points)

    # 3. Pressure Language (Max 20)
    # urgency +6, threat +8, credential request +10, fee/fine demand (payment_request) +6. Cap 20.
    pressure_pts = 0
    if "urgency" in state.matched_tactics:
        pressure_pts += 6
    if "threat" in state.matched_tactics:
        pressure_pts += 8
    if "credential_request" in state.matched_tactics:
        pressure_pts += 10
    if "payment_request" in state.matched_tactics:
        pressure_pts += 6

    signals["pressure_language"] = min(20, pressure_pts)

    # 4. Known Template (Max 15)
    # rapidfuzz token_set_ratio vs templates_text.json: >= 85 = 15, 70-84 = 8
    tpl_points = 0
    if state.matched_template_ratio >= 85:
        tpl_points = 15
    elif state.matched_template_ratio >= 70:
        tpl_points = 8
    signals["known_template"] = tpl_points

    # 5. Impersonation (Max 10)
    # Brand/authority present AND sender/link not verified
    text_lower = (state.redacted_text or "").lower()
    imp_points = 0
    if state.impersonated_brand or "authority" in state.matched_tactics:
        all_verified = bool(state.identifiers) and all(i.is_verified for i in state.identifiers)
        if not all_verified:
            imp_points = 10
    elif any(term in text_lower for term in ["electricity office", "police", "customs", "telecom department", "income tax", "court"]):
        imp_points = 10
    signals["impersonation"] = imp_points

    # 6. Unusual Payment (Max 5)
    # UPI collect, gift card, crypto, "scan QR to receive"
    pay_points = 0
    if any(p in text_lower for p in UNUSUAL_PAYMENT_PATTERNS):
        pay_points = 5
    signals["unusual_payment"] = pay_points

    # Calculate raw sum
    raw_score = sum(signals.values())

    # Hard floors (record each applied floor in state.floors):
    # Floor A: credential request AND unverified link: score >= 61
    if "credential_request" in state.matched_tactics and has_unverified_link:
        if raw_score < 61:
            raw_score = 61
            floors.append("credential_request_with_unverified_link")

    # Floor B: digital-arrest pattern (authority + threat, or digital arrest warrant/police raid)
    has_authority = "authority" in state.matched_tactics or any(w in text_lower for w in ["cbi", "police", "customs", "cyber cell", "inspector", "officer"])
    has_threat = "threat" in state.matched_tactics or any(w in text_lower for w in ["arrest", "warrant", "court", "raid", "contraband", "parcel"])
    has_secrecy_or_demand = (
        "secrecy" in state.matched_tactics
        or any(w in text_lower for w in ["video call", "skype", "camera", "surveillance", "bail", "transfer", "penalty", "fine"])
    )
    if (has_authority and has_threat) or (has_threat and has_secrecy_or_demand):
        if raw_score < 68:
            raw_score = 68
            floors.append("digital_arrest_pattern")

    # Floor C: any KNOWN_SCAM identifier: score >= 61
    if has_known_scam:
        if raw_score < 61:
            raw_score = 61
            floors.append("community_known_scam")

    final_score = min(100, max(0, raw_score))

    # Bands: 0-30 Low, 31-60 Suspicious, 61-80 High, 81-100 Critical
    if final_score <= 30:
        band = "Low"
    elif final_score <= 60:
        band = "Suspicious"
    elif final_score <= 80:
        band = "High"
    else:
        band = "Critical"

    # Low with zero community data must carry the flag no_reports_not_safe = true
    no_reports_not_safe = (band == "Low" and not has_community_data)

    return final_score, band, signals, floors, no_reports_not_safe

