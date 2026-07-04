import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireApproval } from "../../middleware/approval";
import { requireRole } from "../../middleware/rbac";
import {
  addCandidateNoteController,
  addRecruiterNoteController,
  applyToJobController,
  getApplicationDetailController,
  getMyApplicationsController,
  withdrawApplicationController
} from "./applications.controller";

const router = Router();

router.post(
  "/",
  authenticateJWT,
  requireRole(UserRole.STUDENT, UserRole.JOB_SEEKER),
  applyToJobController
);
router.get("/", authenticateJWT, getMyApplicationsController);
router.get("/:id", authenticateJWT, getApplicationDetailController);
router.post(
  "/:id/withdraw",
  authenticateJWT,
  requireRole(UserRole.STUDENT, UserRole.JOB_SEEKER),
  withdrawApplicationController
);
router.patch(
  "/:id/candidate-note",
  authenticateJWT,
  requireRole(UserRole.STUDENT, UserRole.JOB_SEEKER),
  addCandidateNoteController
);
router.patch(
  "/:id/recruiter-note",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  addRecruiterNoteController
);

export { router as applicationRoutes };
