-- CreateTable
CREATE TABLE "class_messages" (
    "id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_messages_class_id_created_at_idx" ON "class_messages"("class_id", "created_at");

-- AddForeignKey
ALTER TABLE "class_messages" ADD CONSTRAINT "class_messages_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_messages" ADD CONSTRAINT "class_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

