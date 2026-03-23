import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';



class CreateWorkerDto {
  name: string;
  color?: string;
  hireDate?: string;
  terminationDate?: string;
  doesShifts?: boolean;
  doesTravel?: boolean;
  dontVacation?: boolean;
  positionId?: number | null;
}


class UpdateWorkerDto {
  name?: string;
  color?: string;
  active?: boolean;
  hireDate?: string;
  terminationDate?: string;
  doesShifts?: boolean;
  doesTravel?: boolean;
  dontVacation?: boolean;
  positionId?: number | null;
}

@Controller('workers')
export class WorkersController {
  constructor(private svc: WorkersService) {}

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
  @Roles('ADMIN')
  create(@Body() body: CreateWorkerDto) {
    return this.svc.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateWorkerDto) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number, @Query('removeAssignments') removeAssignments?: string) {
    const flag = removeAssignments === '1' || removeAssignments === 'true' || removeAssignments === 'yes'
    return this.svc.remove(id, flag);
  }
}
