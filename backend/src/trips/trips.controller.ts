import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common'
import { TripsService } from './trips.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

class CreateTripDto {
  cityId!: number
  vehicleId?: number
  date!: string
  client?: string
  installationTraining?: number
  mealExpense?: number
  fuelExpense?: number
  extraExpense?: number
  notesExtraExpense?: string
  kmDriven?: number
  costPerKm?: number
  profitPerKm?: number
  avgConsumption?: number
  remainingAutonomy?: number
  travelerIds?: number[]
  driverId?: number
  note?: string
}

class UpdateTripDto {
  cityId?: number
  vehicleId?: number
  date?: string
  client?: string
  installationTraining?: number
  mealExpense?: number
  fuelExpense?: number
  extraExpense?: number
  notesExtraExpense?: string
  kmDriven?: number
  costPerKm?: number
  profitPerKm?: number
  avgConsumption?: number
  remainingAutonomy?: number
  travelerIds?: number[]
  driverId?: number
  note?: string
}

@Controller('trips')
export class TripsController {
  constructor(private service: TripsService) {}

  @Get()
  list(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.list({ startDate, endDate })
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() body: CreateTripDto) {
    return this.service.create(body)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateTripDto) {
    return this.service.update(id, body)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
