-- CreateEnum
CREATE TYPE "enrolment_status" AS ENUM ('pending', 'approved', 'denied', 'withdrawn', 'expired', 'cancelled', 'takenOut', 'classCancelled');

-- CreateTable
CREATE TABLE "enrolments" (
    "id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "enrolment_status" NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "rule_accepted_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "reason" TEXT,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrolments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enrolments_class_id_status_idx" ON "enrolments"("class_id", "status");

-- CreateIndex
CREATE INDEX "enrolments_student_id_idx" ON "enrolments"("student_id");

-- AddForeignKey
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A student has at most one open (pending or approved) enrolment per class; ended ones stay as history.
CREATE UNIQUE INDEX "enrolments_one_open_per_student_class" ON "enrolments"("class_id", "student_id") WHERE "status" IN ('pending', 'approved');
