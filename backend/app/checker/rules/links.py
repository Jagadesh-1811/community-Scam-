import os
import json
import re
import ipaddress
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from urllib.parse import urlparse
import httpx
import tldextract
from rapidfuzz.distance import DamerauLevenshtein

from app.checker.state import LinkFinding

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

HOMOGLYPHS = {
    '0': 'o',
    '1': 'l',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '8': 'b',
    'vv': 'w',
    '@': 'a',
    '$': 's'
}

def normalize_homoglyphs(text: str) -> str:
    res = text.lower()
    for k, v in HOMOGLYPHS.items():
        res = res.replace(k, v)
    return res

class LinkScanner:
    def __init__(self):
        self.brands: List[Dict[str, Any]] = []
        self.shorteners: List[str] = []
        self.suspicious_tlds: List[str] = []
        self._load_data()

    def _load_data(self):
        # Load brands
        bpath = os.path.join(DATA_DIR, "brands.json")
        if os.path.exists(bpath):
            with open(bpath, "r", encoding="utf-8") as f:
                self.brands = json.load(f)

        # Load shorteners
        spath = os.path.join(DATA_DIR, "shorteners.json")
        if os.path.exists(spath):
            with open(spath, "r", encoding="utf-8") as f:
                self.shorteners = [s.strip().lower() for s in json.load(f)]

        # Load suspicious TLDs
        tpath = os.path.join(DATA_DIR, "suspicious_tld.json")
        if os.path.exists(tpath):
            with open(tpath, "r", encoding="utf-8") as f:
                self.suspicious_tlds = [t.strip().lower().lstrip(".") for t in json.load(f)]

    async def fetch_domain_age_days(self, domain: str) -> Optional[int]:
        """Queries RDAP with 2.0s timeout to get domain creation age in days."""
        if not domain or "." not in domain:
            return None
        url = f"https://rdap.org/domain/{domain}"
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(url, headers={"Accept": "application/rdap+json"})
                if res.status_code == 200:
                    data = res.json()
                    events = data.get("events", [])
                    for ev in events:
                        if ev.get("eventAction") in ("registration", "created"):
                            dt_str = ev.get("eventDate")
                            if dt_str:
                                # Parse ISO date
                                reg_dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                                now = datetime.now(timezone.utc)
                                return max(0, (now - reg_dt).days)
        except Exception:
            # Offline or timeout - gracefully skip
            return None
        return None

    async def scan_link(self, raw_url: str) -> LinkFinding:
        clean_url = raw_url.strip()
        if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
            clean_url = "https://" + clean_url

        parsed = urlparse(clean_url)
        host = (parsed.hostname or "").lower()
        has_https = clean_url.startswith("https://")

        ext = tldextract.extract(clean_url)
        registered_domain = f"{ext.domain}.{ext.suffix}".lower() if ext.domain and ext.suffix else host
        tld = ext.suffix.lower()

        finding = LinkFinding(
            url=clean_url,
            domain=registered_domain,
            has_https=has_https
        )

        points = 0

        # 1. No HTTPS
        if not has_https:
            finding.has_no_https = True
            points += 5

        # 2. IP as host
        is_ip = False
        try:
            ipaddress.ip_address(host)
            is_ip = True
        except ValueError:
            is_ip = bool(re.match(r"^(\d{1,3}\.){3}\d{1,3}$", host))
        if is_ip:
            finding.is_ip_host = True
            points += 8

        # 3. Punycode check
        if "xn--" in host:
            finding.is_punycode = True
            points += 8

        # 4. Shortener check
        if host in self.shorteners or registered_domain in self.shorteners:
            finding.is_shortener = True
            points += 8

        # 5. Suspicious TLD check
        if tld in self.suspicious_tlds:
            finding.is_suspicious_tld = True
            points += 4

        # 6. Lookalike check against brands
        norm_host = normalize_homoglyphs(host)
        norm_reg = normalize_homoglyphs(registered_domain)
        is_lookalike = False
        matched_brand = None

        for b in self.brands:
            official_domains = [d.lower() for d in b.get("official_domains", [])]
            brand_name = b.get("name", "")
            aliases = [a.lower() for a in b.get("aliases", [])]

            # If exact official domain, it's not a lookalike
            if host in official_domains or registered_domain in official_domains:
                is_lookalike = False
                matched_brand = brand_name
                break

            # Check if domain mimics official domain (Damerau-Levenshtein <= 2)
            for off in official_domains:
                off_ext = tldextract.extract(off)
                off_root = off_ext.domain.lower()

                # Distance on root or full domain
                dist_root = DamerauLevenshtein.distance(ext.domain.lower(), off_root)
                dist_norm = DamerauLevenshtein.distance(normalize_homoglyphs(ext.domain.lower()), off_root)

                if (dist_root <= 2 and dist_root > 0) or (dist_norm <= 2 and dist_norm > 0):
                    is_lookalike = True
                    matched_brand = brand_name
                    break

                # Subdomain mimicry (e.g. sbi.pay-verify.in)
                if ext.subdomain and (off_root in ext.subdomain.lower() or any(al in ext.subdomain.lower() for al in aliases)):
                    is_lookalike = True
                    matched_brand = brand_name
                    break

            # Brand name / alias embedded in unauthorized domain (e.g. sbi-kyc-update.com)
            if not is_lookalike:
                for al in aliases:
                    if len(al) >= 3 and al in ext.domain.lower():
                        is_lookalike = True
                        matched_brand = brand_name
                        break

            if is_lookalike:
                break

        if is_lookalike:
            finding.is_lookalike = True
            finding.lookalike_brand = matched_brand
            points += 12

        # 7. RDAP Domain age check (only if not an IP or shortener)
        if not is_ip and not finding.is_shortener and registered_domain:
            age_days = await self.fetch_domain_age_days(registered_domain)
            finding.domain_age_days = age_days
            if age_days is not None:
                if age_days < 30:
                    points += 10
                elif age_days < 90:
                    points += 5

        # Cap total link points at 20
        finding.risk_points = min(20, points)
        return finding

link_scanner = LinkScanner()

