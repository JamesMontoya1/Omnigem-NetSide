import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common'
import { VehicleExpensesService } from './vehicle-expenses.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

@Controller('vehicle-expenses')
export class VehicleExpensesController {
  constructor(private svc: VehicleExpensesService) {}

  @Get()
  list(@Query('vehicleId') vehicleId?: string) {
    const vid = vehicleId ? Number(vehicleId) : undefined
    return this.svc.list(vid)
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vehicles.edit')
  @Post()
  create(@Body() body: any) {
    return this.svc.create(body)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vehicles.edit')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.svc.update(id, body)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vehicles.edit')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id)
  }
}
