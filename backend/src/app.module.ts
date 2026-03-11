import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { WorkersModule } from './workers/workers.module';
import { HolidaysModule } from './holidays/holidays.module';
import { RecurringPatternsModule } from './recurring-patterns/recurring-patterns.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { RotationsModule } from './rotations/rotations.module';
import { VacationsModule } from './vacations/vacations.module';
import { TripsModule } from './trips/trips.module';
import { CitiesModule } from './cities/cities.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { AppController } from './app.controller';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, WorkersModule, HolidaysModule, RecurringPatternsModule, AssignmentsModule, RotationsModule, VacationsModule, TripsModule, CitiesModule, VehiclesModule],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
