import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Any
from app.checker.state import CheckState
from app.checker.rules.translation import translate_text_list

ADVICE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "advice.json"))

class AdviceManager:
    def __init__(self):
        self.advice_table: Dict[str, Any] = {}
        self._load()

    def _load(self):
        if os.path.exists(ADVICE_FILE):
            try:
                with open(ADVICE_FILE, "r", encoding="utf-8") as f:
                    self.advice_table = json.load(f)
            except Exception:
                pass

    def get_advice_for_scam_type(self, scam_type: str) -> List[str]:
        entry = self.advice_table.get(scam_type) or self.advice_table.get("other", {})
        return entry.get("advice", [])

advice_manager = AdviceManager()

async def step_advise(state: CheckState) -> CheckState:
    """
    Step 5: Advise
    - Safety advice per scam type
    - Standard national helplines (1930, cybercrime.gov.in)
    - Additional urgent actions for Suspicious and High/Critical bands
    - Report data structure for client-side on-device PDF generation
    """
    # 1. Base advice from plain table
    base_advice = advice_manager.get_advice_for_scam_type(state.scam_type)
    advice_lines = list(base_advice)

    # 2. Add high-risk actions for Suspicious and above
    if state.band in ("Suspicious", "High", "Critical"):
        urgent_steps = [
            "Never share OTPs, UPI PINs, or passwords under any circumstances.",
            "If bank or card details were submitted, call your bank immediately to freeze all online transactions.",
            "Report the fraudulent communication to the National Cyber Crime Portal at cybercrime.gov.in."
        ]
        for step in urgent_steps:
            if step not in advice_lines:
                advice_lines.append(step)

    # 3. Always include official helplines
    state.helplines = [
        "National Cyber Crime Reporting Helpline: 1930",
        "Official Complaint Portal: https://cybercrime.gov.in",
        "TRAI DND & Spam Reporting: 1909"
    ]

    # 4. Multilingual translation of advice if ui_language != 'en'
    if state.ui_language and state.ui_language != "en":
        state.advice = await translate_text_list(advice_lines, state.ui_language)
    else:
        state.advice = advice_lines

    # 5. Build on-device report data (server stores nothing!)
    now_iso = datetime.utcnow().isoformat()
    case_id = f"SCAMRADAR-{uuid.uuid4().hex[:8].upper()}"

    masked_idents = []
    for ident in state.identifiers:
        masked_idents.append({
            "type": ident.type,
            "display_value": ident.display_value,
            "verdict": ident.verdict
        })

    state.report_data = {
        "case_id": case_id,
        "timestamp": now_iso,
        "scam_type": state.scam_type,
        "risk_score": state.score,
        "risk_band": state.band,
        "signals": state.signals,
        "floors": state.floors,
        "identifiers": masked_idents,
        "notes": "Generated for on-device PDF submission to cyber cell or 1930 helpline."
    }

    return state

