from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import IdentifierSummary, VerifiedIdentifier
from app.schemas.lookup import LookupResponse
from app.services.normaliser import normalise_identifier
from app.services.privacy import mask_display_value

router = APIRouter(tags=["Lookup"])

@router.get("/lookup", response_model=LookupResponse)
async def lookup_identifier(
    type: str = Query(..., description="Type of identifier (phone, upi, url, sender_id)"),
    value: str = Query(..., description="Identifier value to check"),
    session: AsyncSession = Depends(get_db)
):
    # 1. Normalise identifier and reject junk with 400
    try:
        norm_val = normalise_identifier(type, value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    norm_type = type.lower()

    # 2. Check verified list first (always wins)
    ver_stmt = select(VerifiedIdentifier).where(
        and_(
            VerifiedIdentifier.identifier_type == norm_type,
            VerifiedIdentifier.identifier_value == norm_val
        )
    )
    res_ver = await session.execute(ver_stmt)
    verified = res_ver.scalars().first()
    if verified:
        return LookupResponse(
            verdict="VERIFIED_BUSINESS",
            report_count=0,
            distinct_reporters=0,
            first_seen=None,
            last_seen=None,
            scam_type=None,
            display_value=norm_val,
            evidence=[f"Verified entity: {verified.owner} ({verified.category})"],
            challenged=False,
            verified_name=verified.owner,
            category=verified.category
        )

    # 3. Read precomputed summary row (single primary key index lookup)
    sum_stmt = select(IdentifierSummary).where(
        and_(
            IdentifierSummary.identifier_type == norm_type,
            IdentifierSummary.identifier_value == norm_val
        )
    )
    res_sum = await session.execute(sum_stmt)
    summary = res_sum.scalars().first()

    if not summary:
        # Return NO_REPORTS with HTTP 200 (never 404 per brief)
        masked_val = mask_display_value(norm_type, norm_val, 0)
        return LookupResponse(
            verdict="NO_REPORTS",
            report_count=0,
            distinct_reporters=0,
            first_seen=None,
            last_seen=None,
            scam_type=None,
            display_value=masked_val,
            evidence=["No community reports recorded for this identifier"],
            challenged=False
        )

    # 4. Mask display value until at least 3 distinct reporters
    masked_val = mask_display_value(norm_type, norm_val, summary.distinct_reporters)

    # 5. Construct safe aggregated evidence (never personal data or raw notes)
    evidence = []
    if summary.report_count > 0:
        plural = "s" if summary.distinct_reporters != 1 else ""
        evidence.append(f"Reported by {summary.distinct_reporters} independent reporter{plural}")
    if summary.top_scam_type:
        evidence.append(f"Common scam pattern: {summary.top_scam_type}")
    if summary.challenged:
        evidence.append("Challenged by business owner and currently under review")

    return LookupResponse(
        verdict=summary.verdict,
        report_count=summary.report_count,
        distinct_reporters=summary.distinct_reporters,
        first_seen=summary.first_seen.isoformat() if summary.first_seen else None,
        last_seen=summary.last_seen.isoformat() if summary.last_seen else None,
        scam_type=summary.top_scam_type,
        display_value=masked_val,
        evidence=evidence,
        challenged=summary.challenged
    )

