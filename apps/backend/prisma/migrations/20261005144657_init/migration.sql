-- CreateTable
CREATE TABLE "PrismaBootstrap" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrismaBootstrap_pkey" PRIMARY KEY ("id")
);
