from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.license import LicensePayload, LicenseStatusResponse
from app.services.license_service import license_service

router = APIRouter(tags=["Licence System"])

@router.get("/license", response_model=LicenseStatusResponse)
async def get_license_status(session: AsyncSession = Depends(get_db)):
    is_valid, status_code, lic = await license_service.check_license_status(session)
    if not lic:
        return LicenseStatusResponse(
            status="missing"
        )

    expires_at_str = lic.get("expires_at", "")
    expires_at_utc = license_service.parse_iso_to_utc(expires_at_str)
    now_utc = datetime.utcnow()
    diff = (expires_at_utc - now_utc).total_seconds()

    return LicenseStatusResponse(
        licensee=lic.get("licensee"),
        expires_at=expires_at_str,
        status="valid" if is_valid else "expired",
        time_remaining_seconds=max(0.0, diff) if is_valid else 0.0
    )

@router.post("/license")
async def update_license(
    payload: LicensePayload,
    session: AsyncSession = Depends(get_db)
):
    # 1. Verify cryptographic Ed25519 signature
    is_sig_valid = license_service.verify_signature(
        payload.licensee,
        payload.expires_at,
        payload.signature
    )
    if not is_sig_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid cryptographic licence signature"
        )

    # 2. Check date format
    try:
        expires_at_utc = license_service.parse_iso_to_utc(payload.expires_at)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ISO-8601 date format for expires_at"
        )

    # 3. Save to DB and update memory state immediately without restart
    lic_dict = payload.model_dump()
    await license_service.save_to_db(session, lic_dict)

    now_utc = datetime.utcnow()
    diff = (expires_at_utc - now_utc).total_seconds()
    lic_status = "valid" if diff > 0 else "expired"

    return {
        "ok": True,
        "status": lic_status,
        "licensee": payload.licensee,
        "expires_at": payload.expires_at,
        "time_remaining_seconds": max(0.0, diff)
    }

