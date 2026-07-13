import { Router } from "express";
import { SubRole, UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireRole, requireSubRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  approveUserController,
  broadcastNotificationController,
  getPendingApprovalsController,
  getPlatformStatsController,
  getUserDetailController,
  listAuditLogsController,
  listFeatureFlagsController,
  listPlatformSettingsController,
  listUsersController,
  rejectUserController,
  suspendUserController,
  toggleFeatureFlagController,
  unsuspendUserController,
  updatePlatformSettingController,
  bulkApproveStudentsController,
  getCohortDashboardController
} from "./admin.controller";
import {
  AdminUserFilterSchema,
  BroadcastSchema,
  FeatureFlagKeyParamSchema,
  ReasonSchema,
  SettingKeyParamSchema,
  UpdatePlatformSettingSchema,
  UserIdParamSchema,
  BulkApproveStudentsSchema,
  CohortDashboardFilterSchema
} from "./admin.schema";

const router = Router();

// ==========================================
// IMPORTANT: ROUTE ORDERING
// COLLEGE_ADMIN (TPO) routes MUST be defined ABOVE the global SUPER_ADMIN
// middleware below. Otherwise, TPO endpoints will incorrectly return 403 
// since TPO users are not SUPER_ADMINs.
// ==========================================

// ==========================================
// COLLEGE_ADMIN ROUTES (TPO)
// ==========================================

router.post(
  "/students/bulk-approve",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  requireSubRole(SubRole.OWNER, SubRole.ADMIN),
  validate({ body: BulkApproveStudentsSchema }),
  bulkApproveStudentsController
);

router.get(
  "/cohort-dashboard",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  validate({ query: CohortDashboardFilterSchema }),
  getCohortDashboardController
);

// ==========================================
// SUPER_ADMIN ROUTES (PLATFORM)
// ==========================================
router.use(authenticateJWT, requireRole(UserRole.SUPER_ADMIN));

router.get("/users", validate({ query: AdminUserFilterSchema }), listUsersController);
router.get("/users/:id", validate({ params: UserIdParamSchema }), getUserDetailController);
router.post("/users/:id/approve", validate({ params: UserIdParamSchema }), approveUserController);
router.post(
  "/users/:id/reject",
  requireSubRole(SubRole.OWNER, SubRole.ADMIN),
  validate({ params: UserIdParamSchema, body: ReasonSchema }),
  rejectUserController
);
router.post(
  "/users/:id/suspend",
  requireSubRole(SubRole.OWNER, SubRole.ADMIN),
  validate({ params: UserIdParamSchema, body: ReasonSchema }),
  suspendUserController
);
router.post("/users/:id/unsuspend", validate({ params: UserIdParamSchema }), unsuspendUserController);
router.get("/stats", getPlatformStatsController);
router.get("/pending-approvals", getPendingApprovalsController);
router.get("/audit-logs", listAuditLogsController);
router.get("/settings", listPlatformSettingsController);
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
