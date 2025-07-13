/*
  Warnings:

  - The values [vollyball,basketbal] on the enum `EventType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EventType_new" AS ENUM ('football', 'volleyball', 'basketball', 'tenis', 'concert', 'festival', 'conference', 'workshop', 'other');
ALTER TABLE "Event" ALTER COLUMN "eventType" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "eventType" TYPE "EventType_new" USING ("eventType"::text::"EventType_new");
ALTER TYPE "EventType" RENAME TO "EventType_old";
ALTER TYPE "EventType_new" RENAME TO "EventType";
DROP TYPE "EventType_old";
ALTER TABLE "Event" ALTER COLUMN "eventType" SET DEFAULT 'football';
COMMIT;
