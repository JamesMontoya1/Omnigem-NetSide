-- CreateEnum
CREATE TYPE "TimePunchType" AS ENUM ('IN', 'OUT', 'BREAK_START', 'BREAK_END');

-- CreateEnum
CREATE TYPE "TimePunchSource" AS ENUM ('MANUAL', 'IMPORT_CSV', 'PONTOSIMPLES');

-- CreateTable
CREATE TABLE "TimePunch" (
    "id" SERIAL NOT NULL,
    "workerId" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" "TimePunchType" NOT NULL,
    "source" "TimePunchSource" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimePunch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimePunch_workerId_occurredAt_idx" ON "TimePunch"("workerId", "occurredAt");

-- CreateIndex
CREATE INDEX "TimePunch_source_externalId_idx" ON "TimePunch"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "TimePunch_source_externalId_key" ON "TimePunch"("source", "externalId");

-- AddForeignKey
ALTER TABLE "TimePunch" ADD CONSTRAINT "TimePunch_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
