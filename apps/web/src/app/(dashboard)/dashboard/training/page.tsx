"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatContextType, CourseLevel, CourseMode, type Course } from "@campushire/types";
import { useRouter } from "next/navigation";
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
  getPartnerEnrollments,
  getPartnerCourses,
  getPartnerStats,
  publishCourse,
  unpublishCourse,
  updateCourse,
  type CreateCourseDto,
  type PartnerEnrollment,
  type TrainingStats
} from "@/lib/api/training.api";
import { toast } from "sonner";
import { asArray } from "@/lib/utils/dashboard";
import { getOrCreateThread } from "@/lib/api/chat.api";

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
  const router = useRouter();
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [enrollments, setEnrollments] = useState<PartnerEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formState, setFormState] = useState<CourseFormState>(initialCourseForm);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, coursesData, enrollmentRows] = await Promise.all([
        getPartnerStats(), getPartnerCourses(), getPartnerEnrollments()
      ]);
      setStats(statsData);
      setCourses(coursesData);
      setEnrollments(enrollmentRows);
      const mapped = enrollmentRows.reduce<Record<string, number>>((acc, item) => {
        acc[item.courseId] = (acc[item.courseId] ?? 0) + 1;
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

  const handleSaveCourse = async (): Promise<void> => {
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
      if (editingCourseId) {
        await updateCourse(editingCourseId, payload);
        toast.success("Course updated.");
      } else {
        await createCourse(payload);
        toast.success("Course created as draft.");
      }
      setModalOpen(false);
      setEditingCourseId(null);
      setFormState(initialCourseForm);
      await loadData();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Unable to create course.");
    } finally {
      setCreating(false);
    }
  };

  const startLearnerChat = async (enrollment: PartnerEnrollment): Promise<void> => {
    try {
      const thread = await getOrCreateThread({
        userId: enrollment.user.id,
        contextType: ChatContextType.COURSE_ENROLLMENT,
        contextId: enrollment.id
      });
      router.push(`/dashboard/chat?threadId=${thread.id}`);
    } catch (chatError) {
      toast.error(chatError instanceof Error ? chatError.message : "Unable to start learner chat.");
    }
  };

  const openCreateCourse = (): void => {
    setEditingCourseId(null);
    setFormState(initialCourseForm);
    setModalOpen(true);
  };

  const openEditCourse = (course: Course): void => {
    setEditingCourseId(course.id);
    setFormState({
      title: course.title,
      description: course.description,
      skills: asArray(course.skillsCovered).filter((skill): skill is string => typeof skill === "string").join(", "),
      durationHours: course.durationHours ? String(course.durationHours) : "",
      price: String(course.price),
      level: course.level,
      mode: course.mode
    });
    setModalOpen(true);
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
          <Button onClick={openCreateCourse}>
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
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditCourse(course)}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => void handleTogglePublish(course)}>
                        {course.isActive ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div><h2 className="text-lg font-semibold text-slate-900">Learner Success</h2><p className="text-sm text-slate-600">Monitor progress and start a course-scoped conversation with enrolled learners.</p></div>
          {enrollments.length === 0 ? <p className="text-sm text-slate-600">No learners have enrolled yet.</p> : (
            <Table><TableHeader><TableRow><TableCell>Learner</TableCell><TableCell>Course</TableCell><TableCell>Progress</TableCell><TableCell>Status</TableCell><TableCell>Action</TableCell></TableRow></TableHeader><TableBody>
              {enrollments.map((enrollment) => <TableRow key={enrollment.id}><TableCell><p className="font-medium">{enrollment.user.firstName} {enrollment.user.lastName}</p><p className="text-xs text-slate-500">{enrollment.user.email}</p></TableCell><TableCell>{enrollment.course.title}</TableCell><TableCell>{enrollment.progressPct}%</TableCell><TableCell><Badge>{enrollment.status.replaceAll("_", " ")}</Badge></TableCell><TableCell><Button size="sm" variant="outline" onClick={() => void startLearnerChat(enrollment)}>Message</Button></TableCell></TableRow>)}
            </TableBody></Table>
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingCourseId(null);
        }}
        title={editingCourseId ? "Edit Course" : "Create Course"}
      >
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
            <Button onClick={() => void handleSaveCourse()} disabled={creating}>
              {creating ? "Saving..." : editingCourseId ? "Save Changes" : "Create Draft"}
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
