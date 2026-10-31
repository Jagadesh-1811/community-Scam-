import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import Challenge, IdentifierSummary
from app.schemas.challenge import ChallengeCreate, ChallengeResponse
from app.services.normaliser import normalise_identifier

router = APIRouter(tags=["Dispute / Challenges"])

@router.post("/challenges", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED)
async def submit_challenge(
    payload: ChallengeCreate,
    session: AsyncSession = Depends(get_db)
):
    try:
        norm_val = normalise_identifier(payload.identifier_type, payload.identifier_value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    norm_type = payload.identifier_type.lower()
    challenge_id = f"CHAL-{uuid.uuid4().hex[:10].upper()}"

    challenge = Challenge(
        challenge_id=challenge_id,
        identifier_type=norm_type,
        identifier_value=norm_val,
        claimant_name=payload.claimant_name,
        contact_email=payload.contact_email,
        proof_note=payload.proof_note,
        status="under_review",
        created_at=datetime.utcnow()
    )
    session.add(challenge)

    # Immediately update summary: mark challenged=True, demote KNOWN_SCAM to SUSPICIOUS
    stmt = select(IdentifierSummary).where(
        and_(
            IdentifierSummary.identifier_type == norm_type,
            IdentifierSummary.identifier_value == norm_val
        )
    )
    res = await session.execute(stmt)
    summary = res.scalars().first()
    if summary:
        summary.challenged = True
        if summary.verdict == "KNOWN_SCAM":
            summary.verdict = "SUSPICIOUS"
    else:
        # Create empty summary with challenged=True
        summary = IdentifierSummary(
            identifier_type=norm_type,
            identifier_value=norm_val,
            report_count=0,
            distinct_reporters=0,
            effective_score=0.0,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow(),
            challenged=True,
            verdict="NO_REPORTS"
        )
        session.add(summary)

    await session.commit()

    return ChallengeResponse(
        challenge_id=challenge_id,
        status="under_review"
    )

