"""
Admin Dispute Review Queue & Authentication
POST /admin/login             — Authenticate grievance officer & issue bearer token
GET  /admin/me                — Verify officer session & badge profile
GET  /admin/disputes          — List challenges with pagination (Requires Auth)
GET  /admin/disputes/{id}     — Get single challenge detail (Requires Auth)
POST /admin/disputes/{id}/decide — Approve or reject a dispute (Requires Auth)
"""
import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.models import Challenge, IdentifierSummary

router = APIRouter(prefix="/admin", tags=["Admin — Dispute Queue & Authentication"])


# ── Configuration & Credentials ─────────────────────────────────────────────

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "scamradar-admin-2026")
ADMIN_KEY = os.getenv("ADMIN_KEY", "scamradar-admin-2026")

# In-memory session store: token -> officer details
ACTIVE_SESSIONS: Dict[str, dict] = {
    # Pre-seed default key for backend scripts / CI
    ADMIN_KEY: {
        "officer_name": "Senior Grievance Officer",
        "badge_id": "CYBER-GOV-01",
        "role": "Super Admin",
        "created_at": datetime.utcnow().isoformat()
    }
}


# ── Schemas ─────────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    ok: bool
    token: str
    token_type: str = "bearer"
    officer_name: str
    badge_id: str
    expires_in_hours: int = 12


class ChallengeDetail(BaseModel):
    challenge_id: str
    identifier_type: str
    identifier_value: str
    claimant_name: str
    contact_email: str
    proof_note: str
    status: str
    created_at: str
    decided_at: Optional[str] = None
    decision_note: Optional[str] = None


class ChallengeListResponse(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[ChallengeDetail]


class DecisionPayload(BaseModel):
    decision: str            # "approved" | "rejected"
    decision_note: Optional[str] = None
    admin_key: Optional[str] = None


# ── Authentication Dependency ───────────────────────────────────────────────

async def verify_admin_auth(request: Request) -> dict:
    """
    Route-level protection: Enforces valid bearer token or X-Admin-Token header.
    Rejects unauthenticated requests with HTTP 401.
    """
    auth_header = request.headers.get("Authorization", "").strip()
    token = None

    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "X-Admin-Token" in request.headers:
        token = request.headers.get("X-Admin-Token", "").strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Check active tokens or static admin key
    if token in ACTIVE_SESSIONS:
        return ACTIVE_SESSIONS[token]

    if token == ADMIN_KEY or token == f"tok_{ADMIN_KEY}":
        return {
            "officer_name": "Senior Grievance Officer",
            "badge_id": "CYBER-GOV-01",
            "role": "Super Admin",
            "created_at": datetime.utcnow().isoformat()
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired admin credentials.",
        headers={"WWW-Authenticate": "Bearer"}
    )


# ── Helper ──────────────────────────────────────────────────────────────────

def _to_detail(c: Challenge) -> ChallengeDetail:
    return ChallengeDetail(
        challenge_id=c.challenge_id,
        identifier_type=c.identifier_type,
        identifier_value=c.identifier_value,
        claimant_name=c.claimant_name,
        contact_email=c.contact_email,
        proof_note=c.proof_note,
        status=c.status,
        created_at=c.created_at.isoformat() if c.created_at else "",
        decided_at=c.decided_at.isoformat() if hasattr(c, "decided_at") and c.decided_at else None,
        decision_note=getattr(c, "decision_note", None),
    )


# ── Auth Endpoints ──────────────────────────────────────────────────────────

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLoginRequest):
    """
    Authenticate a grievance officer and return a session token.
    """
    valid_usernames = (ADMIN_USERNAME.lower(), "officer", "officer@cybercrime.gov.in", "admin")
    if payload.username.lower() in valid_usernames and payload.password == ADMIN_PASSWORD:
        token = f"sr_admin_{uuid.uuid4().hex}"
        officer = {
            "officer_name": "Senior Grievance Officer",
            "badge_id": "CYBER-GOV-01",
            "role": "Super Admin",
            "created_at": datetime.utcnow().isoformat()
        }
        ACTIVE_SESSIONS[token] = officer
        return AdminLoginResponse(
            ok=True,
            token=token,
            officer_name=officer["officer_name"],
            badge_id=officer["badge_id"],
            expires_in_hours=12
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid officer username or password."
    )


@router.get("/me")
async def get_admin_profile(officer: dict = Depends(verify_admin_auth)):
    """
    Verify current session token and return officer badge profile.
    """
    return {
        "authenticated": True,
        **officer
    }


