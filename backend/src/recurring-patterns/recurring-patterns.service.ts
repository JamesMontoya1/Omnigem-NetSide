import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toPrismaDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00`);
  }
  return new Date(s as any);
}

@Injectable()
export class RecurringPatternsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.recurringPattern.findMany({ orderBy: { id: 'asc' } });
  }

  get(id: number) {
    return this.prisma.recurringPattern.findUnique({ where: { id } });
  }

  create(data: {
    workerId: number;
    weekdays: number[];
    weekInterval?: number;
    weekOffset?: number;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    note?: string | null;
  }) {
    try{
      const payload: any = {
        workerId: data.workerId,
        weekdays: data.weekdays || [],
        weekInterval: data.weekInterval ?? 1,
        weekOffset: data.weekOffset ?? 0,
        startDate: toPrismaDate(data.startDate),
        endDate: toPrismaDate(data.endDate),
        note: data.note ?? null,
      };
      return this.prisma.recurringPattern.create({ data: payload });
    }catch(err){
      console.error('RecurringPatternsService.create error', { input: data, err });
      throw err;
    }
  }

  update(id: number, data: Partial<{ workerId: number; weekdays: number[]; weekInterval?: number; weekOffset?: number; startDate?: Date | string | null; endDate?: Date | string | null; note?: string | null }>) {
    try{
      const payload: any = {};
      if(typeof data.workerId !== 'undefined') payload.workerId = data.workerId;
      if(typeof data.weekdays !== 'undefined') payload.weekdays = data.weekdays;
      if(typeof data.weekInterval !== 'undefined') payload.weekInterval = data.weekInterval;
      if(typeof data.weekOffset !== 'undefined') payload.weekOffset = data.weekOffset;
      if(typeof data.startDate !== 'undefined') payload.startDate = toPrismaDate(data.startDate);
      if(typeof data.endDate !== 'undefined') payload.endDate = toPrismaDate(data.endDate);
      if(typeof data.note !== 'undefined') payload.note = data.note;
      return this.prisma.recurringPattern.update({ where: { id }, data: payload });
    }catch(err){
      console.error('RecurringPatternsService.update error', { id, input: data, err });
      throw err;
    }
  }

  remove(id: number) {
    return this.prisma.recurringPattern.delete({ where: { id } });
  }
}
