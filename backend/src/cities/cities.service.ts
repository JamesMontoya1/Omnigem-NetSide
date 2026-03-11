import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.city.findMany({ orderBy: { name: 'asc' } })
  }

  get(id: number) {
    return this.prisma.city.findUnique({ where: { id } })
  }

  create(data: { name: string; state?: string; country?: string }) {
    return this.prisma.city.create({ data })
  }

  update(id: number, data: { name?: string; state?: string; country?: string }) {
    return this.prisma.city.update({ where: { id }, data })
  }

  async remove(id: number) {
    return this.prisma.city.delete({ where: { id } })
  }
}
