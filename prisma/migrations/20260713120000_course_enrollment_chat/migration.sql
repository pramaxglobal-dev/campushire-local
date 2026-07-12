ALTER TYPE "ChatContextType" ADD VALUE IF NOT EXISTS 'COURSE_ENROLLMENT';

ALTER TABLE "chat_threads" ADD COLUMN "course_enrollment_id" TEXT;

CREATE INDEX "chat_threads_course_enrollment_id_idx" ON "chat_threads"("course_enrollment_id");

ALTER TABLE "chat_threads"
ADD CONSTRAINT "chat_threads_course_enrollment_id_fkey"
FOREIGN KEY ("course_enrollment_id") REFERENCES "course_enrollments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
