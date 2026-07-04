import multer from "multer";
import { Router } from "express";
import { authenticateJWT } from "../../middleware/auth";
import {
  getMessagesController,
  getOrCreateThreadController,
  getThreadsController,
  markThreadReadController,
  sendMessageController,
  uploadChatFileController
} from "./chat.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

router.get("/threads", authenticateJWT, getThreadsController);
router.post("/threads", authenticateJWT, getOrCreateThreadController);
router.get("/threads/:id/messages", authenticateJWT, getMessagesController);
router.post("/threads/:id/messages", authenticateJWT, sendMessageController);
router.patch("/threads/:id/read", authenticateJWT, markThreadReadController);
router.post("/upload", authenticateJWT, upload.single("file"), uploadChatFileController);

export { router as chatRoutes };
