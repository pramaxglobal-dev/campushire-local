import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT, optionalAuth } from "../../middleware/auth";
import { requireApproval } from "../../middleware/approval";
import { requireRole } from "../../middleware/rbac";
import {
  completeServiceRequestController,
  createServiceRequestController,
  getMyServiceRequestsController,
  getVendorDetailController,
  getVendorStatsController,
  listVendorsController,
  rateVendorController,
  respondToServiceRequestController,
  updateServiceRequestController
} from "./vendors.controller";

const vendorRouter = Router();
const serviceRequestRouter = Router();

vendorRouter.get("/", optionalAuth, listVendorsController);
vendorRouter.get(
  "/stats",
  authenticateJWT,
  requireRole(UserRole.VENDOR),
  getVendorStatsController
);
vendorRouter.get("/:id", optionalAuth, getVendorDetailController);

serviceRequestRouter.post("/", authenticateJWT, requireApproval, createServiceRequestController);
serviceRequestRouter.get("/", authenticateJWT, getMyServiceRequestsController);
serviceRequestRouter.put("/:id", authenticateJWT, updateServiceRequestController);
serviceRequestRouter.patch(
  "/:id/respond",
  authenticateJWT,
  requireRole(UserRole.VENDOR),
  respondToServiceRequestController
);
serviceRequestRouter.patch(
  "/:id/complete",
  authenticateJWT,
  requireRole(UserRole.VENDOR),
  completeServiceRequestController
);
serviceRequestRouter.post("/:id/rate", authenticateJWT, rateVendorController);

export { vendorRouter as vendorRoutes, serviceRequestRouter as serviceRequestRoutes };
