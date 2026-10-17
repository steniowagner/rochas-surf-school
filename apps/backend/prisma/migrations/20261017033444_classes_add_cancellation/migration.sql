-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "cancellation_message" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3);
