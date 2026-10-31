import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.report import ReportCreate, ReportResponse
from app.services.normaliser import normalise_identifier
from app.services.privacy import hash_with_secret
from app.services.rate_limiter import rate_limiter
from app.services.trust_engine import trust_engine
from app.services.supabase_sync import supabase_sync

router = APIRouter(tags=["Reports"])

@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_report(
    payload: ReportCreate,
    session: AsyncSession = Depends(get_db)
):
    # 1. Normalise identifier and reject junk (400)
    try:
        norm_val = normalise_identifier(payload.identifier_type, payload.identifier_value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # 2. Hash reporter_id and ip_prefix for anonymity
    reporter_hash = hash_with_secret(payload.reporter_id)
    ip_hash = hash_with_secret(payload.ip_prefix)

    # 3. Rate limiting per hashed reporter and IP (429)
    if rate_limiter.is_rate_limited(reporter_hash, ip_hash):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests from this reporter or network prefix"
        )

    # 4. Prepare IDs and timestamps
    report_id = payload.report_id or uuid.uuid4().hex
    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.utcnow()

    report_dict = payload.model_dump()
    report_dict["report_id"] = report_id
    report_dict["case_id"] = case_id
    report_dict["identifier_value"] = norm_val
    report_dict["occurred_at"] = payload.occurred_at or now
    report_dict["reported_at"] = payload.reported_at or now

    # 5. Process report through Trust Engine
    saved_report, _, merged = await trust_engine.evaluate_and_save_report(
        session=session,
        report_data=report_dict,
        reporter_hash=reporter_hash,
        ip_hash=ip_hash
    )

    # 6. Real-time sync to Supabase Cloud Database (REST HTTPS)
    try:
        supabase_payload = dict(report_dict)
        if saved_report and hasattr(saved_report, "note_scrubbed"):
            supabase_payload["note_scrubbed"] = saved_report.note_scrubbed or report_dict.get("note", "")
        else:
            supabase_payload["note_scrubbed"] = report_dict.get("note", "")
        supabase_sync.insert_report(supabase_payload)
    except Exception:
        pass

    return ReportResponse(
        report_id=saved_report.report_id,
        case_id=saved_report.case_id,
        merged=merged
    )

