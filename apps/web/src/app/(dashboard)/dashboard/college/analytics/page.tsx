"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Building2, CheckCircle, GraduationCap, Users } from "lucide-react";
import { Badge, Card, CardContent, Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { getCohortDashboard, type CohortDashboardStats } from "@/lib/api/admin.api";

export default function CollegeAnalyticsPage() {
  const [stats, setStats] = useState<CohortDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCohortDashboard({ limit: 1 });
      setStats(res.stats);
    } catch (err: any) {
      setError(err?.message || "Failed to load placement analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return <LoadingSkeleton count={4} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadAnalytics()} />;
  }

  const total = stats?.totalStudents ?? 0;
  const placed = stats?.placedStudents ?? 0;
  const placementRate = total > 0 ? ((placed / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement Analytics & Reports"
        subtitle="Comprehensive placement statistics, hiring trends, and company recruitment breakdowns for your college."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Cohort Students</p>
                <p className="text-2xl font-bold text-slate-900">{total}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Placed Students</p>
                <p className="text-2xl font-bold text-emerald-600">{placed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Unplaced Students</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.unplacedStudents ?? 0}</p>
              </div>
              <Users className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Placement Rate</p>
                <p className="text-2xl font-bold text-indigo-600">{placementRate}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              Top Recruiting Companies
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Company Name</TableCell>
                  <TableCell>Students Hired</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!stats?.topRecruitingCompanies || stats.topRecruitingCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-6 text-slate-500">
                      No hires recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.topRecruitingCompanies.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-slate-900">{c.companyName}</TableCell>
                      <TableCell>
                        <Badge variant="success">{c.hiredCount} Hired</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              Applications by Stage Breakdown
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Stage</TableCell>
                  <TableCell>Count</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!stats?.applicationsPerStage || Object.keys(stats.applicationsPerStage).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-6 text-slate-500">
                      No application activity recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(stats.applicationsPerStage).map(([stage, count]) => (
                    <TableRow key={stage}>
                      <TableCell className="font-medium text-slate-700">{stage}</TableCell>
                      <TableCell className="font-bold text-slate-900">{count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
