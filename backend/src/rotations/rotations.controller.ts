import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RotationsService } from './rotations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

class CreateRotationDto {
  name?: string;
  weekdays: number[];
  workerIds: number[];
  startDate: string;
  endDate?: string;
  notifyUpcoming?: boolean;
}

class UpdateRotationDto {
  name?: string | null;
  weekdays?: number[];
  workerIds?: number[];
  startDate?: string;
  endDate?: string | null;
  notifyUpcoming?: boolean;
}

@Controller('rotations')
export class RotationsController {
  constructor(private svc: RotationsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Get('calendar')
  calendar(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const inc = includeInactive === 'true';
    return this.svc.calendar(startDate, endDate, inc);
  }

  @Get('report')
  report(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('weekdays') weekdays?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const wd = weekdays
      ? weekdays.split(',').map((n) => parseInt(n, 10))
      : undefined;
    const inc = includeInactive === 'true';
    return this.svc.report(startDate, endDate, wd, inc);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shifts.edit')
  create(@Body() body: CreateRotationDto) {
    return this.svc.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shifts.edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRotationDto,
  ) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shifts.edit')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
