"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CourseLevel, CourseMode, type Course } from "@campushire/types";
import { formatCurrency } from "@campushire/utils";
import { Badge, Button, Card, CardContent, Input, ProgressBar, Select } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  enrollInCourse,
  getMyEnrollments,
  listCourses,
  type CourseEnrollmentWithCourse,
  type CourseFilters
} from "@/lib/api/training.api";
import { ROUTES } from "@/lib/utils/routes";
import { BookOpen, GraduationCap } from "lucide-react";
import { toast } from "sonner";

const courseLevelOptions = Object.values(CourseLevel).map((level) => ({
  label: level,
  value: level
}));

const courseModeOptions = Object.values(CourseMode).map((mode) => ({
  label: mode,
  value: mode
}));

const parseSkills = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

export default function CourseCatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollmentWithCourse[]>([]);
  const [filters, setFilters] = useState<CourseFilters>({ page: 1, limit: 24 });
  const [skillsInput, setSkillsInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseResponse, myEnrollments] = await Promise.all([
        listCourses(filters),
        getMyEnrollments()
      ]);
      setCourses(courseResponse.data ?? []);
      setEnrollments(myEnrollments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load courses.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const enrollmentByCourse = useMemo(() => {
    return enrollments.reduce<Record<string, CourseEnrollmentWithCourse>>((acc, enrollment) => {
      acc[enrollment.courseId] = enrollment;
      return acc;
    }, {});
  }, [enrollments]);

  const handleEnroll = async (courseId: string): Promise<void> => {
    setEnrollingId(courseId);
    try {
      await enrollInCourse(courseId);
      toast.success("Enrollment successful.");
      await loadData();
    } catch (enrollError) {
      toast.error(enrollError instanceof Error ? enrollError.message : "Unable to enroll in course.");
    } finally {
      setEnrollingId(null);
    }
  };

  const applySkillsFilter = (): void => {
    const parsed = skillsInput
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    setFilters((prev) => ({
      ...prev,
      skillsCovered: parsed.length > 0 ? parsed : undefined,
      page: 1
    }));
  };

  if (loading) return <LoadingSkeleton variant="feed" count={8} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadData()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Catalog"
        subtitle="Discover partner-led courses to boost your hiring readiness."
      />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Select
            label="Level"
            value={filters.level ?? ""}
            options={[{ label: "All Levels", value: "" }, ...courseLevelOptions]}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                level: (event.target.value as CourseLevel) || undefined
              }))
            }
          />
          <Select
            label="Mode"
            value={filters.mode ?? ""}
            options={[{ label: "All Modes", value: "" }, ...courseModeOptions]}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                mode: (event.target.value as CourseMode) || undefined
              }))
            }
          />
          <Input
            label="Skills"
            helperText="Comma separated"
            value={skillsInput}
            onChange={(event) => setSkillsInput(event.target.value)}
          />
          <div className="flex items-end gap-2">
            <Button className="w-full" onClick={applySkillsFilter}>
              Apply
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSkillsInput("");
                setFilters({ page: 1, limit: 24 });
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description="Try different filters to find relevant programs."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const skills = parseSkills(course.skillsCovered);
            const enrollment = enrollmentByCourse[course.id];
            return (
              <Card key={course.id} className="overflow-hidden transition hover:shadow-card-hover">
                <div className="bg-gradient-to-br from-primary to-accent p-4 text-white">
                  <p className="line-clamp-2 text-lg font-bold">{course.title}</p>
                </div>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{course.level}</Badge>
                    <Badge>{course.mode}</Badge>
                  </div>

                  <p className="line-clamp-2 text-sm text-slate-600">{course.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {skill}
                      </span>
                    ))}
                    {skills.length > 3 ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        +{skills.length - 3} more
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      Duration: {course.durationHours ? `${course.durationHours}h` : "Self paced"}
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(course.price, course.currency)}
                    </p>
                  </div>

                  {enrollment ? (
                    <div className="space-y-2">
                      <ProgressBar value={enrollment.progressPct} />
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>{enrollment.progressPct}% complete</span>
                        <span>{enrollment.status.replaceAll("_", " ")}</span>
                      </div>
                      <Link href={ROUTES.courses.detail(course.id)}>
                        <Button className="w-full" variant="outline">
                          Continue
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Button
                        onClick={() => void handleEnroll(course.id)}
                        disabled={enrollingId === course.id}
                        className="w-full"
                      >
                        {enrollingId === course.id ? "Enrolling..." : "Enroll Now"}
                      </Button>
                      <Link href={ROUTES.courses.detail(course.id)}>
                        <Button variant="outline" className="w-full">
                          <GraduationCap className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
