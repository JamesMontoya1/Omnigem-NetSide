import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class PositionsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.position.findMany({ orderBy: { name: 'asc' } })
  }

  get(id: number) {
    return this.prisma.position.findUnique({ where: { id } })
  }

  create(data: { name: string; discription?: string }) {
    return this.prisma.position.create({ data })
  }

  update(id: number, data: { name?: string; discription?: string }) {
    return this.prisma.position.update({ where: { id }, data })
  }

  async remove(id: number) {
    const refs = await this.prisma.worker.count({ where: { positionId: id } })
    if (refs > 0) {
      throw new BadRequestException('Não é possível apagar: existem trabalhadores vinculados a este cargo. Remova ou reatribua-os primeiro.')
    }
    return this.prisma.position.delete({ where: { id } })
  }
}
