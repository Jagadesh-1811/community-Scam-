import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models.models import LicenseState

class LicenseService:
    def __init__(self):
        self._cached_license: Optional[dict] = None
        self._last_seen_time: Optional[datetime] = None
        self._public_key_hex = settings.LICENSE_PUBLIC_KEY

    def _get_public_key(self) -> Ed25519PublicKey:
        key_bytes = bytes.fromhex(self._public_key_hex)
        return Ed25519PublicKey.from_public_bytes(key_bytes)

    def verify_signature(self, licensee: str, expires_at: str, signature_hex: str) -> bool:
        """
        Verifies Ed25519 signature over canonical message f"{licensee}:{expires_at}".
        """
        try:
            pub = self._get_public_key()
            data = f"{licensee}:{expires_at}".encode("utf-8")
            sig_bytes = bytes.fromhex(signature_hex)
            pub.verify(sig_bytes, data)
            return True
        except Exception:
            return False

    def parse_iso_to_utc(self, dt_str: str) -> datetime:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt

    async def load_from_db(self, session: AsyncSession) -> Optional[dict]:
        stmt = select(LicenseState).where(LicenseState.id == 1)
        res = await session.execute(stmt)
        lic_record = res.scalars().first()
        if lic_record:
            self._cached_license = json.loads(lic_record.license_json)
            self._last_seen_time = lic_record.last_seen_time
            return self._cached_license
        return None

    async def save_to_db(self, session: AsyncSession, payload: dict) -> None:
        licensee = payload["licensee"]
        expires_at_str = payload["expires_at"]
        signature = payload["signature"]
        expires_at_utc = self.parse_iso_to_utc(expires_at_str)
        now_utc = datetime.utcnow()

        # Update last seen time safely
        if self._last_seen_time is None or now_utc > self._last_seen_time:
            self._last_seen_time = now_utc

        stmt = select(LicenseState).where(LicenseState.id == 1)
        res = await session.execute(stmt)
        record = res.scalars().first()

        json_str = json.dumps(payload)
        if record:
            record.license_json = json_str
            record.licensee = licensee
            record.expires_at = expires_at_utc
            record.signature = signature
            record.last_seen_time = self._last_seen_time
            record.status = "valid"
        else:
            record = LicenseState(
                id=1,
                license_json=json_str,
                licensee=licensee,
                expires_at=expires_at_utc,
                last_seen_time=self._last_seen_time,
                signature=signature,
                status="valid"
            )
            session.add(record)

        await session.commit()
        self._cached_license = payload

    async def check_license_status(self, session: AsyncSession) -> Tuple[bool, str, Optional[dict]]:
        """
        Returns (is_valid, status_code, license_info).
        status_code can be "VALID", "LICENSE_EXPIRED", "CLOCK_ROLLBACK", "NO_LICENSE".
        """
        if not self._cached_license:
            loaded = await self.load_from_db(session)
            if not loaded:
                return False, "NO_LICENSE", None

        lic = self._cached_license
        licensee = lic.get("licensee", "")
        expires_at_str = lic.get("expires_at", "")
        signature = lic.get("signature", "")

        # Verify cryptographic signature
        if not self.verify_signature(licensee, expires_at_str, signature):
            return False, "INVALID_SIGNATURE", lic

        now_utc = datetime.utcnow()
        # Clock rollback guard: allow max 5 seconds clock drift
        if self._last_seen_time and now_utc < (self._last_seen_time - timedelta(seconds=5)):
            return False, "CLOCK_ROLLBACK", lic

        # Advance last seen time
        if self._last_seen_time is None or now_utc > self._last_seen_time:
            self._last_seen_time = now_utc
            # Periodically or on update, last_seen_time is persisted

        expires_at_utc = self.parse_iso_to_utc(expires_at_str)
        if now_utc > expires_at_utc:
            return False, "LICENSE_EXPIRED", lic

        return True, "VALID", lic

license_service = LicenseService()

