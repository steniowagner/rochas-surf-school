-- AlterEnum
ALTER TYPE "user_status" ADD VALUE 'erased';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "erased_at" TIMESTAMP(3),
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;
