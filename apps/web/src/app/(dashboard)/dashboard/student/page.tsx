"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Bookmark, Briefcase, CalendarClock, FileUp, Sparkles, UserRound } from "lucide-react";
import {
  UserRole,
  type InterviewSlot,
  type Notification,
  type StudentAnalytics
} from "@campushire/types";
import { formatDate, formatSalaryRange, getStatusColor } from "@campushire/utils";
import { Badge, Button, Card, CardContent, ProgressBar } from "@/components/ui";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { getMyApplications, type ApplicationCard } from "@/lib/api/applications.api";
import { getJobFeed, getSavedJobs, type JobCard } from "@/lib/api/jobs.api";
import { getNotifications } from "@/lib/api/notifications.api";
import { getInterviews } from "@/lib/api/interviews.api";
import { getStudentAnalytics as getStudentAnalyticsApi } from "@/lib/api/analytics.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { ROUTES } from "@/lib/utils/routes";
import { toDate } from "@/lib/utils/dashboard";

interface DashboardData {
  jobs: JobCard[];
  applications: ApplicationCard[];
  interviews: InterviewSlot[];
  savedJobsCount: number;
  unreadNotifications: Notification[];
  analytics: StudentAnalytics;
}

const EMPTY_STUDENT_ANALYTICS: StudentAnalytics = {
  applicationFunnel: {
    applied: 0,
    screening: 0,
    shortlisted: 0,
    interviewing: 0,
    offered: 0,
    hired: 0,
    rejected: 0
  },
  applicationsByMonth: [],
  topSkillsMatched: [],
  responseRate: 0,
  avgTimeToResponse: 0,
  profileViews: 0,
  careerScoreHistory: [],
  savedJobsCount: 0,
  interviewsCount: 0
};

