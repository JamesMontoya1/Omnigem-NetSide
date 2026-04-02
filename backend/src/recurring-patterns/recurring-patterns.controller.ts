import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { RecurringPatternsService } from './recurring-patterns.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

class CreateRecurringPatternDto {
  workerId: number;
  weekdays: number[];
  weekInterval?: number;
  weekOffset?: number;
  startDate?: string;
  endDate?: string;
  note?: string;
}

class UpdateRecurringPatternDto {
  workerId?: number;
  weekdays?: number[];
  weekInterval?: number | null;
  weekOffset?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  note?: string | null;
}

@Controller('recurring-patterns')
export class RecurringPatternsController {
  constructor(private svc: RecurringPatternsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shifts.edit')
  create(@Body() body: CreateRecurringPatternDto) {
    return this.svc.create(body as any);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shifts.edit')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateRecurringPatternDto) {
    return this.svc.update(id, body as any);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shifts.edit')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
