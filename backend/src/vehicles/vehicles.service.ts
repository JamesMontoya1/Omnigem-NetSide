import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.vehicle.findMany({ orderBy: { model: 'asc' } })
  }

  get(id: number) {
    return this.prisma.vehicle.findUnique({ where: { id } })
  }

  create(data: { plate?: string; model?: string; notes?: string }) {
    return this.prisma.vehicle.create({ data })
  }

  update(id: number, data: { plate?: string; model?: string; notes?: string }) {
    return this.prisma.vehicle.update({ where: { id }, data })
  }

  async remove(id: number) {
    return this.prisma.vehicle.delete({ where: { id } })
  }
}
