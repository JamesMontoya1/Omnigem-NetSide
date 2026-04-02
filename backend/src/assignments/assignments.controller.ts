import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

class CreateAssignmentDto {
  date: string;
  workerId?: number;
  note?: string;
}

class GenerateDto {
  startDate: string;
  endDate: string;
}

@Controller('assignments')
export class AssignmentsController {
  constructor(private svc: AssignmentsService) {}

  @Get()
  list(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.svc.list({ startDate, endDate });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shifts.edit')
  create(@Body() body: CreateAssignmentDto) {
    return this.svc.createManual(body);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shifts.edit')
  generate(@Body() body: GenerateDto) {
    return this.svc.generate(body.startDate, body.endDate);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shifts.edit')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
