-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_instructor" BOOLEAN NOT NULL DEFAULT false;

-- Every admin could be assigned to teach until now (spec 058): they keep that when the flag is introduced.
UPDATE "users" SET "is_instructor" = true WHERE "role" = 'admin';
