"""
Admin Dispute Review Queue
GET  /admin/disputes         — list all challenges with pagination
GET  /admin/disputes/{id}    — get single challenge detail
POST /admin/disputes/{id}/decide — approve or reject a dispute
"""
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.models import Challenge, IdentifierSummary

router = APIRouter(prefix="/admin", tags=["Admin — Dispute Queue"])


# ── Schemas ─────────────────────────────────────────────────────────────────

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
    admin_key: str           # simple shared secret for hackathon demo


# ── Config ───────────────────────────────────────────────────────────────────

ADMIN_KEY = "scamradar-admin-2026"  # In production: from env var


# ── Helpers ──────────────────────────────────────────────────────────────────

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


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/disputes", response_model=ChallengeListResponse)
async def list_disputes(
    status_filter: Optional[str] = Query(None, alias="status",
                                          description="Filter by status: under_review | approved | rejected"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    """
    List all dispute challenges with optional status filter and pagination.
    Sorted by newest first.
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
    session: AsyncSession = Depends(get_db),
):
    """Get full detail of a single dispute challenge."""
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
    session: AsyncSession = Depends(get_db),
):
    """
    Admin approves or rejects a dispute challenge.

    - **approved**: identifier is added to verified list; challenged=True stays
    - **rejected**: challenge closed; identifier reverts to normal trust scoring
    """
    # Simple admin auth
    if payload.admin_key != ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin key.",
        )

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
            summary.challenged = True  # Stays shielded
    elif payload.decision == "rejected":
        # Rejected: restore normal scoring
        if summary:
            summary.challenged = False
            # Re-derive verdict from existing score
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
        "decided_at": datetime.utcnow().isoformat(),
        "message": (
            f"Dispute approved — identifier shielded as VERIFIED_BUSINESS."
            if payload.decision == "approved"
            else f"Dispute rejected — identifier reverts to normal trust scoring."
        ),
    }

