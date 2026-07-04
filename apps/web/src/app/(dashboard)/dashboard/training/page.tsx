"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CourseLevel, CourseMode, type Course } from "@campushire/types";
import { formatCurrency } from "@campushire/utils";
import { BarChart3, BookOpen, DollarSign, GraduationCap } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  Textarea
} from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  createCourse,
  getCourse,
  getPartnerCourses,
  getPartnerStats,
  publishCourse,
  unpublishCourse,
  type CreateCourseDto,
  type TrainingStats
} from "@/lib/api/training.api";
import { toast } from "sonner";

interface CourseFormState {
  title: string;
  description: string;
  skills: string;
  durationHours: string;
  price: string;
  level: CourseLevel;
  mode: CourseMode;
}

const initialCourseForm: CourseFormState = {
  title: "",
  description: "",
  skills: "",
  durationHours: "",
  price: "",
  level: CourseLevel.BEGINNER,
  mode: CourseMode.ONLINE
};

export default function TrainingDashboardPage() {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formState, setFormState] = useState<CourseFormState>(initialCourseForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, coursesData] = await Promise.all([getPartnerStats(), getPartnerCourses()]);
      setStats(statsData);
      setCourses(coursesData);

      const counts = await Promise.all(
        coursesData.map(async (course) => {
          const detail = await getCourse(course.id);
          return { courseId: course.id, enrollmentCount: detail.enrollmentCount };
        })
      );
      const mapped = counts.reduce<Record<string, number>>((acc, item) => {
        acc[item.courseId] = item.enrollmentCount;
        return acc;
      }, {});
      setEnrollmentCounts(mapped);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load training dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const averageRevenuePerCourse = useMemo(() => {
    if (!stats || stats.totalCourses === 0) return 0;
    return Math.round(stats.totalRevenue / stats.totalCourses);
  }, [stats]);

  const handleCreateCourse = async (): Promise<void> => {
    if (!formState.title.trim() || !formState.description.trim() || !formState.price.trim()) {
      toast.error("Please complete required fields.");
      return;
    }

    const payload: CreateCourseDto = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      skillsCovered: formState.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0),
      durationHours: formState.durationHours ? Number(formState.durationHours) : undefined,
      price: Number(formState.price),
      level: formState.level,
      mode: formState.mode
    };

    setCreating(true);
    try {
      await createCourse(payload);
      toast.success("Course created as draft.");
      setModalOpen(false);
      setFormState(initialCourseForm);
      await loadData();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Unable to create course.");
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (course: Course): Promise<void> => {
    try {
      if (course.isActive) {
        await unpublishCourse(course.id);
        toast.success("Course unpublished.");
      } else {
        await publishCourse(course.id);
        toast.success("Course published.");
      }
      await loadData();
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : "Unable to update course status.");
    }
  };

  if (loading) return <LoadingSkeleton variant="table" count={8} />;
  if (error || !stats) return <ErrorState message={error ?? "Unable to load training dashboard."} onRetry={() => void loadData()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Partner Dashboard"
        subtitle="Manage courses, enrollments, and partner revenue."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Courses" value={stats.totalCourses} icon={BookOpen} />
        <StatCard title="Total Enrollments" value={stats.totalEnrollments} icon={GraduationCap} />
        <StatCard title="Revenue" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} />
        <StatCard title="Completion Rate" value={`${stats.completionRate}%`} icon={BarChart3} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Your Courses</h2>
            <p className="text-sm text-slate-600">
              Average revenue per course: {formatCurrency(averageRevenuePerCourse)}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Enrollments</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <p className="font-medium text-slate-900">{course.title}</p>
                    <p className="text-xs text-slate-500">{course.mode.replaceAll("_", " ")}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={course.isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                      {course.isActive ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>{enrollmentCounts[course.id] ?? 0}</TableCell>
                  <TableCell>{formatCurrency(course.price, course.currency)}</TableCell>
                  <TableCell>{course.level}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => void handleTogglePublish(course)}>
                      {course.isActive ? "Unpublish" : "Publish"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Create Course">
        <div className="space-y-3">
          <Input
            label="Title"
            value={formState.title}
            onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
          />
          <Textarea
            label="Description"
            value={formState.description}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
          />
          <Input
            label="Skills (comma separated)"
            value={formState.skills}
            onChange={(event) => setFormState((prev) => ({ ...prev, skills: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration Hours"
              type="number"
              value={formState.durationHours}
              onChange={(event) => setFormState((prev) => ({ ...prev, durationHours: event.target.value }))}
            />
            <Input
              label="Price (INR)"
              type="number"
              value={formState.price}
              onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Level"
              value={formState.level}
              options={Object.values(CourseLevel).map((level) => ({ label: level, value: level }))}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, level: event.target.value as CourseLevel }))
              }
            />
            <Select
              label="Mode"
              value={formState.mode}
              options={Object.values(CourseMode).map((mode) => ({ label: mode, value: mode }))}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, mode: event.target.value as CourseMode }))
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateCourse()} disabled={creating}>
              {creating ? "Creating..." : "Create Draft"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const StatCard = ({
  title,
  value,
  icon: Icon
}: {
  title: string;
  value: string | number;
  icon: typeof BookOpen;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{title}</p>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </CardContent>
  </Card>
);
