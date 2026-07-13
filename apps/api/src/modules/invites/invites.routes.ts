import { Router } from "express";
import { SubRole, UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireRole, requireSubRole } from "../../middleware/rbac";
import {
  createInviteController,
  deactivateInviteController,
  getInviteStatsController,
  listInvitesController,
  validateInviteCodeController
} from "./invites.controller";

const router = Router();

router.get("/validate/:code", validateInviteCodeController);

router.post("/", authenticateJWT, requireRole(UserRole.COLLEGE_ADMIN), requireSubRole(SubRole.OWNER, SubRole.ADMIN), createInviteController);
router.get("/", authenticateJWT, requireRole(UserRole.COLLEGE_ADMIN), listInvitesController);
router.delete("/:id", authenticateJWT, requireRole(UserRole.COLLEGE_ADMIN), requireSubRole(SubRole.OWNER, SubRole.ADMIN), deactivateInviteController);
router.get("/stats", authenticateJWT, requireRole(UserRole.COLLEGE_ADMIN), getInviteStatsController);

export { router as inviteRoutes };
