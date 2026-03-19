import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(key: string) {
    const s = await this.prisma.appSetting.findUnique({ where: { key } })
    return s ? s.value : null
  }

  async set(key: string, value: string) {
    const existing = await this.prisma.appSetting.findUnique({ where: { key } })
    if (existing) return this.prisma.appSetting.update({ where: { key }, data: { value } })
    return this.prisma.appSetting.create({ data: { key, value } })
  }

  async getDefaultMealExpense(): Promise<number> {
    const v = await this.get('defaultMealExpense')
    if (v == null) return 70
    const n = Number(v)
    return isNaN(n) ? 70 : n
  }
  async getDefaultMaintenanceInterval(): Promise<number> {
    const v = await this.get('defaultMaintenanceIntervalDays')
    if (v == null) return 60
    const n = Number(v)
    return isNaN(n) ? 60 : n
  }

  async getDefaultAlignmentInterval(): Promise<number> {
    const v = await this.get('defaultAlignmentIntervalDays')
    if (v == null) return 60
    const n = Number(v)
    return isNaN(n) ? 60 : n
  }
}
