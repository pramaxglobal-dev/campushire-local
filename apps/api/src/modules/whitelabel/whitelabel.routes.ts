import { Router } from "express";
import multer from "multer";
import { SubRole, UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireRole, requireSubRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import {
  getConfigController,
  getPreviewController,
  publishConfigController,
  unpublishConfigController,
  uploadFaviconController,
  uploadLogoController,
  upsertConfigController
} from "./whitelabel.controller";
import { PublishSchema, WhiteLabelConfigSchema, WhiteLabelTenantQuerySchema } from "./whitelabel.schema";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.use(
  authenticateJWT,
  requireRole(UserRole.SUPER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.CORPORATE_RECRUITER)
);

router.get("/config", validate({ query: WhiteLabelTenantQuerySchema }), getConfigController);
router.post("/config", requireSubRole(SubRole.OWNER, SubRole.ADMIN), validate({ body: WhiteLabelConfigSchema }), upsertConfigController);
router.post("/publish", requireSubRole(SubRole.OWNER, SubRole.ADMIN), validate({ body: PublishSchema }), publishConfigController);
router.post("/unpublish", requireSubRole(SubRole.OWNER, SubRole.ADMIN), validate({ body: PublishSchema }), unpublishConfigController);
router.get("/preview", validate({ query: WhiteLabelTenantQuerySchema }), getPreviewController);
router.post("/logo", requireSubRole(SubRole.OWNER, SubRole.ADMIN), validate({ query: WhiteLabelTenantQuerySchema }), upload.single("file"), uploadLogoController);
router.post(
  "/favicon",
  requireSubRole(SubRole.OWNER, SubRole.ADMIN),
  validate({ query: WhiteLabelTenantQuerySchema }),
  upload.single("file"),
  uploadFaviconController
);

export { router as whitelabelRoutes };