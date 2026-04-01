import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { TimePunchSource, TimePunchType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TimePunchesService } from './time-punches.service';

class CreateTimePunchDto {
  workerId: number;
  occurredAt: string; // ISO
  type: TimePunchType;
}

class UpdateTimePunchDto {
  occurredAt?: string;
  type?: TimePunchType;
}

class ImportTimePunchDto {
  workerId: number;
  occurredAt: string; // ISO
  type: TimePunchType;
  externalId?: string | null;
  raw?: any;
}

class ImportTimePunchesBodyDto {
  source: TimePunchSource;
  punches: ImportTimePunchDto[];
}

@Controller('time-punches')
export class TimePunchesController {
  constructor(private svc: TimePunchesService) {}

  @Get()
  list(
    @Query('workerId') workerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.list({
      workerId: workerId ? Number(workerId) : undefined,
      from,
      to,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() body: CreateTimePunchDto) {
    return this.svc.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateTimePunchDto) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  importMany(@Body() body: ImportTimePunchesBodyDto) {
    return this.svc.importMany(body);
  }

  /** Sincroniza batidas do provider externo (PontoSimples quando disponível). */
  @Post('sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  sync(
    @Query('workerId') workerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.syncFromProvider({
      workerId: workerId ? Number(workerId) : undefined,
      from,
      to,
    });
  }
}

