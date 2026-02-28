import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
        startDate: data.startDate ? new Date(data.startDate as any) : null,
        endDate: data.endDate ? new Date(data.endDate as any) : null,
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
      if(typeof data.startDate !== 'undefined') payload.startDate = data.startDate ? new Date(data.startDate as any) : null;
      if(typeof data.endDate !== 'undefined') payload.endDate = data.endDate ? new Date(data.endDate as any) : null;
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
