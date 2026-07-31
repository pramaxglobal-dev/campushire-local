import { Router } from "express";
import { SubRole, UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireRole, requireSubRole } from "../../middleware/rbac";
import {
  createInviteController,
  deactivateInviteController,
  deleteInvitePermanentController,
  getInviteStatsController,
  listInvitesController,
  validateInviteCodeController
} from "./invites.controller";

const router = Router();

// Public — no auth needed
router.get("/validate/:code", validateInviteCodeController);

// Read-only — all COLLEGE_ADMIN staff can view invite codes and stats
router.get("/", authenticateJWT, requireRole(UserRole.COLLEGE_ADMIN), listInvitesController);
router.get("/stats", authenticateJWT, requireRole(UserRole.COLLEGE_ADMIN), getInviteStatsController);

// Write actions — Coordinators (MEMBER) are blocked; OWNER, ADMIN (TPO), MANAGER (Asst TPO) allowed
router.post(
  "/",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  requireSubRole(SubRole.OWNER, SubRole.ADMIN, SubRole.MANAGER),
  createInviteController
);
router.delete(
  "/permanent/:id",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  requireSubRole(SubRole.OWNER, SubRole.ADMIN, SubRole.MANAGER),
  deleteInvitePermanentController
);
router.delete(
  "/:id",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  requireSubRole(SubRole.OWNER, SubRole.ADMIN, SubRole.MANAGER),
  deactivateInviteController
);

export { router as inviteRoutes };
