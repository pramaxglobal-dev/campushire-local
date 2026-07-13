import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT, optionalAuth } from "../../middleware/auth";
import { requireApproval } from "../../middleware/approval";
import { requireRole } from "../../middleware/rbac";
import {
  createCourseController,
  enrollInCourseController,
  getCourseController,
  getMyEnrollmentsController,
  getPartnerCoursesController,
  getPartnerEnrollmentsController,
  getPartnerStatsController,
  listCoursesController,
  publishCourseController,
  unpublishCourseController,
  updateCourseController,
  updateEnrollmentProgressController,
  assignStudentsController,
  getCourseCompletionController
} from "./training.controller";
import { SubRole } from "@campushire/types";
import { requireSubRole } from "../../middleware/rbac";

const courseRouter = Router();
const trainingRouter = Router();

courseRouter.get("/", optionalAuth, listCoursesController);
courseRouter.get("/my-enrollments", authenticateJWT, getMyEnrollmentsController);
courseRouter.get("/:id", optionalAuth, getCourseController);
courseRouter.post(
  "/",
  authenticateJWT,
  requireRole(UserRole.TRAINING_PARTNER),
  requireApproval,
  createCourseController
);
courseRouter.put(
  "/:id",
  authenticateJWT,
  requireRole(UserRole.TRAINING_PARTNER),
  updateCourseController
);
courseRouter.post(
  "/:id/publish",
  authenticateJWT,
  requireRole(UserRole.TRAINING_PARTNER),
  publishCourseController
);
courseRouter.post(
  "/:id/unpublish",
  authenticateJWT,
  requireRole(UserRole.TRAINING_PARTNER),
  unpublishCourseController
);
courseRouter.post("/:id/enroll", authenticateJWT, enrollInCourseController);
courseRouter.patch("/:id/progress", authenticateJWT, updateEnrollmentProgressController);
courseRouter.post(
  "/:id/assign",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN),
  requireSubRole(SubRole.OWNER, SubRole.ADMIN),
  assignStudentsController
);
courseRouter.get(
  "/:id/completion",
  authenticateJWT,
  requireRole(UserRole.COLLEGE_ADMIN, UserRole.TRAINING_PARTNER),
  getCourseCompletionController
);

trainingRouter.get(
  "/stats",
  authenticateJWT,
  requireRole(UserRole.TRAINING_PARTNER),
  getPartnerStatsController
);
trainingRouter.get(
  "/courses",
  authenticateJWT,
  requireRole(UserRole.TRAINING_PARTNER),
  getPartnerCoursesController
);
trainingRouter.get(
  "/enrollments",
  authenticateJWT,
  requireRole(UserRole.TRAINING_PARTNER),
  getPartnerEnrollmentsController
);

export { courseRouter as courseRoutes, trainingRouter as trainingRoutes };
