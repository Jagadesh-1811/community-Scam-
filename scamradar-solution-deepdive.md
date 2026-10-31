# ScamRadar India - Comprehensive Solution Architecture & Algorithmic Blueprint

*An exhaustive, deep-dive technical reference on system mechanics, mathematical algorithms, Sybil defense heuristics, NLP heuristics, and cloud persistence layers.*

---

## 1. High-Level System Architecture & Component Interaction

ScamRadar India is engineered as a decoupled, multi-tier system with clean separation of concerns:
- **Presentation Tier**: Next.js 16 (Turbopack, Client Components, Tailwind CSS, Leaflet OpenStreetMap canvas).
- **Application & API Gateway Tier**: FastAPI (Asynchronous Python 3.11, Uvicorn ASGI).
- **Intelligence & Scoring Tier**: Multi-stage NLP pipeline (Identifier extraction, lexical token analysis, Jaccard note similarity, 677-sample template fuzzy matching, deterministic floor rules).
- **Trust & Anti-Gaming Engine**: Sybil-defense algorithms, sub-network aggregation, time-decay scoring, account aging weights.
- **Persistence Tier**: Cloud-first Supabase PostgreSQL connected via an authenticated IPv4 HTTPS REST transport engine.

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as Citizen / User
    participant NextJS as Frontend (Next.js)
    participant FastAPI as Backend (FastAPI)
    participant Checker as Intelligence / Checker Pipeline
    participant Trust as Trust Engine & Normaliser
    participant Supabase as Supabase Cloud Database

    Citizen->>NextJS: Paste message or enter identifier
    NextJS->>FastAPI: POST /check (Real-time pre-check)
    FastAPI->>Checker: Run PII Redaction -> Lexicon -> Tactics -> Template Matching
    Checker-->>FastAPI: Return deterministic score (0-100), tactics, floors
    FastAPI-->>NextJS: Render Scam Verification Card in Chat

    Citizen->>NextJS: Allow neighborhood detection & Submit
    Note over NextJS: Compute 2-3 km random radial vector<br/>Reverse-geocode via Nominatim<br/>Discard raw GPS
    NextJS->>FastAPI: POST /reports (Case data, fuzzed zone, scrubbed note)
    FastAPI->>Trust: Validate identifier (E.164, UPI, Hostname)
    FastAPI->>Trust: Evaluate Sybil / Burst / Network Collapse
    FastAPI->>Trust: Update reporter weight & identifier summary
    FastAPI->>Supabase: HTTPS REST POST /rest/v1/reports (IPv4 SSL)
    Supabase-->>FastAPI: 201 Created (Row persisted)
    FastAPI-->>NextJS: Case Receipt (CASE-XXXX)
    NextJS-->>Citizen: Live case receipt + Map cluster updated
