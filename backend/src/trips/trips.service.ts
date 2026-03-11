import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  async list(filter?: { startDate?: string; endDate?: string }) {
    const where: any = {}
    if (filter?.startDate || filter?.endDate) {
      where.date = {}
      if (filter.startDate) where.date.gte = new Date(filter.startDate)
      if (filter.endDate) where.date.lte = new Date(filter.endDate)
    }
    return this.prisma.trip.findMany({
      where,
      include: { city: true, vehicle: true, travelers: true, driver: true },
      orderBy: { date: 'desc' },
    } as any)
  }

  async get(id: number) {
    return this.prisma.trip.findUnique({ where: { id }, include: { city: true, vehicle: true, travelers: true, driver: true } } as any)
  }

  async create(data: any) {
    const payload: any = { ...data }
    if (payload.date) payload.date = new Date(payload.date)
    if (payload.travelerIds) {
      payload.travelers = { connect: payload.travelerIds.map((id: number) => ({ id })) }
      delete payload.travelerIds
    }
    return this.prisma.trip.create({ data: payload, include: { city: true, vehicle: true, travelers: true, driver: true } } as any)
  }

  async update(id: number, data: any) {
    const payload: any = { ...data }
    if (payload.date) payload.date = new Date(payload.date)
    if (payload.travelerIds) {
      payload.travelers = { set: payload.travelerIds.map((id: number) => ({ id })) }
      delete payload.travelerIds
    }
    return this.prisma.trip.update({ where: { id }, data: payload, include: { city: true, vehicle: true, travelers: true, driver: true } } as any)
  }

  async remove(id: number) {
    return this.prisma.trip.delete({ where: { id } })
  }
}
