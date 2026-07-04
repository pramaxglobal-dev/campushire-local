import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT, optionalAuth } from "../../middleware/auth";
import { requireApproval } from "../../middleware/approval";
import { requireRole } from "../../middleware/rbac";
import {
  cancelEventController,
  cancelRegistrationController,
  createEventController,
  getEventController,
  getMyEventsController,
  listEventsController,
  markAttendanceController,
  registerForEventController,
  updateEventController
} from "./events.controller";

const router = Router();

router.post(
  "/",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  requireApproval,
  createEventController
);
router.get("/", optionalAuth, listEventsController);
router.get("/my", authenticateJWT, getMyEventsController);
router.get("/:id", optionalAuth, getEventController);
router.put(
  "/:id",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  requireApproval,
  updateEventController
);
router.delete(
  "/:id",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  requireApproval,
  cancelEventController
);
router.post("/:id/register", authenticateJWT, requireApproval, registerForEventController);
router.delete("/:id/register", authenticateJWT, requireApproval, cancelRegistrationController);
router.patch(
  "/:id/attendance/:userId",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  requireApproval,
  markAttendanceController
);

export { router as eventRoutes };
