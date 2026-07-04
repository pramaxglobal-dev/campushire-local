import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireApproval } from "../../middleware/approval";
import { requireRole } from "../../middleware/rbac";
import {
  bulkMoveApplicationsController,
  downloadResumeController,
  getApplicationsForJobController,
  getATSStatsController,
  getKanbanBoardController,
  moveApplicationController,
  rejectApplicationController,
  shortlistApplicationController
} from "./ats.controller";

const router = Router();

router.get(
  "/board/:jobId",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  getKanbanBoardController
);
router.get(
  "/applications/:jobId",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  getApplicationsForJobController
);
router.patch(
  "/applications/:id/move",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  moveApplicationController
);
router.post(
  "/applications/bulk-move",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  bulkMoveApplicationsController
);
router.patch(
  "/applications/:id/shortlist",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  shortlistApplicationController
);
router.patch(
  "/applications/:id/reject",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  rejectApplicationController
);
router.get(
  "/applications/:id/resume",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  downloadResumeController
);
router.get(
  "/stats",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  getATSStatsController
);

export { router as atsRoutes };
