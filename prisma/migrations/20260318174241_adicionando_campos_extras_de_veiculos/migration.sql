-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "lastAlignment" TIMESTAMP(3),
ADD COLUMN     "lastMaintenance" TIMESTAMP(3),
ADD COLUMN     "nextOilChange" DECIMAL(65,30),
ADD COLUMN     "odometer" DECIMAL(65,30),
ADD COLUMN     "odometerAtLastAlignment" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "lastAlignment" TIMESTAMP(3),
ADD COLUMN     "lastMaintenance" TIMESTAMP(3),
ADD COLUMN     "nextOilChange" DECIMAL(65,30),
ADD COLUMN     "odometer" DECIMAL(65,30),
ADD COLUMN     "odometerAtLastAlignment" DECIMAL(65,30);
