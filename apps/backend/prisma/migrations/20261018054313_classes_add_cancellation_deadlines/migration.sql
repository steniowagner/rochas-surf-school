-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "cancellation_deadline" TIMESTAMP(3),
ADD COLUMN     "deadline_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deadline_next_attempt_at" TIMESTAMP(3),
ADD COLUMN     "deadline_revision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "cancellation_rules" (
    "discipline" "class_discipline" NOT NULL,
    "text" TEXT NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellation_rules_pkey" PRIMARY KEY ("discipline")
);

-- CreateIndex
CREATE INDEX "classes_cancellation_deadline_starts_at_deadline_next_attem_idx" ON "classes"("cancellation_deadline", "starts_at", "deadline_next_attempt_at");

-- AddForeignKey
ALTER TABLE "cancellation_rules" ADD CONSTRAINT "cancellation_rules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
