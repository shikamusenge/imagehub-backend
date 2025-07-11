-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('football', 'vollyball', 'basketbal', 'tenis', 'other');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "eventType" "EventType" NOT NULL DEFAULT 'football';
