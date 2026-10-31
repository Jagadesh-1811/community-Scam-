import os
import json
import re
from typing import Dict, List, Any, Tuple
from rapidfuzz import fuzz

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "lexicons"))

CORE_SIGNATURES = {
    "job-offer": ["part time", "job offer", "work from home", "daily salary", "daily earning", "telegram task", "youtube like", "hotel review", "prepaid task", "vip task", "telegram group"],
    "digital-arrest": ["digital arrest", "cbi", "cyber crime police", "mumbai police", "narcotics parcel", "illegal parcel", "skype call", "video interrogation", "arrest warrant", "customs officer"],
    "electricity-disconnection": ["electricity bill", "power disconnect", "power cutoff", "electricity officer", "bescom", "tneb", "msedcl", "uppcl", "dhbvn", "update meter", "disconnection"],
    "fake-kyc-link": ["kyc update", "pan card expired", "account blocked", "sbi kyc", "hdfc kyc", "yono", "netbanking password", "update pan", "kyc expired", "aadhaar link"],
    "upi-refund-qr": ["scan qr to receive", "qr code refund", "upi collect", "olx payment", "enter upi pin to receive", "army officer buying", "advance payment qr"],
    "loan-app-harassment": ["instant loan", "loan sanction", "pre-approved loan", "loan repayment", "morphed photo", "loan app", "processing fee loan"],
    "courier-customs": ["fedex", "dhl", "customs clearance", "parcel detained", "contraband seized", "airport customs", "taiwan parcel"],
    "sextortion": ["video call recording", "leak video", "compromised video", "blackmail", "facebook relatives", "nude video"],
    "lottery-prize": ["lottery winner", "kbc lucky draw", "won 25 lakh", "claim prize", "car winner", "lucky draw"],
    "fake-customer-care": ["customer care number", "helpline number", "toll free support", "refund desk", "support helpline"],
    "otp-call": ["tell me the otp", "share one time password", "read out the 6 digit code", "verification code received", "share otp"],
    "investment-group": ["stock tips vip", "guaranteed 500% profit", "crypto investment", "institutional trading", "forex signals", "daily profit"]
}

class LexiconManager:
    def __init__(self):
        self.lexicons: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
        self._load_all()

    def _load_all(self):
        if not os.path.exists(DATA_DIR):
            return
        for fname in os.listdir(DATA_DIR):
            if fname.endswith(".json"):
                scam_name = fname[:-5]
                fpath = os.path.join(DATA_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self.lexicons[scam_name] = data
                except Exception:
                    pass

    def match_text(self, text: str) -> Tuple[Dict[str, int], List[Dict[str, Any]]]:
        """
        Matches text against all scam lexicons.
        Uses exact regex / substring with word boundaries where applicable,
        rapidfuzz token / partial ratios, and core signature phrases.
        Returns:
            scam_scores: Dict[scam_type, total_weight]
            matched_items: List of dicts with {scam_type, term, weight, start, end}
        """
        if not text:
            return {}, []

        text_lower = text.lower()
        scam_scores: Dict[str, int] = {}
        matched_items: List[Dict[str, Any]] = []

        # 1. Match core signatures for fast, highly accurate classification
        for scam_type, sigs in CORE_SIGNATURES.items():
            for sig in sigs:
                if sig in text_lower:
                    idx = text_lower.find(sig)
                    end_idx = idx + len(sig)
                    matched_items.append({
                        "scam_type": scam_type,
                        "term": sig,
                        "weight": 3,
                        "start": idx,
                        "end": end_idx,
                        "matched_text": text[idx:end_idx]
                    })
                    scam_scores[scam_type] = scam_scores.get(scam_type, 0) + 3

        # 2. Match standard lexicon lists
        for scam_type, lang_dict in self.lexicons.items():
            scam_score = 0
            seen_terms = set()

            for lang, entries in lang_dict.items():
                if not isinstance(entries, list):
                    continue
                for entry in entries:
                    term = entry.get("term", "").strip().lower()
                    weight = entry.get("weight", 1)
                    if not term or term in seen_terms:
                        continue

                    # Exact regex substring match
                    pattern = re.escape(term)
                    if re.match(r"^[a-zA-Z0-9\s\-]+$", term):
                        regex = re.compile(r"\b" + pattern + r"\b", re.IGNORECASE)
                    else:
                        regex = re.compile(pattern, re.IGNORECASE)

                    found = False
                    for match in regex.finditer(text_lower):
                        start, end = match.span()
                        matched_items.append({
                            "scam_type": scam_type,
                            "term": term,
                            "weight": weight,
                            "start": start,
                            "end": end,
                            "matched_text": text[start:end]
                        })
                        scam_score += weight
                        seen_terms.add(term)
                        found = True
                        break

                    # Fuzzy matching for phrases
                    if not found and len(term) >= 6:
                        p_ratio = fuzz.partial_ratio(term, text_lower)
                        t_ratio = fuzz.token_set_ratio(term, text_lower)
                        if max(p_ratio, t_ratio) >= 78:
                            idx = text_lower.find(term[:4])
                            if idx != -1:
                                end_idx = min(len(text), idx + len(term))
                                matched_items.append({
                                    "scam_type": scam_type,
                                    "term": term,
                                    "weight": weight,
                                    "start": idx,
                                    "end": end_idx,
                                    "matched_text": text[idx:end_idx]
                                })
                                scam_score += weight
                                seen_terms.add(term)

            if scam_score > 0:
                scam_scores[scam_type] = scam_scores.get(scam_type, 0) + scam_score

        return scam_scores, matched_items

lexicon_manager = LexiconManager()

