import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { VehiclesService } from './vehicles.service'
import { VehiclesController } from './vehicles.controller'

@Module({
  imports: [PrismaModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
