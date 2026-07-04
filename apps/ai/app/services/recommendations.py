import json
from collections import defaultdict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas import RecommendationRequest, RecommendationResponse
from app.utils.skills import normalize_skill_name


def _parse_skills_covered(raw_value: object) -> list[str]:
    if raw_value is None:
        return []
    if isinstance(raw_value, list):
        return [entry for entry in raw_value if isinstance(entry, str)]
    if isinstance(raw_value, dict):
        return [value for value in raw_value.values() if isinstance(value, str)]
    if isinstance(raw_value, str):
        try:
            parsed = json.loads(raw_value)
            return _parse_skills_covered(parsed)
        except json.JSONDecodeError:
            return []
    return []


async def get_course_recommendations(
    req: RecommendationRequest, db: AsyncSession
) -> RecommendationResponse:
    rows = await db.execute(
        text(
            """
            SELECT id, title, skills_covered
            FROM courses
            WHERE is_active = true
            ORDER BY created_at DESC
            """
        )
    )
    records = rows.mappings().all()

    missing = [normalize_skill_name(skill) for skill in req.missingSkills if skill.strip()]
    if not missing:
        return RecommendationResponse(userId=req.userId, courseIds=[], reasons={})

    scored: list[tuple[str, int, str]] = []
    reasons: dict[str, str] = {}
    skill_hit_counter: dict[str, int] = defaultdict(int)

    for row in records:
        course_id = str(row.get("id"))
        title = str(row.get("title") or "Course")
        skills = _parse_skills_covered(row.get("skills_covered"))
        normalized_skills = {normalize_skill_name(skill) for skill in skills}
        hits = [skill for skill in missing if skill in normalized_skills]
        if not hits:
            continue
        for skill in hits:
            skill_hit_counter[skill] += 1
        scored.append((course_id, len(hits), title))
        reasons[course_id] = f"Covers missing skills: {', '.join(hits[:3])}"

    scored.sort(key=lambda item: item[1], reverse=True)
    top_course_ids = [course_id for course_id, _, _ in scored[:5]]

    return RecommendationResponse(
        userId=req.userId,
        courseIds=top_course_ids,
        reasons={course_id: reasons[course_id] for course_id in top_course_ids},
    )
