import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

class CreateHolidayDto {
  date: string;
  name?: string;
  recurring?: boolean;
}

class UpdateHolidayDto {
  date?: string;
  name?: string;
  recurring?: boolean;
}

@Controller('holidays')
export class HolidaysController {
  constructor(private svc: HolidaysService) {}

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
  @Roles('holidays.edit')
  create(@Body() body: CreateHolidayDto) {
    return this.svc.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('holidays.edit')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateHolidayDto) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('holidays.edit')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
