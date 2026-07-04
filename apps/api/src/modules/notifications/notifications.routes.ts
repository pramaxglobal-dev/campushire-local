import { Router } from "express";
import { authenticateJWT } from "../../middleware/auth";
import {
  deleteNotificationController,
  getNotificationsController,
  getPreferencesController,
  getUnreadCountController,
  markAllAsReadController,
  markAsReadController,
  updatePreferencesController
} from "./notifications.controller";

const router = Router();

router.get("/", authenticateJWT, getNotificationsController);
router.get("/unread-count", authenticateJWT, getUnreadCountController);
router.patch("/:id/read", authenticateJWT, markAsReadController);
router.patch("/mark-all-read", authenticateJWT, markAllAsReadController);
router.delete("/:id", authenticateJWT, deleteNotificationController);
router.get("/preferences", authenticateJWT, getPreferencesController);
router.put("/preferences", authenticateJWT, updatePreferencesController);

export { router as notificationRoutes };