# ── Protected Queue Endpoints ───────────────────────────────────────────────

@router.get("/disputes", response_model=ChallengeListResponse)
async def list_disputes(
    status_filter: Optional[str] = Query(None, alias="status",
                                          description="Filter by status: under_review | approved | rejected"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    officer: dict = Depends(verify_admin_auth),
    session: AsyncSession = Depends(get_db),
):
    """
    List dispute challenges with optional status filter and pagination.
    Protected route: requires valid officer Bearer token.
    """
    actual_status = status_filter if isinstance(status_filter, str) else None
    actual_page = page if isinstance(page, int) else 1
    actual_per_page = per_page if isinstance(per_page, int) else 20

    stmt = select(Challenge).order_by(desc(Challenge.created_at))
    if actual_status:
        stmt = stmt.where(Challenge.status == actual_status)

    # Total count
    count_stmt = stmt
    result_all = await session.execute(count_stmt)
    all_items = result_all.scalars().all()
    total = len(all_items)

    # Paginate
    offset = (actual_page - 1) * actual_per_page
    stmt = stmt.offset(offset).limit(actual_per_page)
    result = await session.execute(stmt)
    items = result.scalars().all()

    return ChallengeListResponse(
        total=total,
        page=actual_page,
        per_page=actual_per_page,
        items=[_to_detail(c) for c in items],
    )


@router.get("/disputes/{challenge_id}", response_model=ChallengeDetail)
async def get_dispute(
    challenge_id: str,
    officer: dict = Depends(verify_admin_auth),
    session: AsyncSession = Depends(get_db),
):
    """
    Get full detail of a single dispute challenge.
    Protected route: requires valid officer Bearer token.
    """
    stmt = select(Challenge).where(Challenge.challenge_id == challenge_id)
    result = await session.execute(stmt)
    challenge = result.scalars().first()

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge {challenge_id!r} not found.",
        )

    return _to_detail(challenge)


@router.post("/disputes/{challenge_id}/decide")
async def decide_dispute(
    challenge_id: str,
    payload: DecisionPayload,
    officer: dict = Depends(verify_admin_auth),
    session: AsyncSession = Depends(get_db),
):
    """
    Officer approves or rejects a dispute challenge.
    Protected route: requires valid officer Bearer token.
    """
    if payload.decision not in ("approved", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decision must be 'approved' or 'rejected'.",
        )

    # Fetch challenge
    stmt = select(Challenge).where(Challenge.challenge_id == challenge_id)
    result = await session.execute(stmt)
    challenge = result.scalars().first()

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge {challenge_id!r} not found.",
        )

    if challenge.status != "under_review":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Challenge is already {challenge.status!r} — cannot re-decide.",
        )

    # Apply decision
    challenge.status = payload.decision
    if hasattr(challenge, "decided_at"):
        challenge.decided_at = datetime.utcnow()
    if hasattr(challenge, "decision_note"):
        challenge.decision_note = payload.decision_note or ""

    # Update the identifier summary
    summ_stmt = select(IdentifierSummary).where(
        IdentifierSummary.identifier_type == challenge.identifier_type,
        IdentifierSummary.identifier_value == challenge.identifier_value,
    )
    summ_res = await session.execute(summ_stmt)
    summary = summ_res.scalars().first()

    if payload.decision == "approved":
        # Verified: shield stays active, verdict becomes VERIFIED_BUSINESS
        if summary:
            summary.verdict = "VERIFIED_BUSINESS"
            summary.challenged = True
    elif payload.decision == "rejected":
        # Rejected: restore normal scoring
        if summary:
            summary.challenged = False
            if summary.effective_score >= 70:
                summary.verdict = "KNOWN_SCAM"
            elif summary.effective_score >= 35:
                summary.verdict = "SUSPICIOUS"
            else:
                summary.verdict = "NO_REPORTS"

    await session.commit()

    return {
        "challenge_id": challenge_id,
        "status": payload.decision,
        "identifier_type": challenge.identifier_type,
        "identifier_value": challenge.identifier_value,
        "claimant_name": challenge.claimant_name,
        "decided_by": officer.get("officer_name", "Grievance Officer"),
        "decided_at": datetime.utcnow().isoformat(),
        "message": (
            f"Dispute approved by {officer.get('officer_name')} — identifier shielded as VERIFIED_BUSINESS."
            if payload.decision == "approved"
            else f"Dispute rejected by {officer.get('officer_name')} — identifier reverts to normal trust scoring."
        ),
    }
