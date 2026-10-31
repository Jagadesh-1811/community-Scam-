# ScamRadar Backend

FastAPI + SQLAlchemy async backend for **ScamRadar**, the anonymous, multilingual scam-checking and community early-warning platform for India (CyberForge Hackathon Problem #4).

---

## 1. Quick Start

### Prerequisites
- Python 3.11+
- (Optional) Docker

### Installation & Run
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be live at `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.

---

## 2. API Contract & Endpoints

All responses are JSON. No user login required.

| # | Endpoint | Description | Replies |
|---|---|---|---|
| 1 | `GET /health` | Healthcheck (always works, even if licence expired) | `200 {"ok": true}` |
| 2 | `POST /reports` | Submit anonymous scam report | `201 {"report_id", "case_id", "merged"}`, `400 {"error"}`, `429` |
| 3 | `GET /lookup?type=&value=` | Query telephone, UPI ID, URL, SMS sender in < 0.5s | `200` with verdict, masked display value, counts, evidence; `400` for invalid |
| 4 | `GET /map` | Area clusters (last 7 days, 25 official areas) | `200 {"clusters": [...]}` |
| 5 | `GET /alerts?pincode=` | Dynamic alerts (SPIKE & NEW_TYPE) | `200 {"alerts": [...]}` |
| 6 | `POST /challenges` | Business dispute bonus feature | `201 {"challenge_id", "status": "under_review"}` |
| 7 | `POST /admin/reset` | Resets reports and summaries for clean state | `200 {"ok": true}` |
| + | `GET /license`, `POST /license` | Ed25519 licence verification and renewal | `200` |

---

## 3. Trust Engine & Fake Report Defence

The backend scores **independence**, not merely raw report volume. It defeats:
1. **Report-Bombing (Farmed Accounts):** Brand new accounts carry low baseline weight ($0.3$). Reports in coordinated burst windows with low Shannon entropy ($< 0.35$) are flagged as ignored waves and capped.
2. **Same-Network / WiFi Farm (22 accounts, 1 IP):** Reporters sharing an IP prefix within 24 hours are collapsed via **Union-Find** into 1 person group (`distinct_reporters = 1`).
3. **Repeated Submissions (Same reporter):** Merged into one record (`merged: true`) and rate-limited.
4. **Copy-Pasted Notes:** Character 3-gram **Jaccard similarity** ($\ge 0.7$) detects duplicate notes across different accounts and merges them into one voice.
5. **Junk Inputs:** Rejected at validation with `400 {"error": "..."}`.

### Verdict Resolution:
1. **`VERIFIED_BUSINESS`**: Entity is in the verified database table (National helplines 1930, 1909, 112, official banks, verified SMS headers). Always wins.
2. **Under Review**: If actively challenged via `/challenges`, the number is **never** labelled `KNOWN_SCAM` (demoted to `SUSPICIOUS`, `challenged: true`).
3. **`KNOWN_SCAM`**: $\ge 3$ distinct independent person groups **and** effective score $\ge 3.0$.
4. **`SUSPICIOUS`**: Trusted reports exist but have not met the `KNOWN_SCAM` threshold.
5. **`NO_REPORTS`**: 200 OK (never 404).

---

## 4. Privacy & Masking

- **Reporters stay anonymous:** No names, exact addresses, or raw IPs stored. Reporter ID and IP prefix are hashed via HMAC-SHA256 with a server secret.
- **Display masking:** Numbers, UPI IDs, URLs, and SMS senders are masked (`98XXXXX210`, `r***@okaxis`, `sbi***.in/...`, `HD****`) until at least 3 independent people have reported.
- **Scrubbing:** Notes are scrubbed of personal phone numbers, emails, and 12-digit Aadhaar-like IDs prior to storage.
- **Wording:** Uses non-defamatory phrasing ("Reported by N people near you") rather than accusing individuals.

---

## 5. Ed25519 Licence System (15 Marks Live Demo)

- Every request passes through `license_check_middleware` (except `/health` and `/license`).
- Verifies Ed25519 cryptographic signature over canonical payload `f"{licensee}:{expires_at}"` using public key built into the server configuration.
- **Expired:** Returns `403 {"error": "LICENSE_EXPIRED"}`. Existing database reports are **never deleted**.
- **Dynamic Renewal:** `POST /license` accepts a signed file and instantly restores access **without server restart**.
- **Clock Rollback Guard:** Tracks `last_seen_time` in database and rejects requests if system time is manipulated backwards.

### Demo Licence Files:
Pre-generated under `backend/licenses/`:
- `license_5min.json` (Expires in 5 minutes for live judge demo)
- `license_long.json` (1-year validity for standard operation)
- `license_expired.json` (Already expired to demonstrate instant 403 block)

Generate new licences anytime:
```bash
python scripts/generate_license.py --minutes 5
```

---

## 6. Message Checker (Rule-Based Scam & Screenshot Scanner)

The Message Checker evaluates suspicious text, links, or uploaded screenshots across India's top 12 scam archetypes.

### How the Message Score Works (0 - 100)
The risk score is completely deterministic and computed from 6 transparent signals:

| Signal | Maximum | Computation Rules |
|---|---|---|
| **Community** | 30 | Identifier marked `KNOWN_SCAM` = 30 pts; `SUSPICIOUS` = 15 pts (max across all found identifiers). `VERIFIED_BUSINESS` = 0 pts and never diminishes other risk signals. |
| **Risky Link** | 20 | Lookalike domain (+12), shortener (+8), IP as host (+8), punycode `xn--` (+8), unencrypted HTTP (+5), suspicious TLD (+4), domain age <30d (+10) or 30-90d (+5). Capped at 20. |
| **Pressure Language** | 20 | Urgency language (+6), legal/arrest threat (+8), credential request (+10), fee or penalty demand (+6). Capped at 20. |
| **Known Template** | 15 | Fuzzy token match (`token_set_ratio`) against circulating Indian scam templates: $\ge 85\% \to 15$ pts, $70 - 84\% \to 8$ pts. |
| **Impersonation** | 10 | Legitimate brand, bank, or government body name present from an unverified source. |
| **Unusual Payment** | 5 | UPI collect request, crypto, gift cards, or "scan QR code to receive money". |

### Hard Risk Floors ($\ge 61$ - High)
- Requesting credentials (OTP, PIN, Netbanking) with an unverified link.
- Digital Arrest pattern: Authority impersonation + Threat of arrest + Demand to stay on camera/video call.
- Any identifier confirmed as `KNOWN_SCAM` by the community.

### Risk Bands
- **0 - 30 (Low):** If zero community reports exist, marked with `no_reports_not_safe: true`.
- **31 - 60 (Suspicious):** Unsolicited demands or unverified links detected.
- **61 - 80 (High):** Coercion, active scam patterns, or credential harvesting detected.
- **81 - 100 (Critical):** Known scam identifiers combined with extortion or deceptive links.

### Privacy Safeguards
- Raw text and images exist in transient memory only; never persisted to the database or written to logs.
- PII is redacted via Presidio regex patterns (Aadhaar, PAN, personal phone, emails) after scam identifiers are extracted.
- Identifiers are masked (`98XXXXX210`, `r***@okaxis`) until at least 3 independent people have reported them.
- Non-defamatory phrasing: labels patterns ("matches scam patterns"), never persons.

---

## 7. Test Suite (All 16 Scenarios)

Run the comprehensive pytest suite:
```bash
python -m pytest backend/tests -v
```

All 16 scenarios from Section 15 of the specification pass with 100% green:
- Scenario 1: Real scam wave (8 unrelated reporters, own-word notes) $\to$ `KNOWN_SCAM`
- Scenario 2: 40 new accounts burst on normal shop $\to$ Not `KNOWN_SCAM`
- Scenario 3: 22 accounts on 1 IP prefix $\to$ `distinct_reporters = 1`
- Scenario 4: Same reporter 6 times $\to$ `merged: true`
- Scenario 5: Junk rejected with 400
- Scenario 6: 4 phone formats normalised $\to$ Identical lookup result
- Scenario 7: Spike alert ($2\times$ daily average and $\ge 5$ reports)
- Scenario 8: New scam type in area $\to$ `NEW_TYPE` alert
- Scenario 9: Fake wave caught by trust rules $\to$ No alert
- Scenario 10: Month-old reports $\to$ Not on 7-day map
- Scenario 11: $< 3$ reporters $\to$ Masked `display_value`
- Scenario 12: National helplines & bank senders $\to$ `VERIFIED_BUSINESS`
- Scenario 13: Challenged number $\to$ Never `KNOWN_SCAM`
- Scenario 14: Licence expiry and zero-downtime renewal
- Scenario 15: Single PK lookup speed under 0.5 seconds
- Scenario 16: `POST /admin/reset` clean slate

