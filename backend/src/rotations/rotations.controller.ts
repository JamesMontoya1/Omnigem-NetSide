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
} from '@nestjs/common';
import { RotationsService } from './rotations.service';

class CreateRotationDto {
  name?: string;
  weekdays: number[];
  workerIds: number[];
  startDate: string;
  notifyUpcoming?: boolean;
}

class UpdateRotationDto {
  name?: string | null;
  weekdays?: number[];
  workerIds?: number[];
  startDate?: string;
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
  ) {
    return this.svc.calendar(startDate, endDate);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Post()
  create(@Body() body: CreateRotationDto) {
    return this.svc.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRotationDto,
  ) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
