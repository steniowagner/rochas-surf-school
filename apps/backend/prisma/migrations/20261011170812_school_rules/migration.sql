-- CreateTable
CREATE TABLE "rules" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules_versions" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rules_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rules_index_idx" ON "rules"("index");

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The single row that holds the current version of the rules (0: no change ever made).
INSERT INTO "rules_versions" ("id", "version", "created_at", "updated_at")
VALUES (gen_random_uuid(), 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
