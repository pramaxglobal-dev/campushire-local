import { Router } from "express";
import { UserRole } from "@campushire/types";
import { authenticateJWT } from "../../middleware/auth";
import { requireApproval } from "../../middleware/approval";
import { requireRole } from "../../middleware/rbac";
import {
  createReferralController,
  generateReferralLinkController,
  getInvoiceDetailController,
  getInvoicesController,
  getReferralsController,
  getReferralStatsController,
  markInvoicePaidController
} from "./freelance.controller";

const router = Router();

router.post(
  "/referrals",
  authenticateJWT,
  requireRole(UserRole.FREELANCE_RECRUITER),
  requireApproval,
  createReferralController
);
router.get(
  "/referrals",
  authenticateJWT,
  requireRole(UserRole.FREELANCE_RECRUITER),
  getReferralsController
);
router.get(
  "/referrals/stats",
  authenticateJWT,
  requireRole(UserRole.FREELANCE_RECRUITER),
  getReferralStatsController
);
router.post(
  "/referral-link",
  authenticateJWT,
  requireRole(UserRole.FREELANCE_RECRUITER),
  generateReferralLinkController
);
router.get(
  "/invoices",
  authenticateJWT,
  requireRole(UserRole.FREELANCE_RECRUITER),
  getInvoicesController
);
router.get(
  "/invoices/:id",
  authenticateJWT,
  requireRole(UserRole.FREELANCE_RECRUITER),
  getInvoiceDetailController
);
router.patch(
  "/invoices/:id/mark-paid",
  authenticateJWT,
  requireRole(UserRole.SUPER_ADMIN),
  markInvoicePaidController
);

export { router as freelanceRoutes };
