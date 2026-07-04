import json
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.schemas import (
    CandidateProfile,
    JobRequirement,
    MatchRequest,
    MatchResponse,
    MatchResult,
    RecommendationRequest,
    SkillItem,
    SkillLevel,
)
from app.services.matching import calculate_match_score
from app.services.recommendations import get_course_recommendations
from app.utils.skills import normalize_skill_name


router = APIRouter()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_service_key(
    x_service_key: Annotated[str | None, Header(alias="X-Service-Key")] = None,
) -> None:
    if not x_service_key or x_service_key != settings.api_service_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid service key")


def _parse_skill_list(raw_value: object) -> list[SkillItem]:
    if raw_value is None:
        return []
    if isinstance(raw_value, str):
        try:
            parsed = json.loads(raw_value)
            return _parse_skill_list(parsed)
        except json.JSONDecodeError:
            return []
    if isinstance(raw_value, list):
        items: list[SkillItem] = []
        for entry in raw_value:
            if isinstance(entry, str) and entry.strip():
                items.append(SkillItem(name=entry.strip(), level=SkillLevel.BEGINNER))
            elif isinstance(entry, dict):
                name = entry.get("name")
                if not isinstance(name, str) or not name.strip():
                    continue
                raw_level = entry.get("level")
                if isinstance(raw_level, str) and raw_level in SkillLevel.__members__:
                    level = SkillLevel[raw_level]
                else:
                    level = SkillLevel.BEGINNER
                items.append(SkillItem(name=name.strip(), level=level))
        return items
    if isinstance(raw_value, dict):
        values = [value for value in raw_value.values() if isinstance(value, str)]
        return [SkillItem(name=value, level=SkillLevel.BEGINNER) for value in values]
    return []


def _parse_string_list(raw_value: object) -> list[str]:
    if raw_value is None:
        return []
    if isinstance(raw_value, str):
        try:
            parsed = json.loads(raw_value)
            return _parse_string_list(parsed)
        except json.JSONDecodeError:
            return [raw_value] if raw_value.strip() else []
    if isinstance(raw_value, list):
        return [entry.strip() for entry in raw_value if isinstance(entry, str) and entry.strip()]
    return []


