import os
import json
import re
from typing import Dict, List, Any, Tuple
from rapidfuzz import fuzz

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "lexicons"))

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
        and rapidfuzz partial_ratio >= 85 for fuzzy matches.
        Returns:
            scam_scores: Dict[scam_type, total_weight]
            matched_items: List of dicts with {scam_type, term, weight, start, end}
        """
        if not text:
            return {}, []

        text_lower = text.lower()
        scam_scores: Dict[str, int] = {}
        matched_items: List[Dict[str, Any]] = []

        for scam_type, lang_dict in self.lexicons.items():
            scam_score = 0
            seen_terms = set()

            # Iterate over all language lists in the lexicon
            for lang, entries in lang_dict.items():
                if not isinstance(entries, list):
                    continue
                for entry in entries:
                    term = entry.get("term", "").strip().lower()
                    weight = entry.get("weight", 1)
                    if not term or term in seen_terms:
                        continue

                    # Exact substring match first
                    pattern = re.escape(term)
                    # Check if term is Latin or Indic script for boundary
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

                    # If not exact match, check fuzzy matching for multi-word phrases (len >= 6)
                    if not found and len(term) >= 6:
                        # Find fuzzy match across word n-grams of text
                        ratio = fuzz.partial_ratio(term, text_lower)
                        if ratio >= 85:
                            # Locate the approximate index
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
                scam_scores[scam_type] = scam_score

        return scam_scores, matched_items

lexicon_manager = LexiconManager()

