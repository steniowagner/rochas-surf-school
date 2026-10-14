-- CreateEnum
CREATE TYPE "class_discipline" AS ENUM ('surf', 'skate');

-- CreateEnum
CREATE TYPE "class_level" AS ENUM ('beginner', 'advanced', 'expert');

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "discipline" "class_discipline" NOT NULL,
    "level" "class_level" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "location_id" UUID NOT NULL,
    "capacity" INTEGER NOT NULL,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_instructors" (
    "class_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "class_instructors_pkey" PRIMARY KEY ("class_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_key_key" ON "locations"("name_key");

-- CreateIndex
CREATE INDEX "classes_starts_at_idx" ON "classes"("starts_at");

-- CreateIndex
CREATE INDEX "classes_location_id_idx" ON "classes"("location_id");

-- CreateIndex
CREATE INDEX "class_instructors_user_id_idx" ON "class_instructors"("user_id");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_instructors" ADD CONSTRAINT "class_instructors_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_instructors" ADD CONSTRAINT "class_instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
