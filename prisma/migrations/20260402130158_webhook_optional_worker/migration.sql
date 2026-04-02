-- DropForeignKey
ALTER TABLE "public"."TimePunch" DROP CONSTRAINT "TimePunch_workerId_fkey";

-- AlterTable
ALTER TABLE "TimePunch" ALTER COLUMN "workerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "TimePunch" ADD CONSTRAINT "TimePunch_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