async def _fetch_candidate_profile(candidate_id: str, db: AsyncSession) -> CandidateProfile:
    rows = await db.execute(
        text(
            """
            SELECT
              u.id,
              u.role,
              sp.skills AS student_skills,
              sp.preferred_locations AS student_locations,
              sp.preferred_work_mode AS student_work_mode,
              sp.expected_ctc_min AS student_expected_min,
              sp.expected_ctc_max AS student_expected_max,
              sp.cgpa AS student_cgpa,
              js.skills AS seeker_skills,
              js.preferred_locations AS seeker_locations,
              js.preferred_work_mode AS seeker_work_mode,
              js.expected_ctc_min AS seeker_expected_min,
              js.expected_ctc_max AS seeker_expected_max,
              js.total_experience_months AS seeker_experience_months
            FROM users u
            LEFT JOIN student_profiles sp ON sp.user_id = u.id
            LEFT JOIN job_seeker_profiles js ON js.user_id = u.id
            WHERE u.id = :candidate_id
            LIMIT 1
            """
        ),
        {"candidate_id": candidate_id},
    )
    row = rows.mappings().first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    skill_source = row.get("student_skills") if row.get("student_skills") is not None else row.get("seeker_skills")
    locations_source = (
        row.get("student_locations") if row.get("student_locations") is not None else row.get("seeker_locations")
    )
    work_mode_source = (
        row.get("student_work_mode") if row.get("student_work_mode") is not None else row.get("seeker_work_mode")
    )
    expected_min_source = (
        row.get("student_expected_min")
        if row.get("student_expected_min") is not None
        else row.get("seeker_expected_min")
    )
    expected_max_source = (
        row.get("student_expected_max")
        if row.get("student_expected_max") is not None
        else row.get("seeker_expected_max")
    )

    preferred_roles = []
    role_value = str(row.get("role") or "")
    if role_value == "STUDENT":
        preferred_roles = ["intern", "graduate", "trainee"]
    elif role_value == "JOB_SEEKER":
        preferred_roles = ["engineer", "developer", "analyst", "manager"]

    experience_months = row.get("seeker_experience_months")
    experience_years = int(experience_months // 12) if isinstance(experience_months, int) else None

    return CandidateProfile(
        userId=candidate_id,
        skills=_parse_skill_list(skill_source),
        preferredRoles=preferred_roles,
        preferredLocations=_parse_string_list(locations_source),
        workModePref=str(work_mode_source or "ANY"),
        expectedSalaryMin=int(expected_min_source) if isinstance(expected_min_source, int) else None,
        expectedSalaryMax=int(expected_max_source) if isinstance(expected_max_source, int) else None,
        cgpa=float(row.get("student_cgpa")) if row.get("student_cgpa") is not None else None,
        experienceYears=experience_years,
    )


def _parse_skills_required(raw_value: object) -> list[dict[str, object]]:
    if raw_value is None:
        return []
    if isinstance(raw_value, dict):
        skills = raw_value.get("skills")
        if isinstance(skills, list):
            parsed: list[dict[str, object]] = []
            for skill in skills:
                if isinstance(skill, dict):
                    name = skill.get("name")
                    if isinstance(name, str) and name.strip():
                        parsed.append(
                            {
                                "name": name.strip(),
                                "isMandatory": bool(skill.get("isMandatory", False)),
                                "level": str(skill.get("level", "BEGINNER")),
                            }
                        )
            return parsed
    if isinstance(raw_value, str):
        try:
            parsed_json = json.loads(raw_value)
            return _parse_skills_required(parsed_json)
        except json.JSONDecodeError:
            return []
    return []


async def _fetch_jobs(job_ids: list[str], db: AsyncSession) -> list[JobRequirement]:
    if not job_ids:
        return []

    rows = await db.execute(
        text(
            """
            SELECT
              id,
              title,
              skills_required,
              location_city,
              location_state,
              work_mode,
              min_ctc,
              max_ctc,
              job_type,
              experience_min_months,
              experience_max_months
            FROM jobs
            WHERE id = ANY(:job_ids)
            """
        ),
        {"job_ids": job_ids},
    )

    jobs: list[JobRequirement] = []
    for row in rows.mappings().all():
        exp_min_months = row.get("experience_min_months")
        exp_max_months = row.get("experience_max_months")
        jobs.append(
            JobRequirement(
                jobId=str(row.get("id")),
                title=str(row.get("title") or ""),
                skillsRequired=_parse_skills_required(row.get("skills_required")),
                locationCity=str(row.get("location_city")) if row.get("location_city") else None,
                locationState=str(row.get("location_state")) if row.get("location_state") else None,
                workMode=str(row.get("work_mode") or "ONSITE"),
                salaryMin=int(row.get("min_ctc")) if isinstance(row.get("min_ctc"), int) else None,
                salaryMax=int(row.get("max_ctc")) if isinstance(row.get("max_ctc"), int) else None,
                jobType=str(row.get("job_type") or "FULL_TIME"),
                experienceMin=int(exp_min_months // 12) if isinstance(exp_min_months, int) else None,
                experienceMax=int(exp_max_months // 12) if isinstance(exp_max_months, int) else None,
            )
        )
    return jobs


async def _fetch_candidate_tenant_id(candidate_id: str, db: AsyncSession) -> str | None:
    row = await db.execute(
        text("SELECT tenant_id FROM users WHERE id = :candidate_id LIMIT 1"),
        {"candidate_id": candidate_id},
    )
    result = row.mappings().first()
    if not result:
        return None
    value = result.get("tenant_id")
    return str(value) if value else None


async def _save_match_result(
    candidate_id: str,
    job: JobRequirement,
    result: MatchResult,
    db: AsyncSession,
) -> None:
    tenant_id = await _fetch_candidate_tenant_id(candidate_id, db)
    required_names = {
        normalize_skill_name(str(entry.get("name")))
        for entry in job.skillsRequired
        if isinstance(entry.get("name"), str)
    }
    missing_names = {normalize_skill_name(name) for name in result.missingSkills}
    matched_names = sorted(required_names - missing_names)
    missing_names_list = sorted(missing_names)

    await db.execute(
        text(
            """
            INSERT INTO ai_match_scores (
              tenant_id, job_id, candidate_user_id, score, matched_skills, missing_skills,
              reasoning, calculated_at, created_at, updated_at
            )
            VALUES (
              :tenant_id, :job_id, :candidate_user_id, :score, CAST(:matched_skills AS jsonb),
              CAST(:missing_skills AS jsonb), CAST(:reasoning AS jsonb), NOW(), NOW(), NOW()
            )
            ON CONFLICT (job_id, candidate_user_id)
            DO UPDATE SET
              tenant_id = EXCLUDED.tenant_id,
              score = EXCLUDED.score,
              matched_skills = EXCLUDED.matched_skills,
              missing_skills = EXCLUDED.missing_skills,
              reasoning = EXCLUDED.reasoning,
              calculated_at = NOW(),
              updated_at = NOW()
            """
        ),
        {
            "tenant_id": tenant_id,
            "job_id": result.jobId,
            "candidate_user_id": candidate_id,
            "score": int(round(result.matchScore)),
            "matched_skills": json.dumps(matched_names),
            "missing_skills": json.dumps(missing_names_list),
            "reasoning": json.dumps(
                {
                    "skillMatchPct": result.skillMatchPct,
                    "recommendedCourseIds": result.recommendedCourseIds,
                }
            ),
        },
    )


async def _enrich_recommendations(
    candidate: CandidateProfile, result: MatchResult, db: AsyncSession
) -> MatchResult:
    if not result.missingSkills:
        return result
    recommendations = await get_course_recommendations(
        RecommendationRequest(
            userId=candidate.userId,
            missingSkills=result.missingSkills,
            preferredRoles=candidate.preferredRoles,
        ),
        db,
    )
    result.recommendedCourseIds = recommendations.courseIds
    return result


async def _compute_from_request(match_request: MatchRequest, db: AsyncSession) -> MatchResponse:
    results: list[MatchResult] = []
    for job in match_request.jobs:
        base = calculate_match_score(match_request.candidate, job)
        enriched = await _enrich_recommendations(match_request.candidate, base, db)
        await _save_match_result(match_request.candidate.userId, job, enriched, db)
        results.append(enriched)

    await db.commit()
    return MatchResponse(
        candidateId=match_request.candidate.userId,
        results=sorted(results, key=lambda item: item.matchScore, reverse=True),
        computedAt=_utc_now_iso(),
    )


@router.post("")
async def compute_match(
    payload: MatchRequest,
    _: None = Depends(_ensure_service_key),
    db: AsyncSession = Depends(get_db),
) -> MatchResponse:
    return await _compute_from_request(payload, db)


@router.post("/batch")
async def compute_match_batch(
    payload: list[MatchRequest],
    _: None = Depends(_ensure_service_key),
    db: AsyncSession = Depends(get_db),
) -> list[MatchResponse]:
    if len(payload) > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Batch size limit is 100")

    responses: list[MatchResponse] = []
    for item in payload:
        responses.append(await _compute_from_request(item, db))
    return responses


@router.get("/{candidate_id}/{job_id}")
async def get_cached_or_compute_match(
    candidate_id: str,
    job_id: str,
    _: None = Depends(_ensure_service_key),
    db: AsyncSession = Depends(get_db),
) -> MatchResponse:
    row = await db.execute(
        text(
            """
            SELECT score, missing_skills, reasoning, calculated_at
            FROM ai_match_scores
            WHERE candidate_user_id = :candidate_id AND job_id = :job_id
            LIMIT 1
            """
        ),
        {"candidate_id": candidate_id, "job_id": job_id},
    )
    cached = row.mappings().first()
    if cached is not None:
        calculated_at = cached.get("calculated_at")
        if isinstance(calculated_at, datetime):
            if calculated_at >= datetime.now(timezone.utc) - timedelta(hours=24):
                missing_skills = cached.get("missing_skills")
                reasoning = cached.get("reasoning")
                missing: list[str]
                if isinstance(missing_skills, list):
                    missing = [str(item) for item in missing_skills]
                else:
                    missing = []
                skill_match = 0.0
                recommended: list[str] = []
                if isinstance(reasoning, dict):
                    skill_match = float(reasoning.get("skillMatchPct", 0.0))
                    raw_courses = reasoning.get("recommendedCourseIds", [])
                    if isinstance(raw_courses, list):
                        recommended = [str(item) for item in raw_courses]
                return MatchResponse(
                    candidateId=candidate_id,
                    results=[
                        MatchResult(
                            jobId=job_id,
                            matchScore=float(cached.get("score") or 0),
                            skillMatchPct=skill_match,
                            missingSkills=missing,
                            recommendedCourseIds=recommended,
                        )
                    ],
                    computedAt=calculated_at.isoformat(),
                )

    candidate = await _fetch_candidate_profile(candidate_id, db)
    jobs = await _fetch_jobs([job_id], db)
    if not jobs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    response = await _compute_from_request(MatchRequest(candidate=candidate, jobs=jobs), db)
    return response
