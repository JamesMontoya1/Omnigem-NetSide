import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { ServiceTypesService } from './service-types.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

class CreateServiceTypeDto {
  name!: string
  code?: string
  description?: string
}

class UpdateServiceTypeDto {
  name?: string
  code?: string
  description?: string
}

@Controller('service-types')
export class ServiceTypesController {
  constructor(private service: ServiceTypesService) {}

  @Get()
  list() {
    return this.service.list()
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trips.edit')
  @Post()
  create(@Body() body: CreateServiceTypeDto) {
    return this.service.create(body)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trips.edit')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateServiceTypeDto) {
    return this.service.update(id, body)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trips.edit')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
