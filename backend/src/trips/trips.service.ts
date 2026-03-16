import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService, private settings: SettingsService) {}

  async list(filter?: { startDate?: string; endDate?: string }) {
    const where: any = {}
    if (filter?.startDate || filter?.endDate) {
      where.date = {}
      if (filter.startDate) where.date.gte = new Date(filter.startDate)
      if (filter.endDate) where.date.lte = new Date(filter.endDate)
    }
    return this.prisma.trip.findMany({
      where,
      include: { city: true, vehicle: true, travelers: true, drivers: true, serviceType: true },
      orderBy: { date: 'desc' },
    } as any)
  }

  async get(id: number) {
    return this.prisma.trip.findUnique({ where: { id }, include: { city: true, vehicle: true, travelers: true, drivers: true, serviceType: true } } as any)
  }

  async create(data: any) {
    const payload: any = { ...data }
    if (payload.date) payload.date = new Date(payload.date)
    if (payload.endDate) payload.endDate = new Date(payload.endDate)
    // apply default mealExpense from settings when not provided
    if (payload.mealExpense == null) {
      const def = await this.settings.getDefaultMealExpense()
      payload.mealExpense = def
    }
    // support new clients array (name/price/info) and convert to parallel arrays for Prisma
    if (payload.clients && Array.isArray(payload.clients)) {
      payload.client = payload.clients.map((c: any) => c.name ?? '')
      payload.price = payload.clients.map((c: any) => c.price != null ? c.price : 0)
      payload.informationPrice = payload.clients.map((c: any) => c.info ?? '')
      delete payload.clients
    }
    if (payload.travelerIds) {
      payload.travelers = { connect: payload.travelerIds.map((id: number) => ({ id })) }
      delete payload.travelerIds
    }
    if (payload.driverIds) {
      payload.drivers = { connect: payload.driverIds.map((id: number) => ({ id })) }
      delete payload.driverIds
    }
    return this.prisma.trip.create({ data: payload, include: { city: true, vehicle: true, travelers: true, drivers: true, serviceType: true } } as any)
  }

  async update(id: number, data: any) {
    const payload: any = { ...data }
    if (payload.date) payload.date = new Date(payload.date)
    if (payload.endDate) payload.endDate = new Date(payload.endDate)
    // support clients array on update
    if (payload.clients && Array.isArray(payload.clients)) {
      payload.client = payload.clients.map((c: any) => c.name ?? '')
      payload.price = payload.clients.map((c: any) => c.price != null ? c.price : 0)
      payload.informationPrice = payload.clients.map((c: any) => c.info ?? '')
      delete payload.clients
    }
    if (payload.travelerIds) {
      payload.travelers = { set: payload.travelerIds.map((id: number) => ({ id })) }
      delete payload.travelerIds
    }
    if (payload.driverIds) {
      payload.drivers = { set: payload.driverIds.map((id: number) => ({ id })) }
      delete payload.driverIds
    }
    return this.prisma.trip.update({ where: { id }, data: payload, include: { city: true, vehicle: true, travelers: true, drivers: true, serviceType: true } } as any)
  }

  async complete(id: number) {
    return this.prisma.trip.update({
      where: { id },
      data: { completed: true, endDate: new Date() },
      include: { city: true, vehicle: true, travelers: true, drivers: true, serviceType: true },
    } as any)
  }

  async remove(id: number) {
    return this.prisma.trip.delete({ where: { id } })
  }
}
