import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { requireApproval } from "../../middleware/approval";
import {
  getCollegeAnalyticsController,
  getFreelanceAnalyticsController,
  getPlatformAnalyticsController,
  getRecruiterAnalyticsController,
  getStudentAnalyticsController
} from "./analytics.controller";

const router = Router();

router.get(
  "/student",
  authenticateJWT,
  requireRole(UserRole.STUDENT, UserRole.JOB_SEEKER),
  getStudentAnalyticsController
);
router.get(
  "/recruiter",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  getRecruiterAnalyticsController
);
router.get(
  "/college",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  requireApproval,
  getCollegeAnalyticsController
);
router.get(
  "/platform",
  authenticateJWT,
  requireRole(UserRole.SUPER_ADMIN),
  getPlatformAnalyticsController
);
router.get(
  "/freelance",
  authenticateJWT,
  requireRole(UserRole.FREELANCE_RECRUITER),
  requireApproval,
  getFreelanceAnalyticsController
);

export { router as analyticsRoutes };
