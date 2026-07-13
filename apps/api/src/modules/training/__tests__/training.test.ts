import request from "supertest";
import { app } from "../../../app";
import { prisma } from "../../../lib/prisma";
import { UserRole, SubRole, CourseLevel, CourseMode } from "@campushire/types";
import { generateAccessToken } from "../../../lib/jwt";

describe("Training Routes Integration", () => {
  jest.setTimeout(30000);
  let ownerToken: string;
  let coordinatorToken: string;
  let collegeProfileId: string;
  let otherCollegeProfileId: string;
  let targetStudentId: string;
  let otherStudentId: string;
  let testCourseId: string;
  let partnerToken: string;
  let otherPartnerToken: string;
  let studentToken: string;
  
  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Test Tenant",
        slug: "test-tenant-training-" + Date.now(),
      }
    });

    const owner = await prisma.user.create({
      data: {
        email: `training_owner_${Date.now()}@test.com`,
        tin: `tin_training_owner_${Date.now()}`,
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
        email: `training_coord_${Date.now()}@test.com`,
        tin: `tin_training_coord_${Date.now()}`,
        firstName: "Coord",
        lastName: "Test",
        role: UserRole.COLLEGE_ADMIN,
        subRole: SubRole.MANAGER,
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
        slug: "test-college-training-" + Date.now(),
      }
    });
    collegeProfileId = college.id;

    const otherCollege = await prisma.collegeProfile.create({
        data: {
            tenantId: tenant.id,
            adminUserId: coordinator.id,
            name: "Other College",
            slug: "other-college-training-" + Date.now()
        }
    });
    otherCollegeProfileId = otherCollege.id;

    const studentUser = await prisma.user.create({
        data: {
            email: `training_student_${Date.now()}@test.com`,
            tin: `tin_training_student_${Date.now()}`,
            firstName: "Student",
            lastName: "Test",
            role: UserRole.STUDENT,
            tenantId: tenant.id
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
            email: `training_other_student_${Date.now()}@test.com`,
            tin: `tin_training_other_student_${Date.now()}`,
            firstName: "Other",
            lastName: "Test",
            role: UserRole.STUDENT,
            tenantId: tenant.id
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

    // Create a training partner and course
    const trainingPartner = await prisma.user.create({
      data: {
        email: `training_partner_${Date.now()}@test.com`,
        tin: `tin_tp_${Date.now()}`,
        firstName: "Partner",
        lastName: "Test",
        role: UserRole.TRAINING_PARTNER,
        tenantId: tenant.id,
        isActive: true,
        isApproved: true,
      }
    });

    const tpProfile = await prisma.trainingPartnerProfile.create({
      data: {
        userId: trainingPartner.id,
        tenantId: tenant.id,
        organizationName: "Test Partner",
      }
    });

    const course = await prisma.course.create({
      data: {
        tenantId: tenant.id,
        trainingPartnerProfileId: tpProfile.id,
        createdByUserId: trainingPartner.id,
        title: "Test Course",
        slug: "test-course-" + Date.now(),
        description: "Test Course Description",
        level: CourseLevel.BEGINNER,
        mode: CourseMode.ONLINE,
        price: 0,
      }
    });
    testCourseId = course.id;

    // Create another training partner
    const otherPartner = await prisma.user.create({
      data: {
        email: `other_partner_${Date.now()}@test.com`,
        tin: `tin_other_tp_${Date.now()}`,
        firstName: "Other",
        lastName: "Partner",
        role: UserRole.TRAINING_PARTNER,
        tenantId: tenant.id,
        isActive: true,
        isApproved: true,
      }
    });

    await prisma.trainingPartnerProfile.create({
      data: {
        userId: otherPartner.id,
        tenantId: tenant.id,
        organizationName: "Other Partner",
      }
    });

    ownerToken = generateAccessToken({
      userId: owner.id,
      tenantId: tenant.id,
      role: owner.role,
      subRole: owner.subRole || undefined,
      tin: owner.tin
    });

    coordinatorToken = generateAccessToken({
      userId: coordinator.id,
      tenantId: tenant.id,
      role: coordinator.role,
      subRole: coordinator.subRole || undefined,
      tin: coordinator.tin
    });

    partnerToken = generateAccessToken({
      userId: trainingPartner.id,
      tenantId: tenant.id,
      role: trainingPartner.role,
      tin: trainingPartner.tin
    });

    otherPartnerToken = generateAccessToken({
      userId: otherPartner.id,
      tenantId: tenant.id,
      role: otherPartner.role,
      tin: otherPartner.tin
    });

    studentToken = generateAccessToken({
      userId: studentUser.id,
      tenantId: tenant.id,
      role: studentUser.role,
      tin: studentUser.tin
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /api/courses/:courseId/completion", () => {
    it("allows MANAGER (Coordinator) to access completion stats", async () => {
      const res = await request(app)
        .get(`/api/courses/${testCourseId}/completion`)
        .set("Authorization", `Bearer ${coordinatorToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("totalEnrollments");
    });

    it("allows OWNER to access completion stats", async () => {
      const res = await request(app)
        .get(`/api/courses/${testCourseId}/completion`)
        .set("Authorization", `Bearer ${ownerToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("totalEnrollments");
    });

    it("allows TRAINING_PARTNER to access stats for their own course", async () => {
      const res = await request(app)
        .get(`/api/courses/${testCourseId}/completion`)
        .set("Authorization", `Bearer ${partnerToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("denies TRAINING_PARTNER access to stats for someone else's course", async () => {
      const res = await request(app)
        .get(`/api/courses/${testCourseId}/completion`)
        .set("Authorization", `Bearer ${otherPartnerToken}`);
      
      expect(res.status).toBe(403);
    });

    it("denies STUDENT access to completion stats", async () => {
      const res = await request(app)
        .get(`/api/courses/${testCourseId}/completion`)
        .set("Authorization", `Bearer ${studentToken}`);
      
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/courses/:courseId/assign", () => {
    it("denies access to MANAGER (Coordinator)", async () => {
      const res = await request(app)
        .post(`/api/courses/${testCourseId}/assign`)
        .set("Authorization", `Bearer ${coordinatorToken}`)
        .send({ userIds: [targetStudentId] });
      
      expect(res.status).toBe(403);
    });

    it("allows access to OWNER and assigns their own student", async () => {
      const res = await request(app)
        .post(`/api/courses/${testCourseId}/assign`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ userIds: [targetStudentId] });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enrolledCount).toBe(1);
    });

    it("fails tenant check safely if attempting to assign another college's student", async () => {
      const res = await request(app)
        .post(`/api/courses/${testCourseId}/assign`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ userIds: [otherStudentId] });
      
      expect(res.status).toBe(200);
      // It returns success but 0 enrolled, returning the ID in failedIds
      expect(res.body.data.enrolledCount).toBe(0);
      expect(res.body.data.failedIds).toContain(otherStudentId);
    });
  });
});
