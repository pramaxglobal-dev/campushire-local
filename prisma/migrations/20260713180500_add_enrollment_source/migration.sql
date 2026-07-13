-- CreateEnum
CREATE TYPE "EnrollmentSource" AS ENUM ('SELF_ENROLLED', 'ADMIN_ASSIGNED');

-- AlterTable
ALTER TABLE "CourseEnrollment" ADD COLUMN "source" "EnrollmentSource" NOT NULL DEFAULT 'SELF_ENROLLED',
ADD COLUMN "assigned_by_user_id" TEXT;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
