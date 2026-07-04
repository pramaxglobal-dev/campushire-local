import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireApproval } from "../../middleware/approval";
import { requireRole } from "../../middleware/rbac";
import {
  browseCollegesController,
  disconnectConnectionController,
  getConnectionStatusController,
  listConnectionsController,
  requestConnectionController,
  respondToConnectionController
} from "./connections.controller";

const router = Router();

router.post(
  "/",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  requestConnectionController
);
router.get(
  "/browse-colleges",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  requireApproval,
  browseCollegesController
);
router.get("/", authenticateJWT, listConnectionsController);
router.get("/:recruiterId/:collegeId", authenticateJWT, getConnectionStatusController);
router.patch(
  "/:id/respond",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  requireApproval,
  respondToConnectionController
);
router.delete("/:id", authenticateJWT, requireApproval, disconnectConnectionController);

export { router as connectionRoutes };
