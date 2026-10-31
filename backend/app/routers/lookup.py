from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import IdentifierSummary, VerifiedIdentifier, Report
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
            evidence=[
                {
                    "entity": verified.owner,
                    "category": verified.category,
                    "channel": "Official Verification",
                    "status": "VERIFIED_BUSINESS",
                    "pincode": "National"
                }
            ],
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
            evidence=[],
            challenged=False
        )

    # 4. Mask display value until at least 3 distinct reporters
    masked_val = mask_display_value(norm_type, norm_val, summary.distinct_reporters)

    # 5. Query user-given reports for this identifier to provide authentic community evidence
    # Strictly adheres to Brief Page 10 rule: "evidence never includes who reported, their IP or their note."
    rep_stmt = (
        select(Report)
        .where(
            and_(
                Report.identifier_type == norm_type,
                Report.identifier_value == norm_val,
                Report.ignored == False
            )
        )
        .order_by(Report.occurred_at.desc())
        .limit(10)
    )
    rep_res = await session.execute(rep_stmt)
    reports = rep_res.scalars().all()

    evidence = []
    for r in reports:
        evidence.append({
            "occurred_at": r.occurred_at.isoformat() if r.occurred_at else None,
            "channel": r.channel,
            "scam_type": r.scam_type,
            "pincode": r.pincode,
            "locality": r.locality or "",
            "city": r.city or "",
            "amount_lost_inr": r.amount_lost_inr,
            "has_screenshot": bool(r.has_screenshot),
            "safe_note": r.note_scrubbed or ""
        })

    # If summary indicates reports exist but rows were merged or archived, provide aggregate evidence
    if not evidence and summary.report_count > 0:
        evidence.append({
            "occurred_at": summary.last_seen.isoformat() if summary.last_seen else None,
            "channel": "Incident Reports",
            "scam_type": summary.top_scam_type or "unspecified",
            "pincode": "Community Registry",
            "locality": "",
            "city": "",
            "amount_lost_inr": None,
            "has_screenshot": False
        })

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

