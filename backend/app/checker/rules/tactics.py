import os
import json
import re
from typing import Dict, List, Any, Tuple

TACTICS_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "tactics.json"))

class TacticsManager:
    def __init__(self):
        self.tactics: Dict[str, Any] = {}
        self._load()

    def _load(self):
        if os.path.exists(TACTICS_FILE):
            try:
                with open(TACTICS_FILE, "r", encoding="utf-8") as f:
                    self.tactics = json.load(f)
            except Exception:
                pass

    def match_tactics(self, text: str) -> Tuple[List[str], List[Dict[str, Any]]]:
        """
        Matches text against tactics keywords.
        Returns:
            matched_tactics: list of tactic names (e.g. ['urgency', 'threat'])
            highlights: list of dicts with {tactic, term, start, end, matched_text}
        """
        if not text:
            return [], []

        text_lower = text.lower()
        matched_tactics = []
        highlights = []

        for tactic_name, tactic_info in self.tactics.items():
            keywords_dict = tactic_info.get("keywords", {})
            tactic_matched = False

            for lang, words in keywords_dict.items():
                if not isinstance(words, list):
                    continue
                for word in words:
                    term = word.strip().lower()
                    if not term:
                        continue

                    # Regex match
                    if re.match(r"^[a-zA-Z0-9\s\-]+$", term):
                        regex = re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE)
                    else:
                        regex = re.compile(re.escape(term), re.IGNORECASE)

                    for m in regex.finditer(text_lower):
                        s, e = m.span()
                        highlights.append({
                            "tactic": tactic_name,
                            "term": term,
                            "start": s,
                            "end": e,
                            "matched_text": text[s:e]
                        })
                        tactic_matched = True

            if tactic_matched:
                matched_tactics.append(tactic_name)

        return matched_tactics, highlights

tactics_manager = TacticsManager()

