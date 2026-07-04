from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SkillLevel(str, Enum):
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"


class SkillItem(BaseModel):
    name: str
    level: SkillLevel = SkillLevel.BEGINNER


class CandidateProfile(BaseModel):
    userId: str
    skills: list[SkillItem] = Field(default_factory=list)
    preferredRoles: list[str] = Field(default_factory=list)
    preferredLocations: list[str] = Field(default_factory=list)
    workModePref: str = "ANY"
    expectedSalaryMin: Optional[int] = None
    expectedSalaryMax: Optional[int] = None
    cgpa: Optional[float] = None
    experienceYears: Optional[int] = None


class JobRequirement(BaseModel):
    jobId: str
    title: str
    skillsRequired: list[dict[str, object]] = Field(default_factory=list)
    locationCity: Optional[str] = None
    locationState: Optional[str] = None
    workMode: str = "ONSITE"
    salaryMin: Optional[int] = None
    salaryMax: Optional[int] = None
    jobType: str
    experienceMin: Optional[int] = None
    experienceMax: Optional[int] = None


class MatchRequest(BaseModel):
    candidate: CandidateProfile
    jobs: list[JobRequirement] = Field(default_factory=list)


class MatchResult(BaseModel):
    jobId: str
    matchScore: float
    skillMatchPct: float
    missingSkills: list[str] = Field(default_factory=list)
    recommendedCourseIds: list[str] = Field(default_factory=list)


class MatchResponse(BaseModel):
    candidateId: str
    results: list[MatchResult] = Field(default_factory=list)
    computedAt: str


class ScoreRequest(BaseModel):
    userId: str
    hasAvatar: bool
    hasBio: bool
    hasResume: bool
    skillsCount: int
    educationCount: int
    experienceCount: int
    certificationsCount: int
    projectsCount: int
    cgpa: Optional[float] = None
    hasLinkedin: bool
    hasGithub: bool
    hasPortfolio: bool


class ScoreResponse(BaseModel):
    userId: str
    careerScore: int
    breakdown: dict[str, int]


class RecommendationRequest(BaseModel):
    userId: str
    missingSkills: list[str] = Field(default_factory=list)
    preferredRoles: list[str] = Field(default_factory=list)


class RecommendationResponse(BaseModel):
    userId: str
    courseIds: list[str] = Field(default_factory=list)
    reasons: dict[str, str] = Field(default_factory=dict)
