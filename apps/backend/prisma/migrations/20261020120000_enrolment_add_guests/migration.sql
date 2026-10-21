-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "name" TEXT,
    "whatsapp_number" TEXT,
    "created_by" UUID,
    "erased_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guests_class_id_idx" ON "guests"("class_id");

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
