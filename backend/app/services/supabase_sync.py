import urllib.request
import json
import logging
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("supabase_sync")

class SupabaseSync:
    def __init__(self):
        self.url = settings.SUPABASE_URL.rstrip('/') if settings.SUPABASE_URL else None
        self.key = settings.SUPABASE_SECRET_KEY or settings.SUPABASE_PUBLISHABLE_KEY

    def is_configured(self) -> bool:
        return bool(self.url and self.key)

    def _headers(self) -> Dict[str, str]:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def insert_report(self, report_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.is_configured():
            return None
        
        endpoint = f"{self.url}/rest/v1/reports"
        # Format payload for Supabase reports table
        scrubbed = str(report_dict.get("note_scrubbed") or report_dict.get("note") or "")
        payload = {
            "report_id": str(report_dict.get("report_id", "")),
            "case_id": str(report_dict.get("case_id", "")),
            "occurred_at": str(report_dict.get("occurred_at", "")),
            "reported_at": str(report_dict.get("reported_at", "")),
            "reporter_hash": str(report_dict.get("reporter_hash", "")),
            "ip_hash": str(report_dict.get("ip_hash", "")),
            "channel": str(report_dict.get("channel", "sms")),
            "scam_type": str(report_dict.get("scam_type", "digital-arrest")),
            "identifier_type": str(report_dict.get("identifier_type", "phone")),
            "identifier_value": str(report_dict.get("identifier_value", "")),
            "pincode": str(report_dict.get("pincode", "560001")),
            "locality": str(report_dict.get("locality", "")),
            "city": str(report_dict.get("city", "")),
            "note_scrubbed": scrubbed if scrubbed else report_dict.get("note", ""),
            "note_fingerprint": (scrubbed or report_dict.get("note", ""))[:100],
            "has_screenshot": bool(report_dict.get("has_screenshot", False)),
            "amount_lost_inr": float(report_dict.get("amount_lost_inr") or 0.0),
            "weight": float(report_dict.get("weight") or 1.0),
            "person_group": report_dict.get("person_group"),
            "ignored": bool(report_dict.get("ignored", False)),
            "merged": bool(report_dict.get("merged", False)),
        }

        try:
            req = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers=self._headers(),
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                logger.info(f"Report synced to Supabase: {payload['case_id']}")
                return res_data[0] if isinstance(res_data, list) and res_data else res_data
        except Exception as e:
            logger.warning(f"Supabase sync failed (offline fallback active): {e}")
            return None

    def fetch_reports(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.is_configured():
            return []
        endpoint = f"{self.url}/rest/v1/reports?select=*&order=reported_at.desc&limit={limit}"
        try:
            req = urllib.request.Request(endpoint, headers=self._headers(), method="GET")
            with urllib.request.urlopen(req, timeout=8) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.warning(f"Supabase fetch reports failed: {e}")
            return []

supabase_sync = SupabaseSync()
