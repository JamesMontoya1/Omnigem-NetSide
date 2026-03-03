import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toUTCMidnight(value: Date | string): Date {
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00Z`);
  }
  return new Date(s);
}

/** Retorna o domingo (início) da semana UTC de uma data */
function weekStartUTC(d: Date): Date {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() - copy.getUTCDay());
  return copy;
}

/**
 * Calcula qual trabalhador está escalado para uma data,
 * dado um rodízio com startDate e workerIds ordenados.
 */
export function workerForDate(
  rotation: { startDate: Date | string; workerIds: number[] },
  date: Date,
): number | null {
  if (!rotation.workerIds.length) return null;
  const start = toUTCMidnight(rotation.startDate);
  const dateWeekStart = weekStartUTC(date);
  const startWeekStart = weekStartUTC(start);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSince = Math.round(
    (dateWeekStart.getTime() - startWeekStart.getTime()) / msPerWeek,
  );
  const n = rotation.workerIds.length;
  const idx = ((weeksSince % n) + n) % n;
  return rotation.workerIds[idx];
}

@Injectable()
export class RotationsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.rotation.findMany({ orderBy: { id: 'asc' } });
  }

  get(id: number) {
    return this.prisma.rotation.findUnique({ where: { id } });
  }

  create(data: {
    name?: string;
    weekdays: number[];
    workerIds: number[];
    startDate: string;
    notifyUpcoming?: boolean;
  }) {
    return this.prisma.rotation.create({
      data: {
        name: data.name ?? null,
        weekdays: data.weekdays,
        workerIds: data.workerIds,
        startDate: toUTCMidnight(data.startDate),
        notifyUpcoming: data.notifyUpcoming ?? false,
      },
    });
  }

  update(
    id: number,
    data: Partial<{
      name: string | null;
      weekdays: number[];
      workerIds: number[];
      startDate: string;
      notifyUpcoming: boolean;
    }>,
  ) {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.weekdays !== undefined) payload.weekdays = data.weekdays;
    if (data.workerIds !== undefined) payload.workerIds = data.workerIds;
    if (data.startDate !== undefined)
      payload.startDate = toUTCMidnight(data.startDate);
    if (data.notifyUpcoming !== undefined)
      payload.notifyUpcoming = data.notifyUpcoming;
    return this.prisma.rotation.update({ where: { id }, data: payload });
  }

  remove(id: number) {
    return this.prisma.rotation.delete({ where: { id } });
  }

  /**
   * Calcula o calendário de um intervalo de datas combinando rodízios + overrides manuais.
   * Retorna um mapa { "YYYY-MM-DD": { entries: [...], holiday? } }
   * Cada dia pode ter múltiplos trabalhadores.
   */
  async calendar(startDate: string, endDate: string) {
    const start = toUTCMidnight(startDate);
    const end = toUTCMidnight(endDate);

    const [rotations, assignments, workers, holidays] = await Promise.all([
      this.prisma.rotation.findMany(),
      this.prisma.assignment.findMany({
        where: { date: { gte: start, lte: end } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.worker.findMany(),
      this.prisma.holiday.findMany(),
    ]);

    const workerMap = new Map(workers.map((w) => [w.id, { name: w.name, color: w.color }]));

    const isHoliday = (d: Date) =>
      holidays.some((h) => {
        const hd = new Date(h.date);
        if (h.recurring)
          return (
            hd.getUTCDate() === d.getUTCDate() &&
            hd.getUTCMonth() === d.getUTCMonth()
          );
        return hd.toISOString().slice(0, 10) === d.toISOString().slice(0, 10);
      });

    type EntryItem = {
      workerId: number | null;
      workerName: string | null;
      workerColor: string | null;
      source: string;
      rotationId?: number;
      rotationName?: string;
      note?: string;
      notifyUpcoming?: boolean;
    };
    type DayData = {
      entries: EntryItem[];
      holiday?: { id: number; name: string | null; recurring: boolean };
    };

    const result: Record<string, DayData> = {};

    const ensureDay = (iso: string): DayData => {
      if (!result[iso]) result[iso] = { entries: [] };
      return result[iso];
    };

    // Pré-popula feriados no resultado
    for (
      let d = new Date(start);
      d <= end;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const iso = d.toISOString().slice(0, 10);
      const holiday = holidays.find((h) => {
        const hd = new Date(h.date);
        if (h.recurring)
          return (
            hd.getUTCDate() === d.getUTCDate() &&
            hd.getUTCMonth() === d.getUTCMonth()
          );
        return hd.toISOString().slice(0, 10) === iso;
      });
      if (holiday) {
        const day = ensureDay(iso);
        day.holiday = { id: holiday.id, name: holiday.name, recurring: holiday.recurring };
      }
    }

    // 1) preenche com rodízios
    for (
      let d = new Date(start);
      d <= end;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const iso = d.toISOString().slice(0, 10);
      const weekday = d.getUTCDay();

      if (isHoliday(new Date(d))) continue;

      let chosen: any = null;
      for (const rot of rotations) {
        if (!rot.weekdays.includes(weekday)) continue;
        const rotStart = new Date(rot.startDate);
        if (d < rotStart) continue;
        if (!chosen || rotStart > new Date(chosen.startDate)) {
          chosen = rot;
        }
      }

      if (chosen) {
        const wId = workerForDate(chosen, new Date(d));
        if (wId != null) {
          const wInfo = workerMap.get(wId);
          const day = ensureDay(iso);
          day.entries.push({
            workerId: wId,
            workerName: wInfo?.name ?? null,
            workerColor: wInfo?.color ?? null,
            source: 'ROTATION',
            rotationId: chosen.id,
            rotationName: chosen.name ?? undefined,
            notifyUpcoming: (chosen as any).notifyUpcoming ?? false,
          });
        }
      }
    }

    // 2) overrides manuais: substituem entradas de rodízio para o mesmo trabalhador
    //    ou adicionam novos trabalhadores ao dia
    const manualByDate = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const iso = new Date(a.date).toISOString().slice(0, 10);
      if (!manualByDate.has(iso)) manualByDate.set(iso, []);
      manualByDate.get(iso)!.push(a);
    }

    for (const [iso, dayAssignments] of manualByDate) {
      if (!dayAssignments.some((a) => a.source === 'MANUAL')) continue;
      const day = ensureDay(iso);
      // Remove entradas de rodízio — overrides manuais têm prioridade total
      day.entries = day.entries.filter((e) => e.source !== 'ROTATION');
      for (const a of dayAssignments) {
        if (a.source === 'MANUAL') {
          const wInfo = a.workerId ? workerMap.get(a.workerId) : undefined;
          day.entries.push({
            workerId: a.workerId,
            workerName: wInfo?.name ?? null,
            workerColor: wInfo?.color ?? null,
            source: 'MANUAL',
            note: a.note ?? undefined,
          });
        }
      }
    }

    return result;
  }
}
