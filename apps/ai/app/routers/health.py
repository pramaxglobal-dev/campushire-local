from datetime import datetime, timezone
from time import monotonic

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db


router = APIRouter()
_boot_time = monotonic()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    uptime = max(0.0, monotonic() - _boot_time)
    status = "ok" if db_status == "connected" else "degraded"
    return {
        "status": status,
        "db": db_status,
        "version": "1.0.0",
        "uptime": round(uptime, 3),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
