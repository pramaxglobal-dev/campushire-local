import { Router } from "express";
import { authenticateJWT } from "../../middleware/auth";
import {
  createCoursePaymentOrderController,
  verifyCoursePaymentController
} from "./payments.controller";

const paymentsRoutes = Router();

paymentsRoutes.post("/course/order", authenticateJWT, createCoursePaymentOrderController);
paymentsRoutes.post("/course/verify", authenticateJWT, verifyCoursePaymentController);

export { paymentsRoutes };
