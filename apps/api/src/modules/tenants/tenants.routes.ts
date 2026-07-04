import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  createTenantController,
  getTenantController,
  getTenantStatsController,
  listTenantsController,
  toggleTenantActiveController,
  updateTenantController
} from "./tenants.controller";
import {
  CreateTenantSchema,
  TenantListQuerySchema,
  TenantParamsSchema,
  UpdateTenantSchema
} from "./tenants.schema";

const router = Router();

router.use(authenticateJWT, requireRole(UserRole.SUPER_ADMIN));

router.get("/", validate({ query: TenantListQuerySchema }), listTenantsController);
router.post("/", validate({ body: CreateTenantSchema }), createTenantController);
router.get("/:id", validate({ params: TenantParamsSchema }), getTenantController);
router.put("/:id", validate({ params: TenantParamsSchema, body: UpdateTenantSchema }), updateTenantController);
router.patch("/:id/toggle", validate({ params: TenantParamsSchema }), toggleTenantActiveController);
router.get("/:id/stats", validate({ params: TenantParamsSchema }), getTenantStatsController);

export { router as tenantsRoutes };