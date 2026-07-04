from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.schemas import ScoreRequest, ScoreResponse
from app.services.scoring import calculate_career_score


router = APIRouter()


def _ensure_service_key(
    x_service_key: Annotated[str | None, Header(alias="X-Service-Key")] = None,
) -> None:
    if not x_service_key or x_service_key != settings.api_service_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid service key")


async def _persist_score(user_id: str, score: int, db: AsyncSession) -> None:
    await db.execute(
        text(
            """
            UPDATE student_profiles
            SET career_score = :score, updated_at = NOW()
            WHERE user_id = :user_id
            """
        ),
        {"user_id": user_id, "score": score},
    )
    await db.execute(
        text(
            """
            UPDATE job_seeker_profiles
            SET career_score = :score, updated_at = NOW()
            WHERE user_id = :user_id
            """
        ),
        {"user_id": user_id, "score": score},
    )
    await db.commit()


@router.post("")
async def compute_score(
    payload: ScoreRequest,
    _: None = Depends(_ensure_service_key),
    db: AsyncSession = Depends(get_db),
) -> ScoreResponse:
    result = calculate_career_score(payload)
    await _persist_score(payload.userId, result.careerScore, db)
    return result


@router.post("/batch")
async def compute_score_batch(
    payload: list[ScoreRequest],
    _: None = Depends(_ensure_service_key),
    db: AsyncSession = Depends(get_db),
) -> list[ScoreResponse]:
    if len(payload) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch size limit is 500",
        )
    results: list[ScoreResponse] = []
    for item in payload:
        score_result = calculate_career_score(item)
        await _persist_score(item.userId, score_result.careerScore, db)
        results.append(score_result)
    return results


@router.get("/ping")
async def scoring_ping() -> dict[str, str]:
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}
