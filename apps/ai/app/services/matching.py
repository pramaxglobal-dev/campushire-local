from dataclasses import dataclass
from typing import Optional

from app.models.schemas import CandidateProfile, JobRequirement, MatchResult, SkillItem, SkillLevel
from app.utils.skills import are_skills_equal
from app.utils.text import tokenize


@dataclass(frozen=True)
class RequiredSkill:
    name: str
    is_mandatory: bool
    level: SkillLevel


_level_rank = {
    SkillLevel.BEGINNER: 1,
    SkillLevel.INTERMEDIATE: 2,
    SkillLevel.ADVANCED: 3,
}


def _extract_required_skills(raw_items: list[dict[str, object]]) -> list[RequiredSkill]:
    items: list[RequiredSkill] = []
    for item in raw_items:
        raw_name = item.get("name")
        if not isinstance(raw_name, str) or not raw_name.strip():
            continue
        raw_level = item.get("level")
        level = SkillLevel.BEGINNER
        if isinstance(raw_level, str) and raw_level in SkillLevel.__members__:
            level = SkillLevel[raw_level]
        is_mandatory = bool(item.get("isMandatory", False))
        items.append(RequiredSkill(name=raw_name.strip(), is_mandatory=is_mandatory, level=level))
    return items


def _find_candidate_skill(candidate_skills: list[SkillItem], required_name: str) -> Optional[SkillItem]:
    for skill in candidate_skills:
        if are_skills_equal(skill.name, required_name):
            return skill
    return None


def _skill_component(
    candidate: CandidateProfile, required: list[RequiredSkill]
) -> tuple[float, float, list[str], list[str]]:
    if not required:
        return 100.0, 100.0, [], []

    total_weight = 0.0
    scored_weight = 0.0
    missing_mandatory: list[str] = []
    matched_skill_names: list[str] = []

    for req in required:
        weight = 2.0 if req.is_mandatory else 1.0
        total_weight += weight
        candidate_skill = _find_candidate_skill(candidate.skills, req.name)
        if candidate_skill is None:
            if req.is_mandatory:
                missing_mandatory.append(req.name)
            continue

        matched_skill_names.append(req.name)
        candidate_rank = _level_rank.get(candidate_skill.level, 1)
        required_rank = _level_rank.get(req.level, 1)
        if candidate_rank >= required_rank:
            scored_weight += weight
        else:
            scored_weight += weight * 0.5

    skill_score = 100.0 if total_weight == 0 else (scored_weight / total_weight) * 100.0
    return skill_score, skill_score, missing_mandatory, matched_skill_names


def _location_component(candidate: CandidateProfile, job: JobRequirement) -> float:
    if job.workMode == "REMOTE" or candidate.workModePref == "REMOTE" or candidate.workModePref == "ANY":
        return 100.0

    preferred_locations = {entry.strip().lower() for entry in candidate.preferredLocations if entry.strip()}
    if not preferred_locations:
        return 100.0

    city = (job.locationCity or "").strip().lower()
    state = (job.locationState or "").strip().lower()

    if city and city in preferred_locations:
        return 100.0
    if state and state in preferred_locations:
        return 50.0
    return 0.0


def _salary_component(candidate: CandidateProfile, job: JobRequirement) -> float:
    if (
        candidate.expectedSalaryMin is None
        or candidate.expectedSalaryMax is None
        or job.salaryMin is None
        or job.salaryMax is None
    ):
        return 100.0

    cand_min = min(candidate.expectedSalaryMin, candidate.expectedSalaryMax)
    cand_max = max(candidate.expectedSalaryMin, candidate.expectedSalaryMax)
    job_min = min(job.salaryMin, job.salaryMax)
    job_max = max(job.salaryMin, job.salaryMax)

    overlap = max(0, min(cand_max, job_max) - max(cand_min, job_min))
    if overlap <= 0:
        return 0.0
    union = max(cand_max, job_max) - min(cand_min, job_min)
    if union <= 0:
        return 100.0
    return max(0.0, min(100.0, (overlap / union) * 100.0))


def _role_component(candidate: CandidateProfile, job: JobRequirement) -> float:
    if not candidate.preferredRoles:
        return 100.0

    title_tokens = set(tokenize(job.title))
    for preferred in candidate.preferredRoles:
        preferred_tokens = tokenize(preferred)
        if not preferred_tokens:
            continue
        if all(token in title_tokens for token in preferred_tokens):
            return 100.0
        if any(token in title_tokens for token in preferred_tokens):
            return 50.0
    return 0.0


def _experience_component(candidate: CandidateProfile, job: JobRequirement) -> float:
    if candidate.experienceYears is None:
        return 70.0

    if job.experienceMin is None and job.experienceMax is None:
        return 100.0

    exp = candidate.experienceYears
    min_exp = job.experienceMin if job.experienceMin is not None else 0
    max_exp = job.experienceMax if job.experienceMax is not None else max(exp, min_exp)

    if min_exp <= exp <= max_exp:
        return 100.0
    if exp < min_exp:
        if min_exp <= 0:
            return 50.0
        return max(0.0, min(100.0, (exp / min_exp) * 100.0))
    return 80.0


def calculate_match_score(candidate: CandidateProfile, job: JobRequirement) -> MatchResult:
    required_skills = _extract_required_skills(job.skillsRequired)
    skill_component, skill_pct, missing_mandatory, _ = _skill_component(candidate, required_skills)
    location_component = _location_component(candidate, job)
    salary_component = _salary_component(candidate, job)
    role_component = _role_component(candidate, job)
    experience_component = _experience_component(candidate, job)

    weighted = (
        (skill_component * 0.40)
        + (location_component * 0.20)
        + (salary_component * 0.20)
        + (role_component * 0.10)
        + (experience_component * 0.10)
    )

    return MatchResult(
        jobId=job.jobId,
        matchScore=round(max(0.0, min(100.0, weighted)), 2),
        skillMatchPct=round(max(0.0, min(100.0, skill_pct)), 2),
        missingSkills=missing_mandatory,
        recommendedCourseIds=[],
    )
