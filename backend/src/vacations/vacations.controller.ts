import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { VacationsService } from './vacations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

class CreateVacationDto {
  workerId: number;
  startDate: string;
  endDate: string;
  daysUsed: number;
  sold?: boolean;
  active?: boolean;
  note?: string;
}

class UpdateVacationDto {
  startDate?: string;
  endDate?: string;
  daysUsed?: number;
  sold?: boolean;
  active?: boolean;
  note?: string;
}

@Controller('vacations')
export class VacationsController {
  constructor(private svc: VacationsService) {}

  @Get()
  list(@Query('workerId') workerId?: string) {
    return this.svc.list(workerId ? parseInt(workerId, 10) : undefined);
  }

  @Get('summary')
  summary() {
    return this.svc.summary();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() body: CreateVacationDto) {
    return this.svc.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateVacationDto) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