export default function StudentDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [jobFeed, applications, interviews, savedJobs, notifications, analytics] =
        await Promise.allSettled([
          getJobFeed(1, 4),
          getMyApplications({ page: 1, limit: 3 }),
          getInterviews(),
          getSavedJobs(1),
          getNotifications(1, true, 3),
          getStudentAnalyticsApi()
        ]);

      const hasAnySuccess = [jobFeed, applications, interviews, savedJobs, notifications, analytics].some(
        (result) => result.status === "fulfilled"
      );
      if (!hasAnySuccess) {
        setError("Unable to load dashboard.");
      }

      const interviewsData = interviews.status === "fulfilled" ? interviews.value : [];

      const nextInterviews = interviewsData
        .filter(
          (slot) =>
            toDate(slot.scheduledStartAt)?.getTime() &&
            new Date(slot.scheduledStartAt).getTime() > Date.now()
        )
        .sort((a, b) => new Date(a.scheduledStartAt).getTime() - new Date(b.scheduledStartAt).getTime())
        .slice(0, 2);

      setData({
        jobs: jobFeed.status === "fulfilled" ? (jobFeed.value.data ?? []) : [],
        applications: applications.status === "fulfilled" ? (applications.value.data ?? []) : [],
        interviews: nextInterviews,
        savedJobsCount: savedJobs.status === "fulfilled" ? savedJobs.value.meta.total : 0,
        unreadNotifications: notifications.status === "fulfilled" ? (notifications.value.data ?? []) : [],
        analytics: analytics.status === "fulfilled" ? analytics.value : EMPTY_STUDENT_ANALYTICS
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const careerScore =
    user?.role === UserRole.STUDENT
      ? user.studentProfile?.careerScore ?? 0
      : user?.jobSeekerProfile?.careerScore ?? 0;
  const scoreColor =
    careerScore > 70 ? "text-emerald-600" : careerScore >= 40 ? "text-amber-600" : "text-rose-600";

  const checklist = useMemo(() => {
    const studentProfile = user?.studentProfile;
    return [
      { label: "Profile Photo", done: Boolean(user?.avatarUrl), action: ROUTES.profile },
      { label: "Bio", done: Boolean(user?.bio), action: ROUTES.profile },
      { label: "Skills", done: Boolean(studentProfile?.skills), action: ROUTES.profile },
      { label: "Resume", done: Boolean(studentProfile?.resumeUrl), action: ROUTES.profile },
      { label: "Education", done: Boolean(user?.candidateEducations?.length), action: ROUTES.profile }
    ];
  }, [user]);

  const completion = Math.round(
    (checklist.filter((item) => item.done).length / Math.max(1, checklist.length)) * 100
  );

  if (loading) return <LoadingSkeleton variant="card" count={6} />;
  if (error || !data) return <ErrorState message={error ?? "Unable to load dashboard."} onRetry={() => void loadDashboard()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Dashboard"
        subtitle="Track readiness, discover jobs, and stay interview ready."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Application Analytics</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(data.analytics.applicationFunnel).map(([key, count]) => (
                  <div key={key} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{key}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{count}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900">Applications Over Time</p>
                <div className="flex items-end gap-2">
                  {data.analytics.applicationsByMonth.map((item) => (
                    <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-primary-600/80"
                        style={{ height: `${Math.max(8, item.count * 16)}px` }}
                      />
                      <span className="text-[10px] text-slate-500">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Response Rate</p>
                  <p className="mt-1 text-xl font-semibold text-emerald-700">{data.analytics.responseRate}%</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Career Trend</p>
                  <div className="mt-2 flex items-end gap-1">
                    {data.analytics.careerScoreHistory.map((point) => (
                      <div
                        key={`${point.date}-${point.score}`}
                        className="h-10 w-full rounded bg-accent/70"
                        style={{ height: `${Math.max(8, point.score / 2)}px` }}
                        title={`${point.date}: ${point.score}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Career Score</p>
                  <p className={`text-4xl font-bold ${scoreColor}`}>{careerScore}</p>
                  <p className="mt-2 text-sm text-slate-600">Complete your profile to improve your score</p>
                </div>
                <div className="w-full max-w-xs space-y-3">
                  <ProgressBar value={careerScore} />
                  <div className="grid grid-cols-3 gap-2">
                    <Link href={ROUTES.profile}>
                      <Button variant="outline" size="sm" className="w-full">
                        <FileUp className="mr-1 h-4 w-4" /> Resume
                      </Button>
                    </Link>
                    <Link href={ROUTES.profile}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Sparkles className="mr-1 h-4 w-4" /> Skills
                      </Button>
                    </Link>
                    <Link href={ROUTES.profile}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Briefcase className="mr-1 h-4 w-4" /> Experience
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Job Feed Preview</h2>
                <Link href={ROUTES.jobs.list} className="text-sm text-accent hover:underline">
                  View All Jobs
                </Link>
              </div>

              {data.jobs.length === 0 ? (
                <EmptyState icon={Briefcase} title="No jobs yet" description="Your personalized jobs appear here." />
              ) : (
                <div className="space-y-3">
                  {data.jobs.map((job) => (
                    <Link key={job.id} href={ROUTES.jobs.detail(job.id)} className="block">
                      <div className="rounded-xl border border-slate-100 p-4 transition hover:shadow-card-hover">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{job.title}</p>
                            <p className="text-sm text-slate-600">{job.company}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {job.hasApplied ? <Badge variant="success">Applied</Badge> : null}
                            <Badge>{job.jobType.replaceAll("_", " ")}</Badge>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          {job.salaryRange || (job.minCtc && job.maxCtc ? formatSalaryRange(job.minCtc, job.maxCtc) : "Compensation on request")}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Recent Applications</h2>
                <Link href={ROUTES.applications.list} className="text-sm text-accent hover:underline">
                  View All Applications
                </Link>
              </div>

              {data.applications.length === 0 ? (
                <EmptyState icon={Briefcase} title="No applications yet" description="Apply to jobs to start tracking your progress." />
              ) : (
                <div className="space-y-3">
                  {data.applications.map((application) => (
                    <Link key={application.id} href={ROUTES.applications.detail(application.id)} className="block">
                      <div className="rounded-xl border border-slate-100 p-4 transition hover:shadow-card-hover">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{application.jobTitle}</p>
                            <p className="text-sm text-slate-600">{application.company}</p>
                          </div>
                          <Badge className={getStatusColor(application.status)}>
                            {application.status.replaceAll("_", " ")}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Applied {formatDate(new Date(application.appliedAt), "dd MMM yyyy")}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-lg font-semibold text-slate-900">Profile Completion</h2>
              <p className="text-sm text-slate-600">{completion}% complete</p>
              <ProgressBar value={completion} />
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className={item.done ? "text-emerald-700" : "text-slate-700"}>
                      {item.done ? "✓" : "○"} {item.label}
                    </span>
                    {!item.done ? (
                      <Link href={item.action} className="text-accent hover:underline">
                        Add
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Upcoming Interviews</h2>
                <Link href={ROUTES.interviews} className="text-sm text-accent hover:underline">
                  View All
                </Link>
              </div>
              {data.interviews.length === 0 ? (
                <p className="text-sm text-slate-600">No upcoming interviews.</p>
              ) : (
                data.interviews.map((slot) => (
                  <div key={slot.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-900">{slot.round}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                      <CalendarClock className="h-4 w-4" />
                      {formatDate(new Date(slot.scheduledStartAt), "dd MMM, hh:mm a")}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{slot.mode.replaceAll("_", " ")}</p>
                    {slot.meetingLink ? (
                      <a href={slot.meetingLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-accent hover:underline">
                        Join Link
                      </a>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <Link href={ROUTES.savedJobs} className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Bookmark className="h-5 w-5" />
                  Saved Jobs
                </h2>
                <Badge variant="info">{data.savedJobsCount}</Badge>
              </Link>

              <div className="space-y-2">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Bell className="h-4 w-4" />
                  Unread Notifications
                </h3>
                {data.unreadNotifications.length === 0 ? (
                  <p className="text-sm text-slate-600">No unread notifications.</p>
                ) : (
                  data.unreadNotifications.map((notification) => (
                    <div key={notification.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{notification.body}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
