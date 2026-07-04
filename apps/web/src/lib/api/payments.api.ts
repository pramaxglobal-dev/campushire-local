import type { CourseEnrollment, PaymentOrder, VerifyPaymentDto } from "@campushire/types";
import { apiClient, unwrapResponse } from "@/lib/api/client";

export const createCourseOrder = async (courseId: string): Promise<PaymentOrder> => {
  const response = await apiClient.post("/api/payments/course/order", { courseId });
  return unwrapResponse(response);
};

export const verifyCoursePayment = async (
  dto: VerifyPaymentDto
): Promise<CourseEnrollment> => {
  const response = await apiClient.post("/api/payments/course/verify", dto);
  return unwrapResponse(response);
};
