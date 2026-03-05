import { Module } from '@nestjs/common';
import { VacationsService } from './vacations.service';
import { VacationsController } from './vacations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VacationsService],
  controllers: [VacationsController],
  exports: [VacationsService],
})
export class VacationsModule {}
