import { PaymentStatus, type CourseEnrollment, type PaymentOrder } from "@campushire/types";
import { prisma } from "../../lib/prisma";
import { createOrder, verifyPaymentSignature } from "../../lib/razorpay";
import { logActivity } from "../../lib/activity";
import { resolveUserTenant } from "../../lib/tenant";
import { env } from "../../config/env";
import { enrollInCourse } from "../training/training.service";
import type { VerifyCoursePaymentDto } from "./payments.schema";

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

const getTenantScopedCourse = async (userId: string, courseId: string) => {
  const tenantId = await resolveUserTenant(userId);

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      tenantId,
      isActive: true
    },
    select: {
      id: true,
      tenantId: true,
      price: true,
      currency: true
    }
  });

  if (!course) {
    throw new ServiceError("Course not found.", 404);
  }

  return course;
};

const ensureNotEnrolled = async (userId: string, courseId: string): Promise<void> => {
  const existing = await prisma.courseEnrollment.findUnique({
    where: {
      courseId_userId: {
        courseId,
        userId
      }
    },
    select: { id: true }
  });

  if (existing) {
    throw new ServiceError("Already enrolled in this course.", 409);
  }
};

const markRevenuePaid = async (enrollmentId: string): Promise<void> => {
  await prisma.courseRevenue.updateMany({
    where: {
      enrollmentId
    },
    data: {
      paymentStatus: PaymentStatus.PAID,
      settledAt: new Date()
    }
  });
};

export const createCoursePaymentOrder = async (
  userId: string,
  courseId: string
): Promise<PaymentOrder> => {
  const course = await getTenantScopedCourse(userId, courseId);
  await ensureNotEnrolled(userId, course.id);

  if (course.price <= 0) {
    return {
      orderId: `FREE-${course.id}-${userId}`,
      amount: 0,
      currency: course.currency,
      keyId: ""
    };
  }

  const order = await createOrder(
    course.price * 100,
    course.currency,
    `course-${course.id}-${userId}-${Date.now()}`
  );

  return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID ?? ""
    };
};

export const verifyCoursePayment = async (
  userId: string,
  dto: VerifyCoursePaymentDto
): Promise<CourseEnrollment> => {
  const course = await getTenantScopedCourse(userId, dto.courseId);
  await ensureNotEnrolled(userId, course.id);

  if (course.price > 0) {
    const valid = verifyPaymentSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature
    );
    if (!valid) {
      throw new ServiceError("Invalid payment signature.", 400);
    }
  }

  const enrollment = await enrollInCourse(userId, course.id);
  await markRevenuePaid(enrollment.id);

  await logActivity({
    actorUserId: userId,
    tenantId: course.tenantId,
    action: "payment.course_verified",
    entityType: "CourseEnrollment",
    entityId: enrollment.id,
    metadata: {
      courseId: course.id,
      orderId: dto.razorpayOrderId,
      paymentId: dto.razorpayPaymentId
    }
  });

  return enrollment;
};
