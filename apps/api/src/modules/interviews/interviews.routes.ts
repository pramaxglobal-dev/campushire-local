import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireApproval } from "../../middleware/approval";
import { requireRole } from "../../middleware/rbac";
import {
  cancelInterviewController,
  confirmInterviewController,
  getInterviewDetailController,
  getInterviewsController,
  recordOutcomeController,
  rescheduleInterviewController,
  scheduleInterviewController
} from "./interviews.controller";

const router = Router();

router.post(
  "/",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  scheduleInterviewController
);
router.get("/", authenticateJWT, getInterviewsController);
router.get("/:id", authenticateJWT, getInterviewDetailController);
router.patch(
  "/:id/reschedule",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  rescheduleInterviewController
);
router.patch(
  "/:id/cancel",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  cancelInterviewController
);
router.patch(
  "/:id/confirm",
  authenticateJWT,
  requireRole(UserRole.STUDENT, UserRole.JOB_SEEKER),
  requireApproval,
  confirmInterviewController
);
router.patch(
  "/:id/outcome",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  recordOutcomeController
);

export { router as interviewRoutes };
