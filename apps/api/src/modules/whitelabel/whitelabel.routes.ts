import { Router } from "express";
import multer from "multer";
import { UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
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
router.post("/config", validate({ body: WhiteLabelConfigSchema }), upsertConfigController);
router.post("/publish", validate({ body: PublishSchema }), publishConfigController);
router.post("/unpublish", validate({ body: PublishSchema }), unpublishConfigController);
router.get("/preview", validate({ query: WhiteLabelTenantQuerySchema }), getPreviewController);
router.post("/logo", validate({ query: WhiteLabelTenantQuerySchema }), upload.single("file"), uploadLogoController);
router.post(
  "/favicon",
  validate({ query: WhiteLabelTenantQuerySchema }),
  upload.single("file"),
  uploadFaviconController
);

export { router as whitelabelRoutes };