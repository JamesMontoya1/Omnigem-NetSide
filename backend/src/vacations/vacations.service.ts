import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VacationsService {
  constructor(private prisma: PrismaService) {}

  list(workerId?: number) {
    return this.prisma.vacation.findMany({
      where: workerId ? { workerId } : undefined,
      include: { worker: true },
      orderBy: { startDate: 'desc' },
    });
  }

  get(id: number) {
    return this.prisma.vacation.findUnique({
      where: { id },
      include: { worker: true },
    });
  }

  async create(data: {
    workerId: number;
    startDate: string;
    endDate: string;
    daysUsed: number;
    sold?: boolean;
    active?: boolean;
    note?: string;
  }) {
    const worker = await this.prisma.worker.findUnique({ where: { id: data.workerId } });
    if (!worker) throw new BadRequestException('Trabalhador não encontrado');

    return this.prisma.vacation.create({
      data: {
        workerId: data.workerId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        daysUsed: data.daysUsed,
        sold: data.sold ?? false,
        active: data.active ?? true,
        note: data.note,
      },
      include: { worker: true },
    });
  }

  async update(id: number, data: {
    startDate?: string;
    endDate?: string;
    daysUsed?: number;
    sold?: boolean;
    active?: boolean;
    note?: string;
  }) {
    return this.prisma.vacation.update({
      where: { id },
      data: {
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        daysUsed: data.daysUsed,
        sold: data.sold,
        active: data.active,
        note: data.note,
      },
      include: { worker: true },
    });
  }

  remove(id: number) {
    return this.prisma.vacation.delete({ where: { id } });
  }

  async summary() {
    const workers = await this.prisma.worker.findMany({
      where: { active: true },
      include: { vacations: true },
      orderBy: { name: 'asc' },
    });

    const today = new Date();

    return workers.map(w => {
      const hireDate = w.hireDate ? new Date(w.hireDate) : null;

      let yearsWorked = 0;
      if (hireDate) {
        const diff = today.getTime() - hireDate.getTime();
        yearsWorked = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
      }

      const totalEarned = yearsWorked * 30;

      const totalUsed = w.vacations
        .filter(v => v.active && new Date(v.startDate) <= today)
        .reduce((sum, v) => sum + v.daysUsed, 0);

      const pendingDays = totalEarned - totalUsed;

      const upcoming = w.vacations
        .filter(v => v.active && new Date(v.startDate) > today)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      return {
        id: w.id,
        name: w.name,
        color: w.color,
        hireDate: w.hireDate,
        terminationDate: w.terminationDate,
        yearsWorked,
        totalEarned,
        totalUsed,
        pendingDays,
        upcoming,
      };
    });
  }
}
