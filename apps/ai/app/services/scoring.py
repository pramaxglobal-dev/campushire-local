from app.models.schemas import ScoreRequest, ScoreResponse


def _points_for_count(value: int, per_item: int, max_points: int) -> int:
    return min(max_points, max(0, value) * per_item)


def calculate_career_score(req: ScoreRequest) -> ScoreResponse:
    breakdown: dict[str, int] = {
        "avatar": 5 if req.hasAvatar else 0,
        "bio": 5 if req.hasBio else 0,
        "resume": 20 if req.hasResume else 0,
        "skills": _points_for_count(req.skillsCount, 1, 20),
        "education": _points_for_count(req.educationCount, 5, 10),
        "experience": _points_for_count(req.experienceCount, 5, 10),
        "certifications": _points_for_count(req.certificationsCount, 3, 9),
        "projects": _points_for_count(req.projectsCount, 2, 6),
        "cgpa": 5 if req.cgpa is not None and req.cgpa >= 7.5 else 3 if req.cgpa is not None and req.cgpa >= 6.0 else 0,
        "linkedin": 5 if req.hasLinkedin else 0,
        "github": 3 if req.hasGithub else 0,
        "portfolio": 2 if req.hasPortfolio else 0,
    }

    total = sum(breakdown.values())
    career_score = max(0, min(100, total))

    return ScoreResponse(userId=req.userId, careerScore=career_score, breakdown=breakdown)
