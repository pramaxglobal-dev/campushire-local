import request from "supertest";
import { app } from "../../../app";
import { prisma } from "../../../lib/prisma";
import { UserRole, SubRole } from "@campushire/types";
import { generateAccessToken } from "../../../lib/jwt";

describe("TPO Routes Integration", () => {
  jest.setTimeout(30000); // 30 seconds timeout
  let ownerToken: string;
  let coordinatorToken: string;
  let collegeProfileId: string;
  let otherCollegeProfileId: string;
  let targetStudentId: string;
  let otherStudentId: string;
  
  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Test Tenant",
        slug: "test-tenant-" + Date.now(),
      }
    });

    // Generate an owner
    const owner = await prisma.user.create({
      data: {
        email: "tpo_owner@test.com",
        tin: "tin_tpo_owner",
        firstName: "Owner",
        lastName: "Test",
        role: UserRole.COLLEGE_ADMIN,
        subRole: SubRole.OWNER,
        tenantId: tenant.id,
        isActive: true,
        isApproved: true,
      }
    });

    const coordinator = await prisma.user.create({
      data: {
        email: "tpo_coord@test.com",
        tin: "tin_tpo_coord",
        firstName: "Coord",
        lastName: "Test",
        role: UserRole.COLLEGE_ADMIN,
        subRole: SubRole.MANAGER, // Not allowed to bulk approve
        tenantId: tenant.id,
        isActive: true,
        isApproved: true,
      }
    });

    const college = await prisma.collegeProfile.create({
      data: {
        tenantId: tenant.id,
        adminUserId: owner.id,
        name: "Test College",
        slug: "test-college-" + Date.now(),
      }
    });
    collegeProfileId = college.id;

    const otherCollege = await prisma.collegeProfile.create({
        data: {
            tenantId: tenant.id,
            adminUserId: coordinator.id,
            name: "Other College",
            slug: "other-college-" + Date.now()
        }
    });
    otherCollegeProfileId = otherCollege.id;

    const studentUser = await prisma.user.create({
        data: {
            email: "student@test.com",
            tin: "tin_student",
            firstName: "Student",
            lastName: "Test",
            role: UserRole.STUDENT
        }
    });
    targetStudentId = studentUser.id;

    await prisma.studentProfile.create({
        data: {
            userId: studentUser.id,
            tenantId: tenant.id,
            collegeProfileId: college.id
        }
    });

    const otherStudentUser = await prisma.user.create({
        data: {
            email: "other_student@test.com",
            tin: "tin_other_student",
            firstName: "Other",
            lastName: "Test",
            role: UserRole.STUDENT
        }
    });
    otherStudentId = otherStudentUser.id;

    await prisma.studentProfile.create({
        data: {
            userId: otherStudentUser.id,
            tenantId: tenant.id,
            collegeProfileId: otherCollege.id
        }
    });

    ownerToken = generateAccessToken({
      userId: owner.id,
      tenantId: tenant.id,
      role: owner.role,
      subRole: owner.subRole,
      familyId: null
    });

    coordinatorToken = generateAccessToken({
      userId: coordinator.id,
      tenantId: tenant.id,
      role: coordinator.role,
      subRole: coordinator.subRole,
      familyId: null
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: ["tpo_owner@test.com", "tpo_coord@test.com", "student@test.com", "other_student@test.com"] }
      }
    });
    await prisma.collegeProfile.deleteMany({
        where: { id: { in: [collegeProfileId, otherCollegeProfileId] } }
    });
    await prisma.tenant.deleteMany({
        where: { name: "Test Tenant" }
    });
  });

  describe("GET /api/admin/cohort-dashboard", () => {
    it("allows MANAGER (Coordinator) to access dashboard (No sub-role restriction)", async () => {
      const res = await request(app)
        .get("/api/admin/cohort-dashboard")
        .set("Authorization", `Bearer ${coordinatorToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("allows OWNER to access dashboard", async () => {
      const res = await request(app)
        .get("/api/admin/cohort-dashboard")
        .set("Authorization", `Bearer ${ownerToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("POST /api/admin/students/bulk-approve", () => {
    it("denies access to MANAGER (Coordinator)", async () => {
      const res = await request(app)
        .post("/api/admin/students/bulk-approve")
        .set("Authorization", `Bearer ${coordinatorToken}`)
        .send({ userIds: [targetStudentId] });
      
      expect(res.status).toBe(403);
    });

    it("allows access to OWNER and approves their own student", async () => {
      const res = await request(app)
        .post("/api/admin/students/bulk-approve")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ userIds: [targetStudentId] });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvedCount).toBe(1);
      
      const student = await prisma.user.findUnique({ where: { id: targetStudentId } });
      expect(student?.isApproved).toBe(true);
    });

    it("fails tenant check safely if attempting to approve another college's student", async () => {
      const res = await request(app)
        .post("/api/admin/students/bulk-approve")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ userIds: [otherStudentId] }); // Student belongs to otherCollegeProfileId
      
      expect(res.status).toBe(200);
      // It returns success but 0 approved, returning the ID in failedIds
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvedCount).toBe(0);
      expect(res.body.data.failedIds).toContain(otherStudentId);
    });
  });
});
