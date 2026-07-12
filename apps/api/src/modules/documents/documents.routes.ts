import multer from "multer";
import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import {
  deleteDocumentController,
  getMyDocumentsController,
  getMyDocumentVerificationsController,
  getSharedDocumentsController,
  requestVerificationController,
  toggleShareWithRecruitersController,
  uploadDocumentController
} from "./documents.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post("/upload", authenticateJWT, upload.single("file"), uploadDocumentController);
router.get("/", authenticateJWT, getMyDocumentsController);
router.get("/verifications", authenticateJWT, getMyDocumentVerificationsController);
router.delete("/:id", authenticateJWT, deleteDocumentController);
router.patch("/:id/share", authenticateJWT, toggleShareWithRecruitersController);
router.post("/:id/verify", authenticateJWT, requestVerificationController);
router.get(
  "/candidate/:userId",
  authenticateJWT,
  requireRole(UserRole.CORPORATE_RECRUITER),
  getSharedDocumentsController
);

export { router as documentRoutes };
