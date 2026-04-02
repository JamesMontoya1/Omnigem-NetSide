import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { VehicleExpenseCategoriesService } from './vehicle-expense-categories.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

class CreateCategoryDto {
  name!: string
  description?: string
}

class UpdateCategoryDto {
  name?: string
  description?: string
}

@Controller('vehicle-expense-categories')
export class VehicleExpenseCategoriesController {
  constructor(private svc: VehicleExpenseCategoriesService) {}

  @Get()
  list() { return this.svc.list() }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) { return this.svc.get(id) }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vehicles.edit')
  @Post()
  create(@Body() body: CreateCategoryDto) { return this.svc.create(body) }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vehicles.edit')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCategoryDto) { return this.svc.update(id, body) }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('vehicles.edit')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id) }
}
