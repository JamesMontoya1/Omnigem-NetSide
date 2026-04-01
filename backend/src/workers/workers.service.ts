import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.worker.findMany({ orderBy: { name: 'asc' }, include: { position: true } });
  }

  get(id: number) {
    return this.prisma.worker.findUnique({ where: { id }, include: { position: true } });
  }

  create(data: { name: string; color?: string; hireDate?: string; terminationDate?: string; doesShifts?: boolean; doesTravel?: boolean; positionId?: number | null }) {
    return this.prisma.worker.create({
      data: {
        name: data.name,
        color: data.color,
        dontVacation: (data as any).dontVacation ?? false,
        positionId: data.positionId ?? undefined,
        doesShifts: data.doesShifts ?? false,
        doesTravel: data.doesTravel ?? false,
        active: data.terminationDate ? false : true,
        hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
        terminationDate: data.terminationDate ? new Date(data.terminationDate) : undefined,
      },
    });
  }

  update(id: number, data: { name?: string; color?: string; active?: boolean; hireDate?: string; terminationDate?: string; doesShifts?: boolean; doesTravel?: boolean; positionId?: number | null }) {
    const active = data.terminationDate !== undefined
      ? (data.terminationDate ? false : (data.active ?? undefined))
      : data.active;
    return this.prisma.worker.update({
      where: { id },
      data: {
        ...data,
        positionId: data.positionId !== undefined ? (data.positionId ?? null) : undefined,
        doesShifts: data.doesShifts,
        doesTravel: data.doesTravel,
        active,
        hireDate: data.hireDate !== undefined ? (data.hireDate ? new Date(data.hireDate) : null) : undefined,
        terminationDate: data.terminationDate !== undefined ? (data.terminationDate ? new Date(data.terminationDate) : null) : undefined,
      },
    });
  }

  async remove(id: number, removeAssignments = false) {
    const refs = await this.prisma.recurringPattern.count({ where: { workerId: id } });
    if (refs > 0 && !removeAssignments) {
      throw new BadRequestException('Não é possível apagar: existem padrões recorrentes referenciando este trabalhador. Remova ou reatribua-os primeiro.');
    }

    if (removeAssignments) {
      return this.prisma.$transaction(async (tx) => {
        await tx.assignment.deleteMany({ where: { workerId: id } });
        await tx.recurringPattern.deleteMany({ where: { workerId: id } });
        return tx.worker.delete({ where: { id } });
      });
    }

    return this.prisma.worker.delete({ where: { id } });
  }
}
