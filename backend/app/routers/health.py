from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    return {
        "ok": True,
        "status": "operational",
        "service": "ScamRadar India Backend",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

