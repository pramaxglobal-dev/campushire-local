"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { EnrollmentStatus } from "@campushire/types";
import { formatCurrency } from "@campushire/utils";
import { Badge, Button, Card, CardContent, ProgressBar } from "@/components/ui";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import {
  enrollInCourse,
  getCourse,
  getMyEnrollments,
  updateEnrollmentProgress,
  type CourseEnrollmentWithCourse,
  type CourseWithPartner
} from "@/lib/api/training.api";
import { createCourseOrder, verifyCoursePayment } from "@/lib/api/payments.api";
import { ROUTES } from "@/lib/utils/routes";
import { asArray } from "@/lib/utils/dashboard";
import { Award, BookOpen, Clock3, MapPin } from "lucide-react";
import { toast } from "sonner";

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [course, setCourse] = useState<CourseWithPartner | null>(null);
  const [enrollments, setEnrollments] = useState<CourseEnrollmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseData, myEnrollments] = await Promise.all([getCourse(courseId), getMyEnrollments()]);
      setCourse(courseData);
      setEnrollments(myEnrollments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load course details.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const enrollment = useMemo(
    () => enrollments.find((item) => item.courseId === courseId) ?? null,
    [courseId, enrollments]
  );

  const skills = useMemo(
    () => (course ? asArray(course.skillsCovered).filter((item): item is string => typeof item === "string") : []),
    [course]
  );

  const handleEnroll = async (): Promise<void> => {
    if (!course) {
      return;
    }

    setBusy(true);
    try {
      if (course.price <= 0) {
        await enrollInCourse(courseId);
        toast.success("Enrolled successfully.");
        await loadData();
        return;
      }

      const scriptLoaded = await loadRazorpay();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout.");
      }

      const order = await createCourseOrder(courseId);
      const key = order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) {
        throw new Error("Razorpay key is missing.");
      }
      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        throw new Error("Razorpay checkout is unavailable.");
      }

      await new Promise<void>((resolve, reject) => {
        const checkout = new RazorpayCtor({
          key,
          amount: order.amount,
          currency: order.currency,
          name: "CampusHire",
          description: `Course enrollment: ${course.title}`,
          order_id: order.orderId,
          handler: async (response) => {
            try {
              await verifyCoursePayment({
                courseId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });
              toast.success("Payment verified and enrollment completed.");
              resolve();
            } catch (paymentError) {
              reject(paymentError);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled by user."))
          },
          theme: {
            color: "#1B3A6B"
          }
        });
        checkout.open();
      });

      await loadData();
    } catch (enrollError) {
      toast.error(enrollError instanceof Error ? enrollError.message : "Unable to enroll.");
    } finally {
      setBusy(false);
    }
  };

  const handleProgressUpdate = async (): Promise<void> => {
    if (!enrollment) return;
    const next = Math.min(100, enrollment.progressPct + 10);
    setBusy(true);
    try {
      await updateEnrollmentProgress(enrollment.id, next);
      toast.success(next === 100 ? "Course marked complete." : `Progress updated to ${next}%.`);
      await loadData();
    } catch (progressError) {
      toast.error(progressError instanceof Error ? progressError.message : "Unable to update progress.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="profile" count={1} />;
  if (error || !course) return <ErrorState message={error ?? "Unable to load course."} onRetry={() => void loadData()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={course.title}
        subtitle="Course detail"
        breadcrumb={<Link href={ROUTES.courses.list}>Back to Courses</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">{course.level}</Badge>
                <Badge>{course.mode}</Badge>
              </div>
              <p className="whitespace-pre-wrap text-slate-700">{course.description}</p>
              <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <p className="inline-flex items-center gap-1">
                  <Clock3 className="h-4 w-4" />
                  Duration: {course.durationHours ? `${course.durationHours} hours` : "Self paced"}
                </p>
                <p className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Enrollment Count: {course.enrollmentCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="text-lg font-semibold text-slate-900">Skills Covered</h2>
              {skills.length === 0 ? (
                <p className="text-sm text-slate-600">No skills listed for this course.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5">
              <h2 className="text-lg font-semibold text-slate-900">Training Partner</h2>
              <p className="font-medium text-slate-900">{course.trainingPartner.organizationName}</p>
              <p className="text-sm text-slate-600">{course.trainingPartner.about || "No partner description available."}</p>
              {course.trainingPartner.website ? (
                <a
                  href={course.trainingPartner.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-accent hover:underline"
                >
                  Visit website
                </a>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-20 lg:h-fit">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-lg font-semibold text-slate-900">Enrollment</h2>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(course.price, course.currency)}
              </p>
              {enrollment ? (
                <>
                  <div>
                    <ProgressBar value={enrollment.progressPct} />
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                      <span>{enrollment.progressPct}% complete</span>
                      <span>{enrollment.status.replaceAll("_", " ")}</span>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => void handleProgressUpdate()} disabled={busy || enrollment.status === EnrollmentStatus.COMPLETED}>
                    {enrollment.status === EnrollmentStatus.COMPLETED ? "Completed" : "Mark Progress (+10%)"}
                  </Button>
                  {enrollment.status === EnrollmentStatus.COMPLETED && enrollment.certificateUrl ? (
                    <a href={enrollment.certificateUrl} target="_blank" rel="noreferrer" className="block">
                      <Button variant="outline" className="w-full">
                        <Award className="mr-2 h-4 w-4" />
                        Download Certificate
                      </Button>
                    </a>
                  ) : null}
                </>
              ) : (
                <Button className="w-full" onClick={() => void handleEnroll()} disabled={busy}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  {busy ? "Enrolling..." : "Enroll Now"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