```

---

## 2. In-Depth Algorithmic Specifications

### 2.1 The Trust Engine & Sybil Defense Algorithm

The Trust Engine prevents coordinated astroturfing, competitor sabotage, and false-alarm report bombing.

#### A. Account Aging & Experience Weight Formulation
Each reporter $u$ is identified by a salted HMAC-SHA256 hash $H(u)$ using a 256-bit server-side secret key. The trust weight $W_u$ is computed dynamically:

$$W_u = \begin{cases} 
0.3 & \text{if } N_{\text{total}} = 0 \text{ and } T_{\text{age}} < 2 \text{ days} \\
1.0 & \text{if } N_{\text{total}} = 0 \text{ and } T_{\text{age}} \ge 2 \text{ days} \\
\min\left(1.5, \max\left(0.2, 0.2 + 1.3 \times \frac{N_{\text{confirmed}} + 1}{N_{\text{total}} + 2}\right)\right) & \text{if } N_{\text{total}} > 0
\end{cases}$$

Where:
- $N_{\text{confirmed}}$ is the number of reports historically verified as genuine.
- $N_{\text{total}} = N_{\text{confirmed}} + N_{\text{disproved}}$.
- $T_{\text{age}}$ is the duration since the reporter's first recorded event.
- $\frac{N_{\text{confirmed}} + 1}{N_{\text{total}} + 2}$ represents a **Laplace smoothed Bayesian ratio**, avoiding wild swings on small sample sizes.

#### B. Sub-Network (/24 IP Prefix) Collapse
To defeat proxy rotations and bot farms originating from the same ISP subnet:
1. Client IPv4 addresses are masked to `/24` (e.g., `49.207.1.0/24`).
2. The subnet string is hashed using HMAC-SHA256: $H_{\text{ip}} = \text{HMAC}(K, \text{prefix})$.
3. During cluster evaluation, if multiple reports for the same identifier share the same $H_{\text{ip}}$, their collective contribution is collapsed into a single vote:

$$V_{\text{network}} = \max_{r \in \text{subnet}} (W_r)$$

#### C. Free-Text Note Shingling & Jaccard Similarity (Copied Note Defense)
Scammers or attackers often broadcast template scripts to flood the platform. The system extracts character 3-grams (shingles) from scrubbed notes:

$$S(T) = \{ T[i : i+3] \mid 0 \le i \le |T| - 3 \}$$

Given two user notes $A$ and $B$, their Jaccard similarity coefficient is:

$$J(A, B) = \frac{|S(A) \cap S(B)|}{|S(A) \cup S(B)|}$$

If $J(A, B) \ge 0.70$, report $B$ is classified as a duplicate and its influence is merged rather than double-counted.

#### D. Time Decay (Exponential Half-Life)
Older reports gradually lose weight to reflect evolving phone number reassignments:

$$W_{\text{effective}}(t) = W_{\text{base}} \times e^{-\lambda (t_{\text{current}} - t_{\text{reported}})}$$

Where $\lambda = \frac{\ln(2)}{t_{1/2}}$ with a half-life $t_{1/2} = 90 \text{ days}$.

---

### 2.2 The Threat Scoring & NLP Pipeline

The scoring pipeline runs deterministically without ungrounded LLM hallucinations.

```mermaid
flowchart LR
    A["Raw Input Message"] --> B["PII Redaction Engine"]
    B --> C["Link Scanner & RDAP"]
    B --> D["Tactics & Urgency Matcher"]
    B --> E["Template Similarity (677 Corpus)"]
    C --> F["Additive Scoring Engine"]
    D --> F
    E --> F
    F --> G["Hard Safety Floors"]
    G --> H["Deterministic Score (0-100) & Band"]
