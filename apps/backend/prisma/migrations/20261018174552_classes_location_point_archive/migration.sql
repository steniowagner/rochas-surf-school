-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ALTER COLUMN "name_key" DROP NOT NULL;
