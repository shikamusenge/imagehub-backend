-- AlterTable
ALTER TABLE "EventImage" ADD COLUMN     "originalId" INTEGER;

-- AddForeignKey
ALTER TABLE "EventImage" ADD CONSTRAINT "EventImage_originalId_fkey" FOREIGN KEY ("originalId") REFERENCES "EventImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