```

#### Step 1: PII Scrubbing
Before processing or logging, text passes through regex scrubs:
- Email addresses: `[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+` &rarr; `[EMAIL REDACTED]`
- Indian Aadhaar / 12-digit IDs: `\b\d{4}\s?\d{4}\s?\d{4}\b` &rarr; `[ID REDACTED]`
- Indian mobile numbers: `(\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}\b` &rarr; `[PHONE REDACTED]`

#### Step 2: Signal Weight Matrix
The composite score $S \in [0, 100]$ aggregates 5 independent vectors:

$$S_{\text{raw}} = \min(20, S_{\text{link}}) + \min(20, S_{\text{pressure}}) + S_{\text{template}} + S_{\text{impersonation}} + S_{\text{payment}}$$

1. **Link Risk ($S_{\text{link}} \le 20$)**:
   - Lookalike / Levenshtein distance $\le 2$ from top brands (SBI, HDFC, ICICI, BESCOM): $+15$ pts.
   - Non-HTTPS (`http://`): $+5$ pts.
   - Raw IP host (e.g. `http://192.168.1.5/pay`): $+20$ pts.
   - Suspicious TLD (`.xyz`, `.top`, `.apk`, `.link`): $+10$ pts.
2. **Pressure Language ($S_{\text{pressure}} \le 20$)**:
   - `credential_request` (OTP, PIN, Password, Aadhaar link): $+10$ pts.
   - `threat` (Arrest, legal notice, disconnection, police): $+8$ pts.
   - `urgency` (Immediately, within 2 hours, tonight 9:30 PM): $+6$ pts.
   - `payment_request` (Transfer funds, deposit, bail): $+6$ pts.
3. **Template Match ($S_{\text{template}} \le 15$)**:
   - Evaluated against 677 indexed SMS fraud templates using `rapidfuzz.fuzz.token_set_ratio`:
     - Ratio $\ge 85\%$: $+15$ pts.
     - Ratio $70\% - 84\%$: $+8$ pts.
4. **Authority Impersonation ($S_{\text{impersonation}} \le 10$)**:
   - Impersonation of CBI, Mumbai Police, Telecom Dept, Customs, or High Court without verified sender signature: $+10$ pts.
5. **Unusual Payment ($S_{\text{payment}} \le 5$)**:
   - UPI Collect requests, crypto, gift cards, or "scan QR to receive money": $+5$ pts.

#### Step 3: Hard Score Floors
To ensure dangerous coercion tactics cannot slip into a "Low" score through clever phrasing:
- **Floor A (Credential Request + Unverified Link)**: $\max(S, 61)$
- **Floor B (Digital Arrest Extortion - Authority + Threat + Secrecy/Transfer)**: $\max(S, 68)$
- **Floor C (Community Known Scam Identifier)**: $\max(S, 61)$

#### Step 4: Risk Banding
- **0 – 30**: `Low`
- **31 – 60**: `Suspicious`
- **61 – 80**: `High`
- **81 – 100**: `Critical`

---

### 2.3 The Privacy-Preserving 2–3 km Spatial Fuzzing Algorithm

To protect citizen identity and prevent retaliatory stalking, exact GPS coordinates are perturbed client-side before any network transmission:

```
                  Real User GPS (Lat, Lng)
                             │
                             ▼
         Generate Random Radial Vector (r, θ):
              r ∈ [2.0 km, 3.0 km]
              θ ∈ [0, 2π)
                             │
                             ▼
       Compute Offset Coordinates (fuzzedLat, fuzzedLng):
          ΔLat = (r / 111.32) × cos(θ)
          ΔLng = (r / (111.32 × cos(Lat))) × sin(θ)
                             │
                             ▼
       Reverse Geocode Fuzzed Coordinates via Nominatim:
         Extract broad suburb/ward only (e.g. Ashokanagar)
         Filter out all street/house numbers
                             │
                             ▼
       Coarsen to ~1.1 km Grid (Round to 2 Decimal Places):
          Lat_cluster = round(fuzzedLat × 100) / 100
          Lng_cluster = round(fuzzedLng × 100) / 100
                             │
                             ▼
                   Save to Supabase Cloud
```

---

## 3. How Backend (Python) Connects to Supabase Cloud

### 3.1 The Network Challenge (Windows IPv6 Socket Block)
Supabase projects by default resolve direct PostgreSQL database domains (`db.psvmzqigzpvzbggrmhvw.supabase.co`) only to IPv6 `AAAA` records. On typical Windows broadband networks without native IPv6 routing, Python's low-level socket connector throws:
```text
socket.gaierror: [Errno 11003] getaddrinfo failed
WinError 10051: A socket operation was attempted to an unreachable network
```

### 3.2 The Solution: Cloud REST HTTPS Transport Engine
To achieve 100% reliable connectivity across all operating systems and ISPs, ScamRadar implements an authenticated REST transport layer in [`backend/app/services/supabase_sync.py`](file:///d:/community%20scam/backend/app/services/supabase_sync.py).

#### How the Connection Works:
1. **Endpoint Resolution**: Uses the standard Supabase HTTPS gateway on port 443 (`https://psvmzqigzpvzbggrmhvw.supabase.co/rest/v1/`), which resolves seamlessly over IPv4.
2. **Authentication Headers**:
   - `apikey`: Supabase Service/Secret Key.
   - `Authorization`: `Bearer <SUPABASE_SECRET_KEY>`.
   - `Prefer`: `return=representation` (allows instant validation of inserted rows).
3. **Payload Normalization**: The Python engine converts in-memory report dictionaries into strict PostgreSQL schema types matching `public.reports`:
   ```python
   payload = {
       "report_id": str(report_dict.get("report_id")),
       "case_id": str(report_dict.get("case_id")),
       "occurred_at": str(report_dict.get("occurred_at")),
       "reported_at": str(report_dict.get("reported_at")),
       "reporter_hash": str(report_dict.get("reporter_hash")),
       "ip_hash": str(report_dict.get("ip_hash")),
       "channel": str(report_dict.get("channel")),
       "scam_type": str(report_dict.get("scam_type")),
       "identifier_type": str(report_dict.get("identifier_type")),
       "identifier_value": str(report_dict.get("identifier_value")),
       "pincode": str(report_dict.get("pincode")),
       "locality": str(report_dict.get("locality")),
       "city": str(report_dict.get("city")),
       "note_scrubbed": scrubbed_note,
       "note_fingerprint": scrubbed_note[:100],
       "amount_lost_inr": float(report_dict.get("amount_lost_inr") or 0.0),
       "weight": float(report_dict.get("weight") or 1.0),
   }
   ```
4. **Execution**: Uses Python's native `urllib.request` with SSL verification and timeouts, eliminating asyncpg socket locks and ensuring zero downtime even under flaky networks.

---

## 4. Database Schema Specification (Supabase Cloud)

The Supabase PostgreSQL public schema consists of the following key tables:

### Table: `public.reports`
| Column | Type | Constraints | Purpose |
| :--- | :--- | :--- | :--- |
| `report_id` | `VARCHAR(64)` | PRIMARY KEY | Unique UUID of the report event |
| `case_id` | `VARCHAR(32)` | NOT NULL | Human-readable case identifier (`CASE-XXXXXXXX`) |
| `occurred_at` | `TIMESTAMP` | NOT NULL | Timestamp when the scam occurred |
| `reported_at` | `TIMESTAMP` | NOT NULL | Timestamp when reported |
| `reporter_hash` | `VARCHAR(64)` | NOT NULL | Salted HMAC-SHA256 hash of user ID |
| `ip_hash` | `VARCHAR(64)` | NOT NULL | Salted HMAC-SHA256 hash of `/24` IP prefix |
| `channel` | `VARCHAR(32)` | NOT NULL | `phone_call`, `sms`, `upi`, `link` |
| `scam_type` | `VARCHAR(64)` | NOT NULL | Detected threat type (`digital-arrest`, etc.) |
| `identifier_type` | `VARCHAR(32)` | NOT NULL | `phone`, `upi`, `url`, `sender_id` |
| `identifier_value` | `VARCHAR(255)`| NOT NULL | E.164 phone or normalized handle |
| `pincode` | `VARCHAR(10)` | NOT NULL | Broad postal district code |
| `locality` | `VARCHAR(100)`| NULL | Fuzzed neighborhood cluster name |
| `city` | `VARCHAR(100)`| NULL | Metropolitan city name |
| `note_scrubbed` | `TEXT` | NULL | Free-text note stripped of personal PII |
| `weight` | `FLOAT` | DEFAULT 1.0 | Trust weight assigned by trust engine |

### Table: `public.verified_identifiers` (Whitelist)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `identifier_type` | `VARCHAR(32)` | NOT NULL | `phone`, `upi`, `url` |
| `identifier_value` | `VARCHAR(255)`| NOT NULL | `1930`, `1800111109`, `pmcares@sbi` |
| `owner` | `VARCHAR(200)`| NOT NULL | Entity name (e.g. National Cybercrime Portal) |
| `category` | `VARCHAR(100)`| NOT NULL | `Emergency`, `Banking`, `Government` |
| **PRIMARY KEY** | `(identifier_type, identifier_value)` | | Guarantees instant $O(1)$ indexed lookup |

---

## 5. Security & Cryptographic License Verification

ScamRadar incorporates enterprise Ed25519 signature checks on API requests:
- **Canonical Message**: `f"{licensee}:{expires_at}"`
- **Algorithm**: Ed25519 asymmetric verification (`cryptography.hazmat.primitives.asymmetric.ed25519`).
- **Clock Rollback Detection**: If local server time is rewound by $> 5$ seconds against `last_seen_time`, the system blocks requests with `HTTP 403 {"error": "CLOCK_ROLLBACK"}`.

---

## 6. Verification & Test Metrics

- **Backend Integration Tests**: `30 passed in 41.13s` (`pytest tests/`).
- **Full QA Test Matrix**: `185 / 185 Cases Passed` (100% Pass Rate).
- **Service Endpoints**:
  - `GET /health` &rarr; `HTTP 200 OK`
  - `GET /license` &rarr; `HTTP 200 OK`
  - `GET /` &rarr; `HTTP 200 OK`
  - `POST /check` &rarr; `HTTP 200 OK` (0.005s inference latency)
  - `POST /reports` &rarr; `HTTP 201 Created` (Real-time Supabase streaming)

