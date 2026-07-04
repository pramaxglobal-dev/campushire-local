import { z } from "zod";

export const CreateCourseOrderSchema = z.object({
  courseId: z.string().trim().min(1)
});

export const VerifyCoursePaymentSchema = z.object({
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  razorpaySignature: z.string().trim().min(1),
  courseId: z.string().trim().min(1)
});

export type CreateCourseOrderDto = z.infer<typeof CreateCourseOrderSchema>;
export type VerifyCoursePaymentDto = z.infer<typeof VerifyCoursePaymentSchema>;
