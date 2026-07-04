import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  approveUserController,
  broadcastNotificationController,
  getPendingApprovalsController,
  getPlatformStatsController,
  getUserDetailController,
  listFeatureFlagsController,
  listUsersController,
  rejectUserController,
  suspendUserController,
  toggleFeatureFlagController,
  unsuspendUserController,
  updatePlatformSettingController
} from "./admin.controller";
import {
  AdminUserFilterSchema,
  BroadcastSchema,
  FeatureFlagKeyParamSchema,
  ReasonSchema,
  SettingKeyParamSchema,
  UpdatePlatformSettingSchema,
  UserIdParamSchema
} from "./admin.schema";

const router = Router();

router.use(authenticateJWT, requireRole(UserRole.SUPER_ADMIN));

router.get("/users", validate({ query: AdminUserFilterSchema }), listUsersController);
router.get("/users/:id", validate({ params: UserIdParamSchema }), getUserDetailController);
router.post("/users/:id/approve", validate({ params: UserIdParamSchema }), approveUserController);
router.post(
  "/users/:id/reject",
  validate({ params: UserIdParamSchema, body: ReasonSchema }),
  rejectUserController
);
router.post(
  "/users/:id/suspend",
  validate({ params: UserIdParamSchema, body: ReasonSchema }),
  suspendUserController
);
router.post("/users/:id/unsuspend", validate({ params: UserIdParamSchema }), unsuspendUserController);
router.get("/stats", getPlatformStatsController);
router.get("/pending-approvals", getPendingApprovalsController);
router.put(
  "/settings/:key",
  validate({ params: SettingKeyParamSchema, body: UpdatePlatformSettingSchema }),
  updatePlatformSettingController
);
router.patch(
  "/feature-flags/:key",
  validate({ params: FeatureFlagKeyParamSchema }),
  toggleFeatureFlagController
);
router.get("/feature-flags", listFeatureFlagsController);
router.post("/broadcast", validate({ body: BroadcastSchema }), broadcastNotificationController);

export { router as adminRoutes };
