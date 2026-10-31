from typing import List, Dict, Any, Tuple
from collections import Counter
from app.checker.state import CheckState, HighlightSpan
from app.checker.rules.templates import template_matcher
from app.checker.rules.translation import translate_text_list

SCAM_TYPES = [
    "digital-arrest", "fake-kyc-link", "upi-refund-qr", "investment-group",
    "courier-customs", "job-offer", "lottery-prize", "loan-app-harassment",
    "electricity-disconnection", "fake-customer-care", "otp-call", "sextortion"
]

def resolve_scam_type(state: CheckState) -> str:
    """
    Determines scam type from the 12 types using weighted lexicon matches.
    Highest total wins. Below threshold (< 2) returns 'other'.
    If top two are within 10%, picks the one with more distinct term matches.
    """
    scores = state.scam_type_scores
    if not scores:
        # Check template match fallback
        if state.matched_template_ratio >= 85 and state.matched_template_text:
            _, _, tpl_type = template_matcher.match_known_template(state.redacted_text)
            if tpl_type in SCAM_TYPES:
                return tpl_type
        return "other"

    # Filter to only the 12 official types
    valid_scores = [(st, sc) for st, sc in scores.items() if st in SCAM_TYPES and sc >= 2]
    if not valid_scores:
        return "other"

    valid_scores.sort(key=lambda x: x[1], reverse=True)
    top_type, top_score = valid_scores[0]

    if len(valid_scores) > 1:
        second_type, second_score = valid_scores[1]
        # If top two are within 10%
        if (top_score - second_score) / top_score <= 0.10:
            # Count distinct terms matched for each
            top_terms = len({e["term"] for e in state.matched_lexicon_entries if e["scam_type"] == top_type})
            sec_terms = len({e["term"] for e in state.matched_lexicon_entries if e["scam_type"] == second_type})
            if sec_terms > top_terms:
                return second_type

    return top_type

def build_highlights(text: str, matched_entries: List[Dict[str, Any]]) -> List[HighlightSpan]:
    """
    Builds non-overlapping highlight spans.
    Guarantees that every span is a valid exact substring of text.
    """
    if not text:
        return []

    spans = []
    # Collect all candidate spans
    raw_spans = []
    for entry in matched_entries:
        s = entry.get("start", -1)
        e = entry.get("end", -1)
        if s >= 0 and e > s and e <= len(text):
            sub = text[s:e]
            raw_spans.append((s, e, sub))

    # Sort spans by start asc, length desc
    raw_spans.sort(key=lambda x: (x[0], -(x[1] - x[0])))

    # Merge overlapping spans
    merged = []
    last_end = -1
    for s, e, sub in raw_spans:
        if s >= last_end:
            # Verify exact substring invariant
            assert text[s:e] == sub, f"Highlight substring mismatch: '{text[s:e]}' != '{sub}'"
            merged.append((s, e, sub))
            last_end = e

    return [HighlightSpan(start=s, end=e, text=sub) for s, e, sub in merged]

async def step_classify_and_explain(state: CheckState) -> CheckState:
    """
    Step 4: Classify & Explain
    - Classifies into one of the 12 scam types (or 'other')
    - Extracts highlights (with assert invariant)
    - Builds explanation lines from explain_templates.json ordered by points
    - Filters wording to prevent accusing persons
    - Translates explanation if ui_language != 'en'
    """
    text = state.redacted_text or ""

    # 1. Determine scam type
    state.scam_type = resolve_scam_type(state)
    state.tactics = state.matched_tactics

    # 2. Extract highlights and verify invariant
    state.highlights = build_highlights(text, state.matched_lexicon_entries)

    # 3. Build explanation sentences ordered by signal points
    lines = []
    # Opening line
    opening = template_matcher.get_explanation_sentence("opening", "en")
    lines.append(opening)

    # Triggered signals ordered by points desc
    ordered_signals = sorted(state.signals.items(), key=lambda x: x[1], reverse=True)
    for sig_name, pts in ordered_signals:
        if pts <= 0:
            continue
        if sig_name == "community":
            # Check highest verdict
            has_known = any(i.verdict == "KNOWN_SCAM" for i in state.identifiers)
            key = "community_known_scam" if has_known else "community_suspicious"
            lines.append(template_matcher.get_explanation_sentence(key, "en"))
        elif sig_name in ("risky_link", "pressure_language", "known_template", "impersonation", "unusual_payment"):
            sent = template_matcher.get_explanation_sentence(sig_name, "en")
            if sent and sent not in lines:
                lines.append(sent)

    # Scam type line
    if state.scam_type != "other":
        type_key = f"type_{state.scam_type.replace('-', '_')}"
        type_sent = template_matcher.get_explanation_sentence(type_key, "en")
        if not type_sent:
            type_sent = f"Matches behavioral indicators associated with {state.scam_type} scams."
        lines.append(type_sent)

    # 4. Wording guard filter: ensure no accusation of an individual
    cleaned_lines = []
    for line in lines:
        filtered = line.replace("scammer is", "sender is")
        filtered = filtered.replace("the scammer", "the message")
        filtered = filtered.replace("fraudster", "unverified sender")
        cleaned_lines.append(filtered)

    # 5. Multilingual AI translation if ui_language != 'en'
    if state.ui_language and state.ui_language != "en":
        state.explanation = await translate_text_list(cleaned_lines, state.ui_language)
    else:
        state.explanation = cleaned_lines

    return state

