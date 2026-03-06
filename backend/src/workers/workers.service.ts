import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.worker.findMany({ orderBy: { name: 'asc' } });
  }

  get(id: number) {
    return this.prisma.worker.findUnique({ where: { id } });
  }

  create(data: { name: string; email?: string; color?: string; hireDate?: string; terminationDate?: string }) {
    return this.prisma.worker.create({
      data: {
        name: data.name,
        email: data.email,
        color: data.color,
        active: data.terminationDate ? false : undefined,
        hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
        terminationDate: data.terminationDate ? new Date(data.terminationDate) : undefined,
      },
    });
  }

  update(id: number, data: { name?: string; email?: string; color?: string; active?: boolean; hireDate?: string; terminationDate?: string }) {
    const active = data.terminationDate !== undefined
      ? (data.terminationDate ? false : (data.active ?? undefined))
      : data.active;
    return this.prisma.worker.update({
      where: { id },
      data: {
        ...data,
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
      // delete assignments referencing this worker, delete recurring patterns, then delete worker
      return this.prisma.$transaction(async (tx) => {
        await tx.assignment.deleteMany({ where: { workerId: id } });
        await tx.recurringPattern.deleteMany({ where: { workerId: id } });
        return tx.worker.delete({ where: { id } });
      });
    }

    return this.prisma.worker.delete({ where: { id } });
  }
}
