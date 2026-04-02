import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

class UpdateMealDto { value!: number }
class UpdateIntervalDto { value!: number }

@Controller('settings')
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get('mealExpense')
  async getMeal() {
    const value = await this.service.getDefaultMealExpense()
    return { value }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('settings.edit')
  @Put('mealExpense')
  async setMeal(@Body() body: UpdateMealDto) {
    await this.service.set('defaultMealExpense', String(body.value))
    return { value: body.value }
  }


  @Get('maintenanceInterval')
  async getMaintenanceInterval() {
    const value = await this.service.getDefaultMaintenanceInterval()
    return { value }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('settings.edit')
  @Put('maintenanceInterval')
  async setMaintenanceInterval(@Body() body: UpdateIntervalDto) {
    await this.service.set('defaultMaintenanceIntervalDays', String(body.value))
    return { value: body.value }
  }

  @Get('alignmentInterval')
  async getAlignmentInterval() {
    const value = await this.service.getDefaultAlignmentInterval()
    return { value }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('settings.edit')
  @Put('alignmentInterval')
  async setAlignmentInterval(@Body() body: UpdateIntervalDto) {
    await this.service.set('defaultAlignmentIntervalDays', String(body.value))
    return { value: body.value }
  }
}
