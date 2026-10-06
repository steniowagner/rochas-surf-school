/*
  Warnings:

  - You are about to drop the `PrismaBootstrap` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('student', 'instructor', 'admin');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('pending', 'approved', 'denied', 'deleted', 'removed');

-- CreateEnum
CREATE TYPE "user_reactivation_status" AS ENUM ('requested', 'denied');

-- CreateEnum
CREATE TYPE "identity_provider" AS ENUM ('google', 'apple', 'email');

-- DropTable
DROP TABLE "PrismaBootstrap";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "photo_url" TEXT,
    "whatsapp_number" TEXT,
    "whatsapp_visible" BOOLEAN NOT NULL DEFAULT false,
    "role" "user_role" NOT NULL DEFAULT 'student',
    "status" "user_status" NOT NULL DEFAULT 'pending',
    "denial_reason" TEXT,
    "denied_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    "reactivation_status" "user_reactivation_status",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_rules_acceptances" (
    "user_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_rules_acceptances_pkey" PRIMARY KEY ("user_id","version")
);

-- CreateTable
CREATE TABLE "identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "identity_provider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "identities_user_id_idx" ON "identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "identities_provider_provider_user_id_key" ON "identities"("provider", "provider_user_id");

-- AddForeignKey
ALTER TABLE "user_rules_acceptances" ADD CONSTRAINT "user_rules_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
