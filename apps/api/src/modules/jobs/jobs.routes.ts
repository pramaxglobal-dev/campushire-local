import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT, optionalAuth } from "../../middleware/auth";
import { requireApproval } from "../../middleware/approval";
import { requireRole } from "../../middleware/rbac";
import {
  approveJobController,
  createJobController,
  deleteJobController,
  getJobController,
  getJobFeedController,
  getRecruiterJobStatsController,
  getSavedJobsController,
  listJobsController,
  rejectJobController,
  saveJobController,
  submitJobController,
  unsaveJobController,
  updateJobController
} from "./jobs.controller";

const router = Router();

router.post(
  "/",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  createJobController
);
router.get("/", optionalAuth, listJobsController);
router.get("/feed", authenticateJWT, getJobFeedController);
router.get("/saved", authenticateJWT, getSavedJobsController);
router.get("/stats", authenticateJWT, requireRole(UserRole.CORPORATE_RECRUITER), getRecruiterJobStatsController);
router.get("/:id", optionalAuth, getJobController);
router.put(
  "/:id",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  updateJobController
);
router.delete(
  "/:id",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  deleteJobController
);
router.post("/:id/save", authenticateJWT, requireApproval, saveJobController);
router.delete("/:id/save", authenticateJWT, requireApproval, unsaveJobController);
router.post(
  "/:id/submit",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  submitJobController
);
router.post("/:id/approve", authenticateJWT, requireRole(UserRole.SUPER_ADMIN), approveJobController);
router.post("/:id/reject", authenticateJWT, requireRole(UserRole.SUPER_ADMIN), rejectJobController);

export { router as jobRoutes };
