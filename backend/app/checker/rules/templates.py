import os
import json
from typing import Dict, List, Any, Tuple, Optional
from rapidfuzz import fuzz

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

class TemplateMatcher:
    def __init__(self):
        self.templates: List[Dict[str, Any]] = []
        self.explain_templates: Dict[str, Any] = {}
        self._load()

    def _load(self):
        # Load known scam templates
        tpath = os.path.join(DATA_DIR, "templates_text.json")
        if os.path.exists(tpath):
            with open(tpath, "r", encoding="utf-8") as f:
                self.templates = json.load(f)

        # Load explanation templates
        epath = os.path.join(DATA_DIR, "explain_templates.json")
        if os.path.exists(epath):
            with open(epath, "r", encoding="utf-8") as f:
                self.explain_templates = json.load(f)

    def match_known_template(self, text: str) -> Tuple[float, Optional[str], Optional[str]]:
        """
        Uses rapidfuzz token_set_ratio against known scam templates.
        Returns: (highest_ratio, matched_template_text, matched_scam_type)
        """
        if not text or not self.templates:
            return 0.0, None, None

        clean_text = text.strip()
        best_ratio = 0.0
        best_template = None
        best_scam_type = None

        for item in self.templates:
            tpl_text = item.get("text", "")
            ratio = fuzz.token_set_ratio(clean_text, tpl_text)
            if ratio > best_ratio:
                best_ratio = ratio
                best_template = tpl_text
                best_scam_type = item.get("scam_type")

        return best_ratio, best_template, best_scam_type

    def get_explanation_sentence(self, signal_key: str, lang: str = "en") -> str:
        """Retrieves explanation sentence for a signal in requested language with English fallback."""
        entry = self.explain_templates.get(signal_key, {})
        if isinstance(entry, dict):
            return entry.get(lang) or entry.get("en") or ""
        return str(entry)

template_matcher = TemplateMatcher()

