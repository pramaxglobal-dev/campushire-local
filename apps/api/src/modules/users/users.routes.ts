import { Router } from "express";
import multer from "multer";
import { authenticateJWT } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  getActivityLogController,
  deactivateAccountController,
  getProfileController,
  updateNotificationPreferencesController,
  updateProfileController,
  uploadAvatarController
} from "./users.controller";
import { ActivityQuerySchema, DeactivateAccountSchema, NotificationPreferenceSchema, UpdateProfileSchema } from "./users.schema";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.get("/profile", authenticateJWT, getProfileController);
router.put("/profile", authenticateJWT, validate({ body: UpdateProfileSchema }), updateProfileController);
router.post("/avatar", authenticateJWT, upload.single("file"), uploadAvatarController);
router.put(
  "/notification-preferences",
  authenticateJWT,
  validate({ body: NotificationPreferenceSchema }),
  updateNotificationPreferencesController
);
router.get("/activity", authenticateJWT, validate({ query: ActivityQuerySchema }), getActivityLogController);
router.delete("/account", authenticateJWT, validate({ body: DeactivateAccountSchema }), deactivateAccountController);

export { router as usersRoutes };
