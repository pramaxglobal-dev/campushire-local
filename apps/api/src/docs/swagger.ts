import type { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     ApiEnvelope:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           nullable: true
 *         error:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 * /api/auth/login:
 *   post:
 *     summary: Login and receive access/refresh tokens
 *     tags: [Auth]
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 * /api/auth/logout:
 *   post:
 *     summary: Logout and revoke refresh token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email with token
 *     tags: [Auth]
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List jobs with filters
 *     tags: [Jobs]
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 * /api/jobs/feed:
 *   get:
 *     summary: Personalized/public job feed
 *     tags: [Jobs]
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job detail
 *     tags: [Jobs]
 *   put:
 *     summary: Update job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 * /api/jobs/{id}/save:
 *   post:
 *     summary: Save a job for candidate
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Remove saved job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 * /api/jobs/{id}/submit:
 *   post:
 *     summary: Submit job for approval
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 * /api/jobs/{id}/approve:
 *   post:
 *     summary: Approve a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 * /api/jobs/{id}/reject:
 *   post:
 *     summary: Reject a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /api/applications:
 *   get:
 *     summary: List candidate applications
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Apply to a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 * /api/applications/{id}:
 *   get:
 *     summary: Get application detail
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 * /api/applications/{id}/withdraw:
 *   post:
 *     summary: Withdraw application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /api/ats/{jobId}/board:
 *   get:
 *     summary: Get ATS kanban board for a job
 *     tags: [ATS]
 *     security:
 *       - bearerAuth: []
 * /api/ats/applications/{id}/move:
 *   patch:
 *     summary: Move a single application to new stage
 *     tags: [ATS]
 *     security:
 *       - bearerAuth: []
 * /api/ats/applications/bulk-move:
 *   patch:
 *     summary: Bulk move multiple applications
 *     tags: [ATS]
 *     security:
 *       - bearerAuth: []
 * /api/ats/{jobId}/applications:
 *   get:
 *     summary: List ATS applications for a job
 *     tags: [ATS]
 *     security:
 *       - bearerAuth: []
 * /api/ats/stats:
 *   get:
 *     summary: Get ATS pipeline stats
 *     tags: [ATS]
 *     security:
 *       - bearerAuth: []
 */

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CampusHire API",
      version: "1.0.0",
      description: "CampusHire backend API documentation"
    },
    servers: [
      {
        url: "http://localhost:4000"
      }
    ]
  },
  apis: [__filename]
});

export const setupSwaggerDocs = (app: Express): void => {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
